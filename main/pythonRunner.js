const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

let pythonCommand = null;
let pythonVersion = null;
let runningProcess = null;

function detectPython() {
  return new Promise((resolve) => {
    exec('python --version', (err, stdout, stderr) => {
      const version = (stdout || stderr || '').trim();
      if (!err && version) {
        pythonCommand = 'python';
        pythonVersion = version;
        resolve(true);
        return;
      }
      exec('python3 --version', (err3, stdout3, stderr3) => {
        const version3 = (stdout3 || stderr3 || '').trim();
        if (!err3 && version3) {
          pythonCommand = 'python3';
          pythonVersion = version3;
          resolve(true);
          return;
        }
        pythonCommand = null;
        pythonVersion = null;
        resolve(false);
      });
    });
  });
}

function checkPythonAvailable() {
  return {
    available: pythonCommand !== null,
    command: pythonCommand,
    version: pythonVersion,
  };
}

function runPython(code, timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!pythonCommand) {
      resolve({
        success: false,
        stdout: '',
        stderr: 'Python is not available on this system. Install Python 3 and restart PyPath.',
        executionTime: 0,
        error: 'Python not found',
        timedOut: false,
      });
      return;
    }

    const tmpFile = path.join(os.tmpdir(), 'pypath_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.py');
    const start = Date.now();

    try {
      fs.writeFileSync(tmpFile, code, 'utf-8');
    } catch (writeErr) {
      resolve({
        success: false,
        stdout: '',
        stderr: 'Failed to write temp file: ' + writeErr.message,
        executionTime: 0,
        error: writeErr.message,
        timedOut: false,
      });
      return;
    }

    const proc = exec(
      '"' + pythonCommand + '" "' + tmpFile + '"',
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        const elapsed = Date.now() - start;
        cleanup();

        const timedOut = err && err.killed;
        const success = !err || timedOut === false;

        resolve({
          success: success,
          stdout: stdout || '',
          stderr: stderr || '',
          executionTime: elapsed,
          error: err ? err.message : null,
          timedOut: timedOut,
        });
      }
    );

    runningProcess = proc;

    proc.on('error', (err) => {
      cleanup();
      runningProcess = null;
    });
  });
}

function stopPython() {
  return new Promise((resolve) => {
    if (runningProcess && runningProcess.pid) {
      try {
        if (process.platform === 'win32') {
          exec('taskkill /pid ' + runningProcess.pid + ' /T /F', () => {
            runningProcess = null;
            resolve(true);
          });
        } else {
          runningProcess.kill('SIGKILL');
          runningProcess = null;
          resolve(true);
        }
      } catch (e) {
        runningProcess = null;
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}

function cleanup() {
  runningProcess = null;
}

module.exports = { detectPython, checkPythonAvailable, runPython, stopPython };
