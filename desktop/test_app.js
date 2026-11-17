const fs = require('fs');
const path = require('path');

let electronExports = null;
try {
  // If we delete node_modules/electron from require.cache and bypass, what happens?
  const Module = require('module');
  // Check Module._builtinLibs or internal
  electronExports = Object.keys(Module);
} catch (e) {
  electronExports = e.message;
}

fs.writeFileSync(
  path.join(__dirname, 'electron_test_result.json'),
  JSON.stringify({
    processType: process.type,
    electronVersion: process.versions.electron,
    moduleProps: electronExports
  }, null, 2)
);

process.exit(0);
