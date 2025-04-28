function loadProfiles() {
	window.electron.getProfiles();
	window.electron.onProfilesReceived((profiles) => {
		const profilesContainer = document.getElementById('profiles-container');
		profilesContainer.classList.remove('hidden');
		profilesContainer.innerHTML = '';
		const profileCards = [];

		profiles.forEach(profile => {
			const profileCard = document.createElement('div');
			profileCard.className = 'card';

			const profileImage = document.createElement('img');
			profileImage.src = 'imgs/firefox.png';
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
	});
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