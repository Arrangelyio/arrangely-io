const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');

// Silence console logs (dev & prod) to reduce noise/IPC overhead

console.debug = () => {};
console.info = () => {};

const secureKeyStore = require(
  path.join(__dirname, 'secureKeyStore')
)

let mainWindow;
let deeplinkUrl = null;

// Register arrangely:// as a custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('arrangely', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('arrangely');
}

// Handle deep link on Windows/Linux when app is already running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Handle the protocol URL from command line (Windows/Linux)
    const url = commandLine.find(arg => arg.startsWith('arrangely://'));
    if (url) {
      handleDeepLink(url);
    }
    // Focus the main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Handle deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Process deep link URL
function handleDeepLink(url) {
  
  
  if (!url || !url.startsWith('arrangely://')) return;
  
  // Parse the URL: arrangely://open?song=<songId>
  try {
    const urlObj = new URL(url);
    const action = urlObj.hostname; // 'open'
    const songId = urlObj.searchParams.get('song');
    
    
    
    // Store for later or send to renderer
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('deep-link', { action, songId });
    } else {
      // Store for when window is ready
      deeplinkUrl = { action, songId };
    }
  } catch (error) {
    console.error('[DeepLink] Failed to parse URL:', error);
  }
}

// REQUIRED for full audio device enumeration in Electron
app.commandLine.appendSwitch("enable-features", "AudioServiceOutOfProcess,AudioServiceSandbox");
app.commandLine.appendSwitch("disable-features", "AudioSandbox"); 
// improve audio routing stability

function createWindow() {
  const isMac = process.platform === 'darwin';
  
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#1a1a1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // ⭐ REQUIRED for showing audiooutput devices
      enableBlinkFeatures: "AudioOutputDevices",
    }
  };

  // macOS: use native traffic light buttons with hidden title bar
  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 12, y: 12 }; // Position traffic lights
    // frame: true by default, allows native controls
  } else {
    // Windows: frameless window with custom title bar controls
    windowOptions.titleBarStyle = 'hidden';
    windowOptions.frame = false;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load React/Vite app
  // if (process.env.NODE_ENV === 'development') {
    // mainWindow.loadURL("http://localhost:5174");
    mainWindow.webContents.openDevTools();
  // } else {
    mainWindow.loadFile(path.join(__dirname, "ui/dist/index.html"));
  // }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Get cache directory path
function getCacheDir() {
  const userDataPath = app.getPath('userData');
  const cacheDir = path.join(userDataPath, 'encrypted-audio-cache');
  return cacheDir;
}

// Ensure cache directory exists
async function ensureCacheDir() {
  const cacheDir = getCacheDir();
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create cache directory:', error);
  }
  return cacheDir;
}

// Generate safe filename from URL
function getFilenameFromUrl(url) {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return `${hash}.encrypted`;
}

// Window control handlers
ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () =>
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
);
ipcMain.on("window-close", () => mainWindow?.close());

// File system handlers for encrypted audio cache - with chunking support
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

ipcMain.handle('fs:write-encrypted-audio', async (event, url, encryptedData) => {
  try {
    const cacheDir = await ensureCacheDir();
    const filename = getFilenameFromUrl(url);
    const filepath = path.join(cacheDir, filename);
    
    
    
    // Convert array to Buffer - handle large data properly
    const buffer = Buffer.from(encryptedData);
    
    
    // Write file
    await fs.writeFile(filepath, buffer);
    
    // Verify the write
    const stats = await fs.stat(filepath);
    
    
    if (stats.size !== buffer.length) {
      throw new Error(`Size mismatch: expected ${buffer.length}, got ${stats.size}`);
    }
    
    return { success: true, filepath, size: stats.size };
  } catch (error) {
    console.error('[Cache] Failed to write encrypted audio:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:write-encrypted-audio-chunk', async (event, url, chunk, isFirstChunk = true) => {
  try {
    const cacheDir = await ensureCacheDir();
    const filename = getFilenameFromUrl(url);
    const filepath = path.join(cacheDir, filename);
    
    const buffer = Buffer.from(chunk);
    const flag = isFirstChunk ? 'w' : 'a';
    
    await fs.writeFile(filepath, buffer, { flag });
    
    return { success: true };
  } catch (error) {
    console.error('[Cache] Failed to write chunk:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:read-encrypted-audio', async (event, url) => {
  try {
    const cacheDir = getCacheDir();
    const filename = getFilenameFromUrl(url);
    const filepath = path.join(cacheDir, filename);
    
    const data = await fs.readFile(filepath);
    return { success: true, data: Array.from(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, notFound: true };
    }
    console.error('Failed to read encrypted audio:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:check-audio-exists', async (event, url) => {
  try {
    const cacheDir = getCacheDir();
    const filename = getFilenameFromUrl(url);
    const filepath = path.join(cacheDir, filename);
    
    await fs.access(filepath);
    return { exists: true };
  } catch (error) {
    return { exists: false };
  }
});

ipcMain.handle('fs:delete-audio', async (event, url) => {
  try {
    const cacheDir = getCacheDir();
    const filename = getFilenameFromUrl(url);
    const filepath = path.join(cacheDir, filename);
    
    await fs.unlink(filepath);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete audio:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:clear-audio-cache', async () => {
  try {
    const cacheDir = getCacheDir();
    const files = await fs.readdir(cacheDir);
    
    await Promise.all(
      files.map(file => fs.unlink(path.join(cacheDir, file)))
    );
    
    return { success: true, deletedCount: files.length };
  } catch (error) {
    console.error('Failed to clear audio cache:', error);
    return { success: false, error: error.message };
  }
});

// Secure key storage handlers
ipcMain.handle('secure-store:get-key', async () => {
  return await secureKeyStore.getKey();
});

ipcMain.handle('secure-store:set-key', async (event, key) => {
  return await secureKeyStore.setKey(key);
});

// Streaming cache handlers - use 'audio-library' instead of 'cache' for persistence
function getStreamingCacheDir(songId) {
  const userDataPath = app.getPath('userData');
  // Use 'audio-library' folder - NOT 'cache' to prevent OS/app cleanup
  return path.join(userDataPath, 'audio-library', `song_${songId}`);
}

function getTrackFilePath(songId, trackNumber, extension = 'enc') {
  // Always use .enc extension for encrypted files
  return path.join(getStreamingCacheDir(songId), `track_${trackNumber}.enc`);
}

// Encryption helpers using Node.js crypto
const cryptoNode = require('crypto');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get or create encryption key (stored securely)
let encryptionKeyCache = null;
async function getEncryptionKey() {
  if (encryptionKeyCache) return encryptionKeyCache;
  
  const result = await secureKeyStore.getKey();
  if (result.success && result.key) {
    try {
      // Check if it's a hex string (64 chars for 32 bytes)
      if (/^[0-9a-fA-F]{64}$/.test(result.key)) {
        encryptionKeyCache = Buffer.from(result.key, 'hex');
        
        return encryptionKeyCache;
      }
      
      // Old format was JSON (JWK) - need to regenerate
      
    } catch (e) {
      
    }
  }
  
  // Generate new 256-bit (32 byte) key
  const newKey = cryptoNode.randomBytes(32);
  const hexKey = newKey.toString('hex');
  
  
  await secureKeyStore.setKey(hexKey);
  encryptionKeyCache = newKey;
  return newKey;
}

// Encrypt data before writing to disk
async function encryptData(data) {
  const key = await getEncryptionKey();
  const iv = cryptoNode.randomBytes(IV_LENGTH);
  const cipher = cryptoNode.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: IV (16 bytes) + AuthTag (16 bytes) + Encrypted Data
  return Buffer.concat([iv, authTag, encrypted]);
}

// Decrypt data after reading from disk
async function decryptData(encryptedData) {
  const key = await getEncryptionKey();
  
  // Extract IV, auth tag, and encrypted content
  const iv = encryptedData.slice(0, IV_LENGTH);
  const authTag = encryptedData.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = encryptedData.slice(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = cryptoNode.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// Find existing track file with any extension
async function findExistingTrackFile(songId, trackNumber) {
  const cacheDir = getStreamingCacheDir(songId);
  try {
    const files = await fs.readdir(cacheDir);
    const trackPrefix = `track_${trackNumber}.`;
    const trackFile = files.find(f => f.startsWith(trackPrefix) && !f.endsWith('.meta'));
    if (trackFile) {
      return path.join(cacheDir, trackFile);
    }
  } catch {
    // Directory doesn't exist
  }
  return null;
}

ipcMain.handle('streaming-cache:check-exists', async (event, songId, trackNumber) => {
  try {
    // Find any existing track file with any extension
    const existingFile = await findExistingTrackFile(songId, trackNumber);
    
    if (!existingFile) {
      return { exists: false, complete: false, filePath: null };
    }
    
    const metaPath = `${existingFile}.meta`;
    
    // Check if complete
    let complete = false;
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      complete = meta.complete === true;
    } catch {
      // No meta file or invalid, assume incomplete
      complete = false;
    }
    
    // Return file path for direct loading (much faster than IPC transfer)
    return { exists: true, complete, filePath: existingFile };
  } catch (error) {
    return { exists: false, complete: false, filePath: null };
  }
});

ipcMain.handle('streaming-cache:write-chunk', async (event, songId, trackNumber, chunk, isComplete, originalExtension = 'wav') => {
  try {
    
    
    const cacheDir = getStreamingCacheDir(songId);
    
    
    await fs.mkdir(cacheDir, { recursive: true });
    
    
    // Delete any existing track file
    const existingFile = await findExistingTrackFile(songId, trackNumber);
    if (existingFile) {
      
      await fs.unlink(existingFile).catch(() => {});
      await fs.unlink(`${existingFile}.meta`).catch(() => {});
    }
    
    const filepath = getTrackFilePath(songId, trackNumber); // Always .enc
    const metaPath = `${filepath}.meta`;
    
    
    const buffer = Buffer.from(chunk);
    
    
    // Encrypt before writing to disk
    const encryptedBuffer = await encryptData(buffer);
    
    
    await fs.writeFile(filepath, encryptedBuffer);
    
    
    // Write metadata (includes original extension for playback)
    await fs.writeFile(metaPath, JSON.stringify({ 
      complete: isComplete,
      originalSize: buffer.length,
      encryptedSize: encryptedBuffer.length,
      timestamp: Date.now(),
      originalExtension: originalExtension,
      encrypted: true
    }));
    
    
    
    return { success: true };
  } catch (error) {
    console.error('[Cache] FAILED to write encrypted chunk:', error);
    console.error('[Cache] Error stack:', error.stack);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streaming-cache:read-track', async (event, songId, trackNumber) => {
  try {
    const existingFile = await findExistingTrackFile(songId, trackNumber);
    if (!existingFile) {
      return { success: false, error: 'Track not found in cache' };
    }
    
    const encryptedData = await fs.readFile(existingFile);
    
    // Check if file is encrypted (read metadata)
    const metaPath = `${existingFile}.meta`;
    let isEncrypted = true;
    let originalExtension = 'wav';
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      isEncrypted = meta.encrypted !== false;
      originalExtension = meta.originalExtension || 'wav';
    } catch {}
    
    // Decrypt the data
    let decryptedData;
    if (isEncrypted) {
      decryptedData = await decryptData(encryptedData);
      
    } else {
      decryptedData = encryptedData;
    }
    
    return { 
      success: true, 
      data: Array.from(decryptedData),
      originalExtension 
    };
  } catch (error) {
    console.error('Failed to read/decrypt cached track:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streaming-cache:delete-track', async (event, songId, trackNumber) => {
  try {
    const existingFile = await findExistingTrackFile(songId, trackNumber);
    if (existingFile) {
      await fs.unlink(existingFile).catch(() => {});
      await fs.unlink(`${existingFile}.meta`).catch(() => {});
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete track:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streaming-cache:clear-song', async (event, songId) => {
  try {
    const cacheDir = getStreamingCacheDir(songId);
    
    // Delete all files in song directory
    try {
      const files = await fs.readdir(cacheDir);
      await Promise.all(files.map(file => 
        fs.unlink(path.join(cacheDir, file))
      ));
      await fs.rmdir(cacheDir);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to clear song cache:', error);
    return { success: false, error: error.message };
  }
});

// Get cache statistics
ipcMain.handle('streaming-cache:get-stats', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const cacheBaseDir = path.join(userDataPath, 'audio-library');
    
    let totalSize = 0;
    let songCount = 0;
    let trackCount = 0;

    try {
      const songDirs = await fs.readdir(cacheBaseDir);
      songCount = songDirs.length;

      for (const songDir of songDirs) {
        const songPath = path.join(cacheBaseDir, songDir);
        const stat = await fs.stat(songPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(songPath);
          for (const file of files) {
            // Count audio files (wav, mp3, bin) but not meta files
            if (!file.endsWith('.meta')) {
              trackCount++;
              const fileStat = await fs.stat(path.join(songPath, file));
              totalSize += fileStat.size;
            }
          }
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return { 
      success: true, 
      songCount, 
      trackCount, 
      totalSize,
      cachePath: cacheBaseDir
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { success: false, error: error.message };
  }
});

// Register custom protocol for serving local audio files
// This allows WaveSurfer to load local files without security restrictions
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-audio', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);

app.whenReady().then(() => {
  // Register protocol handler for local audio files
  protocol.handle('local-audio', async (request) => {
    try {
      // URL format: local-audio://song_xxx/track_0.wav
      const url = new URL(request.url);
      const pathParts = url.pathname.replace(/^\/+/, '').split('/');
      const songFolder = url.hostname; // song_xxx
      const trackFile = pathParts[0]; // track_0.wav
      
      const userDataPath = app.getPath('userData');
      const filePath = path.join(userDataPath, 'cache', 'audio', songFolder, trackFile);
      
      
      
      // Check if file exists
      if (!fsSync.existsSync(filePath)) {
        console.error(`[Protocol] File not found: ${filePath}`);
        return new Response('File not found', { status: 404 });
      }
      
      // Return file as response using net.fetch for file:// URLs
      return net.fetch(`file://${filePath}`);
    } catch (error) {
      console.error('[Protocol] Error serving audio:', error);
      return new Response('Error serving file', { status: 500 });
    }
  });
  
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
