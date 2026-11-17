
import * as electron from 'electron';
import fs from 'fs';
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/desktop/test_esm.json', JSON.stringify({
  keys: Object.keys(electron)
}, null, 2));
electron.app.quit();
