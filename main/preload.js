const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  getUser: (id) => ipcRenderer.invoke('users:get', id),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Progress
  getProgress: (userId) => ipcRenderer.invoke('progress:get', userId),
  updateProgress: (userId, topicId, data) => ipcRenderer.invoke('progress:update', userId, topicId, data),
  awardXP: (userId, amount) => ipcRenderer.invoke('progress:awardXP', userId, amount),

  // Code execution
  runCode: (code) => ipcRenderer.invoke('code:run', code),
  stopCode: () => ipcRenderer.invoke('code:stop'),
  checkPython: () => ipcRenderer.invoke('code:checkPython'),

  // Content
  getTopicIndex: () => ipcRenderer.invoke('content:getIndex'),
  getLesson: (topicId) => ipcRenderer.invoke('content:getLesson', topicId),
  getQuiz: (topicId) => ipcRenderer.invoke('content:getQuiz', topicId),
  getChallenge: (topicId) => ipcRenderer.invoke('content:getChallenge', topicId),

  // Progress
  incrementAttempts: (userId, topicId) => ipcRenderer.invoke('progress:incrementAttempts', userId, topicId),

  // Badges
  getBadges: (userId) => ipcRenderer.invoke('badges:get', userId),
  awardBadge: (userId, badgeId) => ipcRenderer.invoke('badges:award', userId, badgeId),

  // Sessions
  upsertSession: (userId, date, durationSec, xpEarned) => ipcRenderer.invoke('sessions:upsert', userId, date, durationSec, xpEarned),

  // Zoom
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
});
