import os, subprocess

app_dir = r'c:\Users\user\Desktop\AURA AI\app'
os.makedirs(app_dir, exist_ok=True)

with open(os.path.join(app_dir, 'package.json'), 'w') as f:
    f.write('{"name": "aura-app", "main": "main.js"}')

with open(os.path.join(app_dir, 'main.js'), 'w') as f:
    f.write('''const fs = require('fs');
const electron = require('electron');
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/app_test_result.json', JSON.stringify({
  type: typeof electron,
  isObject: typeof electron === 'object',
  hasApp: Boolean(electron && electron.app),
  keys: Object.keys(electron)
}, null, 2));
if (electron.app) electron.app.quit();
''')

p = subprocess.run([
    r'c:\Users\user\Desktop\AURA AI\desktop\node_modules\electron\dist\electron.exe',
    app_dir
], capture_output=True, text=True)

print('RET:', p.returncode)
print('STDERR:', p.stderr)
