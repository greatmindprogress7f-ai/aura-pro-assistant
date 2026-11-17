
const fs = require('fs');
let keys = [];
try {
  const electron = process._linkedBinding('electron_browser_app');
  keys = Object.keys(electron);
} catch(e) {
  keys = [e.message];
}
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/desktop/inspect2.json', JSON.stringify({
  keys: keys
}, null, 2));
process.exit(0);
