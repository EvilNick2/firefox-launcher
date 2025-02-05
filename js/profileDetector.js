const fs = require('fs');
const path = require('path');

function detectProfiles(profilesPath) {
	const profiles = [];
	const invalidProfiles = ["default-release", "ini"];
	const pattern = /^[a-zA-Z0-9]{8}\.(.+)$/;

	fs.readdirSync(profilesPath).forEach(dirName => {
		const match = pattern.exec(dirName);
		if (match) {
			const profileName = match[1];
			if (!invalidProfiles.includes(profileName)) {
				profiles.push(profileName);
			}
		}
	});

	return profiles;
}

module.exports = { detectProfiles };