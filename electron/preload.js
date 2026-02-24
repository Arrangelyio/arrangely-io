const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Platform detection
  platform: process.platform, // 'darwin' for macOS, 'win32' for Windows
  isMac: process.platform === 'darwin',
  
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Deep link handler
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (event, data) => callback(data)),
  // Platform detection
  platform: process.platform, // 'darwin' for macOS, 'win32' for Windows
  isMac: process.platform === 'darwin',
  
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // File system API for encrypted audio cache
  fs: {
    writeEncryptedAudio: (url, encryptedData) => 
      ipcRenderer.invoke('fs:write-encrypted-audio', url, encryptedData),
    writeEncryptedAudioChunk: (url, chunk, isFirstChunk) =>
      ipcRenderer.invoke('fs:write-encrypted-audio-chunk', url, chunk, isFirstChunk),
    readEncryptedAudio: (url) => 
      ipcRenderer.invoke('fs:read-encrypted-audio', url),
    checkAudioExists: (url) => 
      ipcRenderer.invoke('fs:check-audio-exists', url),
    deleteAudio: (url) => 
      ipcRenderer.invoke('fs:delete-audio', url),
    clearAudioCache: () => 
      ipcRenderer.invoke('fs:clear-audio-cache')
  },

  // Secure key storage API
  secureStore: {
    getKey: () => ipcRenderer.invoke('secure-store:get-key'),
    setKey: (key) => ipcRenderer.invoke('secure-store:set-key', key)
  },

  // Streaming cache API
  streamingCache: {
    checkCacheExists: (songId, trackNumber) => 
      ipcRenderer.invoke('streaming-cache:check-exists', songId, trackNumber),
    writeStreamChunk: (songId, trackNumber, chunk, isComplete, extension = 'bin') => 
      ipcRenderer.invoke('streaming-cache:write-chunk', songId, trackNumber, chunk, isComplete, extension),
    readTrack: (songId, trackNumber) => 
      ipcRenderer.invoke('streaming-cache:read-track', songId, trackNumber),
    deleteTrack: (songId, trackNumber) => 
      ipcRenderer.invoke('streaming-cache:delete-track', songId, trackNumber),
    clearSongCache: (songId) => 
      ipcRenderer.invoke('streaming-cache:clear-song', songId),
    getCacheStats: () =>
      ipcRenderer.invoke('streaming-cache:get-stats')
  }
});
