const db = require('../database');

function registerProgressHandlers(ipcMain) {
  ipcMain.handle('progress:get', async (_event, userId) => {
    try {
      const progress = db.getProgress(userId);
      return { success: true, data: progress };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('progress:update', async (_event, userId, topicId, fields) => {
    try {
      db.upsertProgress(userId, topicId, fields.tier, fields);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('progress:awardXP', async (_event, userId, amount) => {
    try {
      const xp = db.awardXP(userId, amount);
      return { success: true, data: { xp } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('badges:get', async (_event, userId) => {
    try {
      const badges = db.getBadges(userId);
      return { success: true, data: badges };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('badges:award', async (_event, userId, badgeId) => {
    try {
      db.awardBadge(userId, badgeId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('progress:incrementAttempts', async (_event, userId, topicId) => {
    try {
      db.incrementAttempts(userId, topicId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sessions:upsert', async (_event, userId, date, durationSec, xpEarned) => {
    try {
      db.upsertSession(userId, date, durationSec, xpEarned);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerProgressHandlers };
