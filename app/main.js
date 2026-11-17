const fs = require('fs');
const electron = require('electron');
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/app_test_result.json', JSON.stringify({
  type: typeof electron,
  isObject: typeof electron === 'object',
  hasApp: Boolean(electron && electron.app),
  keys: Object.keys(electron)
}, null, 2));
if (electron.app) electron.app.quit();
