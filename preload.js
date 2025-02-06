const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
	getProfiles: () => ipcRenderer.send('get-profiles'),
	onProfilesReceived: (callback) => ipcRenderer.on('send-profiles', (event, profiles) => callback(profiles)),
	setWindowSize: (width, height) => ipcRenderer.send('set-window-size', { width, height }),
	launchProfile: (uuid) => ipcRenderer.send('launch-profile', uuid),
	refreshProfiles: (callback) => ipcRenderer.on('refresh-profiles', callback),
	savePassword: (password) => ipcRenderer.send('save-password', password)
});