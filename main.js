const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('save-csv', async (event, csvString) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Map as CSV',
    defaultPath: 'map.csv',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (canceled || !filePath) return { success: false };

  try {
    fs.writeFileSync(filePath, csvString);
    return { success: true, filePath };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});
