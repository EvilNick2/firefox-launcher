function loadProfiles() {
	if (window.electron.offProfilesReceived) window.electron.offProfilesReceived();
	window.electron.getProfiles();
	const onProfiles = async (profiles) => {
	const profilesContainer = document.getElementById('profiles-container');
	profilesContainer.classList.remove('hidden');
	profilesContainer.innerHTML = '';
	const profileCards = [];

	let devSet = new Set();
	try {
		const cfg = await window.electron.getConfig();
		const raw = cfg && cfg.developerProfiles;
		let list = [];
		if (Array.isArray(raw)) list = raw;
		else if (typeof raw === 'string') list = raw.split(',');
		devSet = new Set(list.map(s => String(s).trim().toLowerCase()).filter(Boolean));
	} catch (_) {}

	profiles.forEach(profile => {
		const profileCard = document.createElement('div');
		profileCard.className = 'card';

		const profileImage = document.createElement('img');
		const isDev = devSet.has(String(profile).toLowerCase());
		profileImage.src = isDev ? 'imgs/dev.png' : 'imgs/firefox.png';
		profileImage.alt = 'Firefox Icon';
		profileImage.className = 'profile-icon';

		const profileText = document.createElement('span');
		profileText.textContent = profile;

		profileCard.appendChild(profileImage);
		profileCard.appendChild(profileText);
		profilesContainer.appendChild(profileCard);
		profileCards.push(profileCard);

		profileCard.addEventListener('click', () => {
			profileCard.classList.add('clicked');
			setTimeout(() => {
				profileCard.classList.remove('clicked');
			}, 300);
			window.electron.launchProfile(profile);
		});
	});

	let maxWidth = 0;
	let maxHeight = 0;
	profileCards.forEach(card => {
		const cardWidth = card.offsetWidth;
		maxHeight = maxHeight + card.offsetHeight;
		if (cardWidth > maxWidth) {
			maxWidth = cardWidth;
		}
	});

	profileCards.forEach(card => {
		card.style.width = `${maxWidth}px`;
	});

	const contentHeight = maxHeight + profileCards.length*20 + 20;
	const adjustedWidth = maxWidth+55;

			window.electron.setWindowSize(adjustedWidth, contentHeight);
	};
	if (window.electron.onProfilesReceivedOnce) {
			window.electron.onProfilesReceivedOnce(onProfiles);
	} else {
			window.electron.onProfilesReceived(onProfiles);
	}
}

document.getElementById('password-button').addEventListener('click', () => {
	const password = document.getElementById('password-input').value;
	document.getElementById('error-message').classList.add('hidden');
	window.electron.password(password);
});

document.getElementById('password-input').addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		document.getElementById('password-button').click();
	}
});

window.electron.onPasswordAccepted(() => {
	document.querySelector('.password-verify').classList.add('hidden');
	loadProfiles();
});

window.electron.onPasswordDenied(() => {
	document.getElementById('error-message').classList.remove('hidden');
	document.getElementById('password-button').style.borderRadius = '0 0 0 0';
});

window.electron.refreshProfiles(() => {
	loadProfiles();
});
