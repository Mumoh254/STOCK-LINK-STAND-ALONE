// C:\inventory\stock-link--\scripts\backend\startBackend.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs'); // Added for fs.existsSync check

function startBackend(backendEntryFullPath, backendCwd, nodeExecutablePath) {
  console.log('🚀 Attempting to start backend process...');
  console.log(`Backend Entry Point: ${backendEntryFullPath}`);
  console.log(`Backend CWD: ${backendCwd}`);
  console.log(`Node Executable: ${nodeExecutablePath}`);

  if (!fs.existsSync(backendEntryFullPath)) {
    console.error(`❌ Backend entry file not found at: ${backendEntryFullPath}.`);
    return null; // Return null to indicate failure
  }
  if (!fs.existsSync(nodeExecutablePath)) {
    console.error(`❌ Node executable not found at: ${nodeExecutablePath}.`);
    return null; // Return null
  }

  const backend = spawn(nodeExecutablePath, [backendEntryFullPath], {
    cwd: backendCwd,
    env: process.env, // Pass all current environment variables
    stdio: ['pipe', 'pipe', 'pipe'] // Use pipes for stdout/stderr
  });

  backend.stdout.on('data', (data) => {
    console.log(`[BACKEND] ${data.toString().trim()}`);
  });

  backend.stderr.on('data', (data) => {
    console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
  });

  backend.on('exit', (code) => {
    console.log(`⚠️ Backend exited with code: ${code}`);
  });

  backend.on('error', (err) => {
    console.error(`❌ Failed to spawn backend process: ${err.message}`);
  });

  return backend;
}

module.exports = { startBackend };