const { app, BrowserWindow, ipcMain, Menu, MenuItem, shell } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const { detectProfiles } = require(path.join(__dirname, 'src', 'utils', 'profileDetector'));
const password = require(path.join(__dirname, 'src', 'utils', 'password'));

let mainWindow;
let isAuthenticated = false;

if (process.env.NODE_ENV === 'development') {
	require('electron-reload')(__dirname);
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

		const deletePasswordItem = new MenuItem({
			label: 'Delete Password',
			click: () => {
				if (isAuthenticated) {
					password.delete();
					mainWindow.webContents.send('password-deleted');
				}
			}
		})

    const exitMenuItemIndex = fileMenu.submenu.items.findIndex(item => item.label === 'Exit');
		fileMenu.submenu.insert(exitMenuItemIndex, deletePasswordItem);
    fileMenu.submenu.insert(exitMenuItemIndex, refreshProfilesItem);
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

const profilesPath = path.join(process.env.APPDATA, 'Mozilla', 'Firefox', 'Profiles');

ipcMain.on('get-profiles', (event) =>{
	const profiles = detectProfiles(profilesPath);
	event.reply('send-profiles', profiles)
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