
const fs = require('fs');
let codeStr = '';
try {
  // Let's inspect Module._load
  const m = require('module');
  codeStr = m._load.toString();
} catch(e) {
  codeStr = e.stack;
}
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/load_fn.txt', codeStr);
