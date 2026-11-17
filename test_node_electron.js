
const fs = require('fs');
let res = {};
try {
  const e = require('node:electron');
  res = { ok: true, keys: Object.keys(e) };
} catch(err) {
  res = { err: err.message };
}
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/node_electron_test.json', JSON.stringify(res, null, 2));
