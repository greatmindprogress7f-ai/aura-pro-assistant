
const fs = require('fs');
let out = '';
try {
  const b = require('node:electron/js2c/browser_init');
  out = Object.keys(b);
} catch(e) {
  out = e.stack;
}
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/desktop/inspect4.txt', String(out));
process.exit(0);
