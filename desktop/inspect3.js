
const { app, BrowserWindow } = require('electron/main');
const fs = require('fs');
fs.writeFileSync('c:/Users/user/Desktop/AURA AI/desktop/test_main_result.json', JSON.stringify({
  appType: typeof app,
  winType: typeof BrowserWindow
}, null, 2));
app.quit();
