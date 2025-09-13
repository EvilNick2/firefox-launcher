const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('log', (_event, payload) => {
  try {
    const level = payload && payload.level;
    const args = (payload && payload.args) || [];
    if (level && typeof console[level] === 'function') {
      console[level](...args);
    } else {
      console.log(...args);
    }
  } catch (e) {}
});

contextBridge.exposeInMainWorld('electron', {
	getProfiles: () => ipcRenderer.send('get-profiles'),
	onProfilesReceived: (callback) => ipcRenderer.on('send-profiles', (event, profiles) => callback(profiles)),
	onProfilesReceivedOnce: (callback) => ipcRenderer.once('send-profiles', (event, profiles) => callback(profiles)),
	offProfilesReceived: () => ipcRenderer.removeAllListeners('send-profiles'),
	setWindowSize: (width, height) => ipcRenderer.send('set-window-size', { width, height }),
	launchProfile: (uuid) => ipcRenderer.send('launch-profile', uuid),
	refreshProfiles: (callback) => ipcRenderer.on('refresh-profiles', callback),
	password: (password) => ipcRenderer.send('password', password),
	onPasswordAccepted: (callback) => ipcRenderer.on('password-accepted', callback),
  onPasswordDenied: (callback) => ipcRenderer.on('password-denied', callback),
	getConfig: () => ipcRenderer.invoke('get-config'),
	saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
	listProfiles: (profilesPath) => ipcRenderer.invoke('list-profiles', profilesPath)
});
