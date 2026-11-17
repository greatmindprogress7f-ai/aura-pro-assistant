
const fs = require('fs');
const m = require('module');
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/all_builtins.json', JSON.stringify(m.builtinModules, null, 2));
