document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await window.electron.getConfig();
  Object.entries(cfg).forEach(([key, value]) => {
    const input = document.getElementById(key);
    if (input) {
      input.value = typeof value === 'string' ? value.replace(/\\\\/g, '\\') : value;
    }
  });
});

document.getElementById('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const keys = [
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
  await window.electron.saveConfig(newConfig);
  window.close();
});
