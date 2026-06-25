const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');
const { registerUserHandlers } = require('./ipc/userHandlers');
const { registerProgressHandlers } = require('./ipc/progressHandlers');
const { registerContentHandlers } = require('./ipc/contentHandlers');
const { registerCodeHandlers } = require('./ipc/codeHandlers');
const { detectPython } = require('./pythonRunner');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'PyPath',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.setName('PyPath');

app.whenReady().then(async () => {
  registerUserHandlers(ipcMain);
  registerProgressHandlers(ipcMain);
  registerContentHandlers(ipcMain);
  registerCodeHandlers(ipcMain);

  const pythonAvailable = await detectPython();
  console.log('Python detection:', pythonAvailable ? 'available' : 'not found');

  createWindow();

  // Disable pinch zoom to avoid conflict with custom Ctrl+scroll zoom
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
