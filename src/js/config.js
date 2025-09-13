async function getSelectedDeveloperProfiles() {
  const container = document.getElementById('developerProfilesList');
  if (!container) return [];
  const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
  return checked.map(cb => cb.value);
}

function getAllListedProfiles() {
  const containers = [
    document.getElementById('developerProfilesList'),
    document.getElementById('hiddenProfilesList')
  ].filter(Boolean);
  const values = [];
  containers.forEach(container => {
    const inputs = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    inputs.forEach(cb => values.push(cb.value));
  });
  return values;
}

function parseDeveloperProfiles(cfg) {
  const raw = cfg.developerProfiles;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => String(s));
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function parseHiddenProfiles(cfg) {
  const raw = cfg.hiddenProfiles;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => String(s));
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

async function populateProfilesList(cfg) {
  const listDiv = document.getElementById('developerProfilesList');
  const hiddenListDiv = document.getElementById('hiddenProfilesList');
  if (!listDiv) return;
  listDiv.innerHTML = 'Loading...';
  if (hiddenListDiv) hiddenListDiv.innerHTML = 'Loading...';
  const pathInput = document.getElementById('profilesPath');
  const pathOverride = pathInput && pathInput.value ? pathInput.value : undefined;
  let profiles = [];
  try {
    profiles = await window.electron.listProfiles(pathOverride);
  } catch (_) {}
  const selected = new Set(parseDeveloperProfiles(cfg).map(s => s.toLowerCase()));
  const hiddenSelected = new Set(parseHiddenProfiles(cfg).map(s => s.toLowerCase()));
  if (!profiles || profiles.length === 0) {
    listDiv.innerHTML = '<small>No profiles found. Check Profiles Path and click Refresh.</small>';
    if (hiddenListDiv) hiddenListDiv.innerHTML = '<small>No profiles found. Check Profiles Path and click Refresh.</small>';
    return;
  }
  const frag = document.createDocumentFragment();
  profiles.forEach(name => {
    const id = `devprof_${name}`;
    const wrapper = document.createElement('label');
    wrapper.style.display = 'block';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.value = name;
    cb.checked = selected.has(String(name).toLowerCase());
    const span = document.createElement('span');
    span.textContent = ` ${name}`;
    wrapper.appendChild(cb);
    wrapper.appendChild(span);
    frag.appendChild(wrapper);
  });
  listDiv.innerHTML = '';
  listDiv.appendChild(frag);
  if (hiddenListDiv) {
    const frag2 = document.createDocumentFragment();
    profiles.forEach(name => {
      const id = `hidden_${name}`;
      const wrapper = document.createElement('label');
      wrapper.style.display = 'block';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.value = name;
      cb.checked = hiddenSelected.has(String(name).toLowerCase());
      const span = document.createElement('span');
      span.textContent = ` ${name}`;
      wrapper.appendChild(cb);
      wrapper.appendChild(span);
      frag2.appendChild(wrapper);
    });
    hiddenListDiv.innerHTML = '';
    hiddenListDiv.appendChild(frag2);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await window.electron.getConfig();
  Object.entries(cfg).forEach(([key, value]) => {
    const input = document.getElementById(key);
    if (input) {
      input.value = typeof value === 'string' ? value.replace(/\\\\/g, '\\') : value;
    }
  });
  await populateProfilesList(cfg);
  const refreshBtn = document.getElementById('refreshProfiles');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const latestCfg = await window.electron.getConfig();
      await populateProfilesList(latestCfg);
    });
  }
  const pathInput = document.getElementById('profilesPath');
  if (pathInput) {
    pathInput.addEventListener('change', async () => {
      const latestCfg = await window.electron.getConfig();
      await populateProfilesList(latestCfg);
    });
  }
});

document.getElementById('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const keys = [
    'firefoxEdition',
    'driveLetter',
    'vhdxPath',
    'volumeLabel',
    'profilesIniPath',
    'tempIniPath',
    'profilesPath',
    'profileName',
    'localFirefoxDir',
    'roamingFirefoxDir',
    'localSymlinkSource',
    'roamingSymlinkSource'
  ];
  const newConfig = {};
  keys.forEach(k => {
    const val = document.getElementById(k).value;
    newConfig[k] = typeof val === 'string' ? val.replace(/\\\\/g, '\\') : val;
  });
  const selectedNow = await getSelectedDeveloperProfiles();
  const listedNow = getAllListedProfiles();
  const listedLower = new Set(listedNow.map(s => String(s).toLowerCase()));
  const prevCfg = await window.electron.getConfig();
  const prevSelected = parseDeveloperProfiles(prevCfg);
  const preserved = prevSelected.filter(name => !listedLower.has(String(name).toLowerCase()));
  newConfig.developerProfiles = Array.from(new Set([...selectedNow, ...preserved]));
  const hiddenSelectedNow = Array.from(document.querySelectorAll('#hiddenProfilesList input[type="checkbox"]:checked')).map(cb => cb.value);
  const prevHidden = parseHiddenProfiles(prevCfg);
  const preservedHidden = prevHidden.filter(name => !listedLower.has(String(name).toLowerCase()));
  newConfig.hiddenProfiles = Array.from(new Set([...hiddenSelectedNow, ...preservedHidden]));
  await window.electron.saveConfig(newConfig);
  window.close();
});
