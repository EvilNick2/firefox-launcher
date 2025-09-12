const { app, BrowserWindow, ipcMain, Menu, MenuItem, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');
const { rejects } = require('assert');

const defaultConfigPath = path.join(__dirname, 'config.json');
const userConfigPath = path.join(app.getPath('userData'), 'config.json');
function readInitialConfig() {
	try {
		if (fs.existsSync(userConfigPath)) {
			return JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
		}
		const defaults = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
		try {
			fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });
			fs.writeFileSync(userConfigPath, JSON.stringify(defaults, null, 2));
		} catch (_) {  }
		return defaults;
	} catch (e) {
		console.error('Failed to load configuration:', e);
		return {};
	}
}
let rawConfig = readInitialConfig();
const { detectProfiles } = require(path.join(__dirname, 'src', 'utils', 'profileDetector'));
const password = require(path.join(__dirname, 'src', 'utils', 'password'));

function resolveEnv(str) {
	return String(str).replace(/%([^%]+)%/g, (_, name) => process.env[name] || '');
}
const config = {};
function loadConfigObject(obj) {
	for (const key of Object.keys(config)) delete config[key];
	for (const [key, value] of Object.entries(obj)) {
		config[key] = typeof value === 'string' ? resolveEnv(value) : value;
	}
}
loadConfigObject(rawConfig);

let mainWindow;
let isAuthenticated = false;

function serializeArg(a) {
    if (a instanceof Error) return a.stack || a.message || String(a);
    if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (_) { return String(a); }
    }
    return String(a);
}
function logToRenderer(level, ...args) {
    try {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('log', { level, args: args.map(serializeArg) });
        }
    } catch (_) {}
}
function logInfo(...args) { console.log(...args); logToRenderer('log', ...args); }
function logWarn(...args) { console.warn(...args); logToRenderer('warn', ...args); }
function logError(...args) { console.error(...args); logToRenderer('error', ...args); }

process.on('uncaughtException', (err) => logError('Uncaught exception:', err));
process.on('unhandledRejection', (reason) => logError('Unhandled rejection:', reason));

function runDiskpart(script) {
	return new Promise((resolve, reject) => {
		const tmp = path.join(os.tmpdir(), `dp-${Date.now()}.txt`);
		fs.writeFileSync(tmp, script);
		const child = spawn('diskpart', ['/s', tmp]);
		let stdout = '', stderr = '';
		child.stdout.on('data', d => stdout += d);
		child.stderr.on('data', d => stderr += d);
		child.on('exit', code => {
			fs.unlinkSync(tmp);
			code === 0 ? resolve(stdout) : reject(new Error(stderr || stdout));
		});
	});
}

async function listVolumes() {
	const out = await runDiskpart('list volume\n');
	const volumes = [];
	out.split(/\r?\n/).forEach(line => {
		const m = line.match(/^\s*Volume\s+(\d+)\s+[A-Z]?\s+(\S+)/);
		if (m) volumes.push({ num: m[1], label: m[2] });
	});
	return volumes;
}

function createSymlinks(profilePath) {
	const localSourceBase = config.localSymlinkSource || (config.driveLetter ? path.join(config.driveLetter + ':', 'Mozilla', 'LocalAppData'): '');
	const appSourceBase = config.roamingSymlinkSource || (config.driveLetter ? path.join(config.driveLetter + ':', 'Mozilla', 'AppData'): '');
	const localSource = path.join(localSourceBase, profilePath);
	const appSource = path.join(appSourceBase, profilePath);
	const localDestRoot = config.localFirefoxDir || path.join(process.env.LOCALAPPDATA, 'Mozilla', 'Firefox');
	const appDestRoot = config.roamingFirefoxDir || path.join(process.env.APPDATA, 'Mozilla', 'Firefox');
	if (!fs.existsSync(localSource) || !fs.existsSync(appSource)) {
		throw new Error('Symlink source not found; ensure VHDX is mounted');
	}
	fs.mkdirSync(path.dirname(path.join(localDestRoot, profilePath)), { recursive: true });
	fs.mkdirSync(path.dirname(path.join(appDestRoot, profilePath)), { recursive: true });
	fs.symlinkSync(localSource, path.join(localDestRoot, profilePath));
	fs.symlinkSync(appSource, path.join(appDestRoot, profilePath));
}

function removeSymlinks(base) {
	if (!base || !path.isAbsolute(base) || !fs.existsSync(base)) return;
	for (const entry of fs.readdirSync(base)) {
		const full = path.join(base, entry);
		const stat = fs.lstatSync(full);
		if (stat.isSymbolicLink()) {
			fs.unlinkSync(full);
		} else if (stat.isDirectory()) {
			removeSymlinks(full);
		}
	}
}

async function mountVhdx() {
	const { vhdxPath, volumeLabel, driveLetter, profilesIniPath, tempIniPath } = config;
	const before = await listVolumes();
	try {
		await runDiskpart(`select vdisk file="${vhdxPath}"
attach vdisk
`);
	} catch (e) {
		const msg = String((e && e.message) || e || '').toLowerCase();
		if (!msg.includes('already attached')) throw e;
	}
	const after = await listVolumes();
	let vol = after.find(v => !before.some(b => b.num === v.num) && v.label === volumeLabel);
	if (!vol) {
		vol = after.find(v => v.label === volumeLabel);
	}
	if (!vol) throw new Error('Volume not found');
	try {
		await runDiskpart(`select volume ${vol.num}
assign letter=${driveLetter}
`);
	} catch (e) {
		const msg = String((e && e.message) || e || '').toLowerCase();
		if (!(msg.includes('assigned') || msg.includes('in use'))) throw e;
	}
	const tempData = fs.readFileSync(tempIniPath, 'utf8');
	const match = tempData.match(/path\s*=\s*(.*)/i);
	if (match) createSymlinks(match[1].trim());
	fs.appendFileSync(profilesIniPath, `\n\n${tempData}`);
	fs.unlinkSync(tempIniPath);
	mainWindow.webContents.send('refresh-profiles');
}


async function unmountVhdx() {
	const { driveLetter, vhdxPath, profilesIniPath, profileName, tempIniPath } = config;
	if (!profilesIniPath) throw new Error('profilesIniPath is not set in configuration');
  if (!fs.existsSync(profilesIniPath)) throw new Error(`profiles.ini not found at: ${profilesIniPath}`);
  if (!tempIniPath) throw new Error('tempIniPath is not set in configuration');

  const text = fs.readFileSync(profilesIniPath, 'utf8');
  const lines = text.split(/\r?\n/);

  const sectionStartIdxs = [];
  for (let i = 0; i < lines.length; i++) {
		if (/^\s*\[.+\]\s*$/.test(lines[i])) sectionStartIdxs.push(i);
  }
  sectionStartIdxs.push(lines.length);

  let removed = false;
  let savedSection = [];
  const outLines = [];
  const nameRe = new RegExp('^\\s*Name\\s*=\\s*' + profileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');

  for (let s = 0; s < sectionStartIdxs.length - 1; s++) {
		const start = sectionStartIdxs[s];
		const end = sectionStartIdxs[s + 1];
		const section = lines.slice(start, end);
		const isTarget = section.some(l => nameRe.test(l));
		if (!removed && isTarget) {
			savedSection = section;
			removed = true;
		} else {
			outLines.push(...section);
		}
  }

  if (!removed) {
		throw new Error(`Profile with Name=${profileName} not found in profiles.ini`);
  }

  fs.mkdirSync(path.dirname(tempIniPath), { recursive: true });
  fs.writeFileSync(tempIniPath, savedSection.join('\n').replace(/\n*$/, '\n'));
  fs.writeFileSync(profilesIniPath, outLines.join('\n').replace(/\n*$/, '\n'));
	const localDestRoot = config.localFirefoxDir || path.join(process.env.LOCALAPPDATA, 'Mozilla', 'Firefox');
	const appDestRoot = config.roamingFirefoxDir || path.join(process.env.APPDATA, 'Mozilla', 'Firefox');
	removeSymlinks(path.join(localDestRoot, 'Profiles'));
	removeSymlinks(path.join(appDestRoot, 'Profiles'));
	await runDiskpart(`select volume ${driveLetter}
remove letter=${driveLetter}
select vdisk file="${vhdxPath}"
detach vdisk
`);
	mainWindow.webContents.send('refresh-profiles');
}

function openConfigWindow() {
    const configWindow = new BrowserWindow({
        width: 400,
        height: 500,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'src', 'preload.js')
        }
    });
    configWindow.loadFile(path.join(__dirname, 'src', 'config.html'));
    configWindow.once('ready-to-show', () => {
        configWindow.maximize();
    });
}

if (!app.isPackaged) {
	try { require('electron-reload')(__dirname); }
	catch (e) {}
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height:600,
		icon: 'imgs/icon.ico',
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, 'src', 'preload.js')
		}
	});
	mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() =>{
	createWindow();
	app.on('activate', () =>{
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});

  const menu = Menu.getApplicationMenu();

  const fileMenu = menu.items.find(item => item.label === 'File');
  if (fileMenu) {
    const refreshProfilesItem = new MenuItem({
      label: 'Refresh Profiles',
      click: () => {
				if (isAuthenticated) {
        mainWindow.webContents.send('refresh-profiles');
				}
      }
    });

		const mountProfileItem = new MenuItem({
			label: 'Mount Profile',
			click: () => {
				if (isAuthenticated) {
					mountVhdx().catch(err => logError(err));
				}
			}
		});

		const unmountProfileItem = new MenuItem({
			label: 'Unmount Profile',
			click: () => {
				if (isAuthenticated) {
					unmountVhdx().catch(err => logError(err));
				}
			}
		});

		const deletePasswordItem = new MenuItem({
			label: 'Delete Password',
			click: () => {
				if (isAuthenticated) {
					password.delete();
					mainWindow.webContents.send('password-deleted');
				}
			}
		});

		const settingsItem = new MenuItem({
			label: 'Settings',
			click: () => {
				if (isAuthenticated) {
					openConfigWindow();
				}
			}
		})

    const exitMenuItemIndex = fileMenu.submenu.items.findIndex(item => item.label === 'Exit');
		fileMenu.submenu.insert(exitMenuItemIndex, deletePasswordItem);
		fileMenu.submenu.insert(exitMenuItemIndex, unmountProfileItem);
		fileMenu.submenu.insert(exitMenuItemIndex, mountProfileItem);
    fileMenu.submenu.insert(exitMenuItemIndex, refreshProfilesItem);
    fileMenu.submenu.insert(exitMenuItemIndex, settingsItem);
  }

	const helpMenuIndex = menu.items.findIndex(item => item.label === 'Help');
	if (helpMenuIndex !== -1) {
		menu.items[helpMenuIndex].submenu.clear();
		menu.items[helpMenuIndex].submenu.append(new MenuItem({
			label: 'Documentation',
			click: () => {
				shell.openExternal('https://github.com/EvilNick2/firefox-launcher');
			}
		}));
		menu.items[helpMenuIndex].submenu.append(new MenuItem({
			label: 'Issues',
			click: () => {
				shell.openExternal('https://github.com/EvilNick2/firefox-launcher/issues');
			}
		}));
		menu.items[helpMenuIndex].submenu.append(new MenuItem({
			label: 'Author',
			click: () => {
				shell.openExternal('https://github.com/EvilNick2');
			}
		}));
	}

  Menu.setApplicationMenu(menu);
});

ipcMain.on('get-profiles', (event) =>{
	const profilesPath = config.profilePath || path.join(process.env.APPDATA, 'Mozilla', 'Firefox', 'Profiles');
	const profiles = detectProfiles(profilesPath);
	event.reply('send-profiles', profiles);
});

ipcMain.handle('mount-vhdx', () => {
	if (isAuthenticated) {
		return mountVhdx();
	}
});

ipcMain.handle('unmount-vhdx', () => {
	if (isAuthenticated) {
		return unmountVhdx();
	}
});

ipcMain.handle('get-config', () => {
	return rawConfig;
});

ipcMain.handle('save-config', (event, newConfig) => {
	fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });
	fs.writeFileSync(userConfigPath, JSON.stringify(newConfig, null, 2));
	rawConfig = newConfig;
	loadConfigObject(rawConfig);
});

ipcMain.on('set-window-size', (event, { width, height }) => {
	mainWindow.setSize(width, height);
});

ipcMain.on('launch-profile', (event, uuid) => {
	const appPath = 'C:/Program Files/Mozilla Firefox/firefox.exe';
	execFile(appPath, ['-new-instance', '-P', uuid], (error, stdout, stderr) => {
		if (error) {
			console.error(`Error launching profile: ${error.message}`);
			return;
		}
	});
});

ipcMain.on('password', (event, pwd) => {
	password.password(pwd, event, (matched) => {
		if (matched) {
			isAuthenticated = true;
			event.reply('password-accepted');
		} else {
			event.reply('password-denied');
		}
	});
});
