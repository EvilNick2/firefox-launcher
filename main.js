const { app, BrowserWindow } = require('electron');
const CryptoJS = require('crypto-js');

if (process.env.NODE_ENV === 'development') {
	require('electron-reload')(__dirname);
}

function createWindow() {
	const win = new BrowserWindow({
		width: 800,
		height:600,
		icon: 'imgs/icon.ico'
	});
	win.loadFile('index.html');
}

app.whenReady().then(() =>{
	createWindow();
	app.on('activate', () =>{
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});