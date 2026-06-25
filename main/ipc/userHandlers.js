const db = require('../database');

function registerUserHandlers(ipcMain) {
  ipcMain.handle('users:getAll', async () => {
    try {
      const users = db.getAllUsers();
      return { success: true, data: users };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('users:create', async (_event, data) => {
    try {
      const user = db.createUser(data.name, data.avatarId);
      return { success: true, data: user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('users:get', async (_event, id) => {
    try {
      const user = db.getUserById(id);
      return { success: true, data: user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('users:update', async (_event, id, fields) => {
    try {
      db.updateUser(id, fields);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('users:delete', async (_event, userId) => {
    try {
      const result = db.deleteUser(userId);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerUserHandlers };
