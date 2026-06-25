const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

function registerContentHandlers(ipcMain) {
  ipcMain.handle('content:getIndex', async () => {
    try {
      const indexPath = path.join(__dirname, '..', '..', 'content', 'python', 'index.json');
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('content:getLesson', async (_event, topicId) => {
    try {
      const parts = topicId.split('.');
      const tier = parts[1];
      const slug = parts[2];
      const filePath = path.join(__dirname, '..', '..', 'content', 'python', tier, `${slug}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('content:getQuiz', async (_event, topicId) => {
    try {
      const parts = topicId.split('.');
      const tier = parts[1];
      const slug = parts[2];
      const filePath = path.join(__dirname, '..', '..', 'content', 'python', tier, `${slug}-quiz.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('content:getChallenge', async (_event, topicId) => {
    try {
      const parts = topicId.split('.');
      const tier = parts[1];
      const slug = parts[2];
      const filePath = path.join(__dirname, '..', '..', 'content', 'python', tier, `${slug}-challenge.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerContentHandlers };
