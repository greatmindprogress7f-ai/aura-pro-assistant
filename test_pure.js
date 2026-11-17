const fs = require('fs');
const electron = require('electron');

fs.writeFileSync(
  'c:/Users/user/Desktop/AURA AI/test_pure_result.json',
  JSON.stringify({
    type: typeof electron,
    keys: Object.keys(electron)
  }, null, 2)
);

if (electron.app) {
  electron.app.quit();
}
