const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = require('electron-is-dev');
const log = require('electron-log'); // electron-log remains for file logging

// Configure electron-log
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.format = '{h}:{i}:{s}.{ms} [{level}] {text}';
log.transports.file.fileName = 'electron-debug.log';
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs', 'electron-debug.log');

// Override console.log, console.error etc. to also go to electron-log file
Object.assign(console, log.functions);

let mainWindow;
let backendProcess;
// let logWindow; // Removed logWindow variable
let backendCrashTimer;
let isAppQuitting = false;

log.info(`\n===== Stock Link Electron App Start (Main Process) =====
Timestamp: ${new Date().toISOString()}
App Version: ${app.getVersion()}
Electron Version: ${process.versions.electron}
Node Version: ${process.versions.node}
Platform: ${process.platform} ${process.arch}
isDev: ${isDev}`);

function getResourcePaths() {
    const paths = {
        resourcesPath: process.resourcesPath,
        exePath: process.execPath,
        appPath: app.getAppPath(),
        userData: app.getPath('userData'),
        homeDir: os.homedir(),
        tempDir: os.tmpdir(),
        isPackaged: app.isPackaged
    };

    try {
        paths.resourceFiles = fs.readdirSync(process.resourcesPath);

        const appAsarPath = path.join(process.resourcesPath, 'app.asar');
        if (fs.existsSync(appAsarPath)) {
            paths.appAsarExists = true;
            paths.appAsarSize = fs.statSync(appAsarPath).size;
        } else {
            paths.appAsarExists = false;
        }

        const appAsarUnpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked');
        if (fs.existsSync(appAsarUnpackedPath)) {
            paths.appAsarUnpackedExists = true;
            paths.appAsarUnpackedFiles = fs.readdirSync(appAsarUnpackedPath);
        } else {
            paths.appAsarUnpackedExists = false;
        }

        const backendNodeModulesExtraPath = path.join(process.resourcesPath, 'scripts', 'backend', 'node_modules');
        if (fs.existsSync(backendNodeModulesExtraPath)) {
            paths.backendNodeModulesExtraExists = true;
            paths.backendNodeModulesExtraFiles = fs.readdirSync(backendNodeModulesExtraPath);
        } else {
            paths.backendNodeModulesExtraExists = false;
        }

    } catch (e) {
        paths.readError = e.message;
    }

    return paths;
}

function logResourcePaths() {
    const resourcePaths = getResourcePaths();
    // These logs will now only go to the electron-log file
    log.info(`Resource Paths:\n${JSON.stringify(resourcePaths, null, 2)}\n================================`);
}

function logToAll(message) {
    // This function now just calls log.info, as logWindow is removed
    log.info(message);
    // logWindow?.webContents.send('backend-log', `${new Date().toISOString()} - ${message}`); // Removed
}

// Removed createLogWindow function entirely
/*
function createLogWindow() {
    if (logWindow && !logWindow.isDestroyed()) return;

    logWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'Stock Link Debug Logs',
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        },
        show: true // Keep this true for debugging
    });

    logWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <html>
            <head>
                <title>Stock Link Debug Logs</title>
                <style>
                    body { font-family: monospace; background: #111; color: #0f0; padding: 10px; margin: 0; overflow-y: scroll; }
                    pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
                    h1 { color: #fff; text-align: center; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <h1>Stock Link Debug Logs</h1>
                <pre id="log"></pre>
                <script>
                    const { ipcRenderer } = require('electron');
                    const logElement = document.getElementById('log');

                    ipcRenderer.on('backend-log', (_, message) => {
                        logElement.textContent += message + '\\n';
                        logElement.scrollTop = logElement.scrollHeight;
                    });
                </script>
            </body>
        </html>
    `));

    logWindow.on('closed', () => logWindow = null);
    if (isDev) logWindow.webContents.openDevTools();
}
*/

function monitorBackendHealth() {
    clearTimeout(backendCrashTimer);
    backendCrashTimer = setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
            logToAll('❗ Backend frozen - no output in 5 seconds. Restarting...');
            backendProcess.kill('SIGKILL');
        }
    }, 5000);
}

function showFatalError(title, message) {
    log.error(`FATAL ERROR: ${title} - ${message}`);
    dialog.showErrorBox(title, message);
    app.quit();
}

async function runBackendProcess(backendDir, backendPath, backendNodeModulesLocation) {
    logToAll(`🚀 Attempting to start backend process.`);
    logToAll(`    Script Path: ${backendPath}`);
    logToAll(`    Working Directory (CWD): ${backendDir}`);
    logToAll(`    Backend Node Modules (NODE_PATH): ${backendNodeModulesLocation}`);
    logToAll(`    Script Exists: ${fs.existsSync(backendPath)}`);
    logToAll(`    CWD Exists: ${fs.existsSync(backendDir)}`);
    logToAll(`    Node Modules Exist: ${fs.existsSync(backendNodeModulesLocation)}`);

    if (!fs.existsSync(backendPath)) {
        logToAll(`❌ Fatal: Backend script not found at ${backendPath}`);
        showFatalError('Backend Script Missing', `The backend script was not found at:\n${backendPath}`);
        return;
    }
    if (!fs.existsSync(backendDir)) {
        logToAll(`❌ Fatal: Backend working directory not found at ${backendDir}`);
        showFatalError('Backend Directory Missing', `The backend working directory was not found at:\n${backendDir}`);
        return;
    }
    // Changed this from Fatal to Warning, as NODE_PATH might still resolve.
    // If it's a consistent error, you might consider it fatal again.
    if (!fs.existsSync(backendNodeModulesLocation)) {
        logToAll(`⚠️ Warning: Backend node_modules not found directly at ${backendNodeModulesLocation}. This might indicate a packaging issue.`);
    }

    try {
        const backendEnv = {
            ...process.env,
            NODE_ENV: isDev ? 'development' : 'production',
            PORT: '5001',
            HOST: '127.0.0.1',
            USER_DATA_PATH: app.getPath('userData'),
            NODE_PATH: backendNodeModulesLocation // Crucial for backend to find its modules
        };

        logToAll(`⚙️ Backend Environment (partial):`);
        logToAll(JSON.stringify({
            NODE_ENV: backendEnv.NODE_ENV,
            PORT: backendEnv.PORT,
            HOST: backendEnv.HOST,
            USER_DATA_PATH: backendEnv.USER_DATA_PATH,
            NODE_PATH: backendEnv.NODE_PATH,
            // Include PATH to see if node.exe is found via system path
            PATH: backendEnv.PATH 
        }, null, 2));

        let nodeExecutablePath;
        if (isDev) {
            // In development, node.exe is relative to main.js: ../extra_binaries/node/node.exe
            nodeExecutablePath = path.join(__dirname, '..', 'extra_binaries', 'node', 'node.exe');
            // Alternatively, if you have Node.js installed globally and want to use that for dev:
            // nodeExecutablePath = 'node'; 
        } else {
            // In production, node.exe is in resources/extra_binaries/node/node.exe
            nodeExecutablePath = path.join(process.resourcesPath, 'extra_binaries', 'node', 'node.exe');
        }

        logToAll(`⚙️ Using Node.js executable at: ${nodeExecutablePath}`);
        if (!fs.existsSync(nodeExecutablePath)) {
            logToAll(`❌ Fatal: node.exe not found at ${nodeExecutablePath}. Please ensure 'extra_binaries/node/node.exe' is correctly packaged.`);
            showFatalError('Node.exe Missing', `The Node.js executable was not found at:\n${nodeExecutablePath}`);
            return;
        }

        // Spawn node.exe to run your backend script
        backendProcess = spawn(nodeExecutablePath, [backendPath], {
            cwd: backendDir,
            stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin, pipe stdout/stderr
            env: backendEnv
        });

        logToAll(`✅ Backend process spawned using ${path.basename(nodeExecutablePath)}. PID: ${backendProcess.pid || 'N/A'}`);

        backendProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                logToAll(`[Backend STDOUT]: ${output}`);
                monitorBackendHealth();

                // Specific check for your backend's success log
                if (output.includes('Server running at http://127.0.0.1:5001')) { 
                    logToAll('✅ Backend confirmed running');
                    clearTimeout(backendCrashTimer);
                }
            }
        });

        backendProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString().trim();
            if (errorOutput) {
                logToAll(`❗ [Backend STDERR]: ${errorOutput}`);
                if (errorOutput.includes("Cannot find module")) {
                    logToAll("Backend failed to find a module. This strongly indicates a NODE_PATH or packaging issue for backend dependencies.");
                }
                if (errorOutput.includes("EADDRINUSE")) {
                    logToAll("❗❗❗ Backend 'EADDRINUSE' error: Port 5001 is already in use. This indicates the port clearing might not have worked, or the backend is already running.");
                }
                if (errorOutput.includes("listen UNKNOWN")) {
                    logToAll("❗❗❗ Backend 'listen UNKNOWN' error detected. This suggests a very low-level network binding issue or conflict.");
                }
            }
        });

        backendProcess.on('close', (code) => {
            logToAll(`⚠️ Backend exited with code ${code}`);
            backendProcess = null;
            clearTimeout(backendCrashTimer);

            if (code === 0) {
                logToAll('🔄 Backend exited normally. This should not happen for a server! Restarting...');
            } else {
                logToAll('🔄 Backend crashed. Restarting...');
            }

            if (!isAppQuitting) {
                setTimeout(() => runBackendProcess(backendDir, backendPath, backendNodeModulesLocation), 3000);
            }
        });

        backendProcess.on('error', (err) => {
            logToAll(`❌ Backend spawn error (from 'error' event): ${err.message}`);
            backendProcess = null;
            clearTimeout(backendCrashTimer);
            showFatalError('Backend Spawn Error', `Failed to spawn backend process using node.exe: ${err.message}`);
        });

        monitorBackendHealth();

    } catch (e) {
        logToAll(`❌ Unexpected error during backend spawn setup (from try-catch around spawn): ${e.message}`);
        showFatalError('Backend Setup Error', `An unexpected error occurred during backend setup: ${e.message}`);
    }
}

function startBackend() {
    logResourcePaths();
    logToAll(`Starting backend process. isDev: ${isDev}`);

    let backendScriptPath;
    let backendCWD;
    let backendNodeModulesLocation;

    if (isDev) {
        backendCWD = path.join(__dirname, 'scripts', 'backend');
        backendScriptPath = path.join(backendCWD, 'index.js'); // Keeping it as index.js
        backendNodeModulesLocation = path.join(backendCWD, 'node_modules');
        logToAll(`[DEV MODE] Backend CWD: ${backendCWD}`);
        logToAll(`[DEV MODE] Backend Script: ${backendScriptPath}`);
        logToAll(`[DEV MODE] Backend Node Modules: ${backendNodeModulesLocation}`);
    } else {
        backendCWD = path.join(process.resourcesPath, 'scripts', 'backend');
        backendScriptPath = path.join(backendCWD, 'index.js'); // Keeping it as index.js
        backendNodeModulesLocation = path.join(backendCWD, 'node_modules');

        logToAll(`[PROD MODE] Backend CWD: ${backendCWD}`);
        logToAll(`[PROD MODE] Backend Script: ${backendScriptPath}`);
        logToAll(`[PROD MODE] Backend Node Modules: ${backendNodeModulesLocation}`);
    }

    runBackendProcess(backendCWD, backendScriptPath, backendNodeModulesLocation);
}

function createMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            // Example of how to add CSP if not in index.html (adjust as per your actual CSP needs)
            // You might need to add 'additionalHeaders' or manage CSP through 'session'
            // additionalHeaders: {
            //     'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000 http://localhost:5000 http://127.0.0.1:5000 http://127.0.0.1:5001;"
            // }
        },
        show: false
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, 'frontend-dist', 'index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.webContents.on('did-finish-load', () => {
        logToAll('🌐 Frontend loaded');
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.on('closed', () => mainWindow = null);
}

// --- Electron App Lifecycle ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    log.warn('Another instance of the app is running. Quitting this instance.');
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        // createLogWindow(); // Removed the call to createLogWindow

        logToAll('Attempting to pre-clear port 5001...');
        const command = `for /f "tokens=5" %a in ('netstat -aon ^| findstr :5001 ^| findstr LISTENING') do taskkill /f /pid %a`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                log.warn(`⚠️ Error or warning during port pre-clear: ${error.message}`);
            }
            if (stdout) {
                log.info(`Pre-clear stdout: ${stdout.trim()}`);
            }
            if (stderr) {
                log.error(`Pre-clear stderr: ${stderr.trim()}`);
            }
            logToAll('Port pre-clear attempt finished. Starting backend...');
            startBackend();

            setTimeout(() => {
                createMainWindow();
            }, 3000); // Delay for backend to start
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
        if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
    });

    app.on('will-quit', () => {
        isAppQuitting = true;
        if (backendProcess) {
            if (!backendProcess.killed) {
                logToAll('Main process quitting. Terminating backend...');
                backendProcess.kill('SIGTERM'); // Send graceful termination signal
                setTimeout(() => {
                    if (backendProcess && !backendProcess.killed) {
                        logToAll('Backend did not terminate gracefully, forcing kill.');
                        backendProcess.kill('SIGKILL'); // Force kill if it doesn't respond
                    }
                }, 1000); // Give 1 second for graceful shutdown
            } else {
                logToAll('Main process quitting. Backend already terminated.');
            }
        }
        log.info('Electron app quitting.');
    });
}