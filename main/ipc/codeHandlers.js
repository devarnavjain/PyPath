const { runPython, stopPython, checkPythonAvailable } = require('../pythonRunner');

function registerCodeHandlers(ipcMain) {
  ipcMain.handle('code:run', async (_event, code) => {
    try {
      const result = await runPython(code);
      return {
        success: result.success,
        data: {
          stdout: result.stdout,
          stderr: result.stderr,
          executionTime: result.executionTime,
          timedOut: result.timedOut,
        },
        error: result.error,
      };
    } catch (e) {
      return { success: false, data: null, error: e.message };
    }
  });

  ipcMain.handle('code:stop', async () => {
    try {
      await stopPython();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('code:checkPython', async () => {
    try {
      const info = checkPythonAvailable();
      return {
        success: true,
        data: {
          available: info.available,
          command: info.command,
          version: info.version,
        },
      };
    } catch (e) {
      return { success: false, data: null, error: e.message };
    }
  });
}

module.exports = { registerCodeHandlers };
