const { app, BrowserWindow } = require('electron');
require('electron-reload')(__dirname);
const CryptoJS = require('crypto-js');

function createWindow() {
	const win = new BrowserWindow({
		width: 800,
		height:600,
		icon: 'imgs/icon.png'
	});
	win.loadFile('index.html');
}

app.whenReady().then(() =>{
	createWindow();
	app.on('activate', () =>{
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});