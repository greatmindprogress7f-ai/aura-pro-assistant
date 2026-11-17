
const fs = require('fs');
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/desktop/inspect.json', JSON.stringify({
  versions: process.versions,
  type: process.type,
  keys: Object.keys(process)
}, null, 2));
process.exit(0);
