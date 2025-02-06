const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function encrypt(input) {
	const salt = CryptoJS.enc.Utf8.parse("B&x3P4EC2&UD5Wlb");
	const key128Bits = CryptoJS.PBKDF2(input, salt, {
		keySize: 256 / 32,
		iterations: 1024,
		hasher: CryptoJS.algo.SHA256
	});
	const keyBase64 = CryptoJS.enc.Base64.stringify(key128Bits);
	
	return keyBase64;
}

function password(pwd, event, done) {
	const encryptedPassword = encrypt(pwd);
	const userDataPath = app.getPath('userData');
	const filePath = path.join(userDataPath, 'password.FLE');
	
	try {
		if (fs.existsSync(filePath)) {
			const storedPassword = fs.readFileSync(filePath, 'utf-8');
			if (storedPassword === encryptedPassword) {
				console.log('Password matches the stored password.');
				done(true);
			} else {
				console.log('Password does not match the stored password.');
				done(false);
			}
		} else {
			fs.writeFileSync(filePath, encryptedPassword, 'utf-8');
			console.log(`Password saved to ${filePath}`);
			done(true);
		}
	} catch (error) {
		console.error(`Failed to save password: ${error.message}`);
		done(false);
	}
}

module.exports = { encrypt, password };