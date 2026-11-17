const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  console.log('Testing Electron Desktop Overlay setup...');
  const win = new BrowserWindow({
    width: 220,
    height: 220,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const appPath = path.join(__dirname, '..', 'index.html');
  await win.loadURL(`file://${appPath}?host=desktop`);

  const hasDesktop = await win.webContents.executeJavaScript('Boolean(window.AuraDesktop && window.AuraDesktop.isDesktop)');
  const hostAttr = await win.webContents.executeJavaScript('document.documentElement.getAttribute("data-host")');

  console.log('window.AuraDesktop exposed:', hasDesktop);
  console.log('data-host attribute:', hostAttr);

  if (hasDesktop && hostAttr === 'desktop') {
    console.log('ELECTRON DESKTOP OVERLAY SMOKETEST PASSED 100%!');
    app.quit();
    process.exit(0);
  } else {
    console.error('Smoketest verification failed!');
    app.quit();
    process.exit(1);
  }
});
