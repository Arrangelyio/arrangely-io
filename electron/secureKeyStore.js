/**
 * Secure key storage using OS-level encryption
 * - Windows: DPAPI via dpapi-addon
 * - macOS: Keychain via keytar
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const SERVICE_NAME = 'ArrangelyAudio';
const ACCOUNT_NAME = 'EncryptionKey';

let keytarModule = null;
let dpapiModule = null;

// Try to load platform-specific modules
try {
  if (process.platform === 'darwin') {
    keytarModule = require('keytar');
  } else if (process.platform === 'win32') {
    dpapiModule = require('dpapi-addon');
  }
} catch (error) {
  console.warn('Native secure storage not available:', error.message);
}

/**
 * Get encryption key from secure storage
 */
async function getKey() {
  try {
    if (process.platform === 'darwin' && keytarModule) {
      // macOS Keychain
      const key = await keytarModule.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      return { success: true, key };
    } else if (process.platform === 'win32' && dpapiModule) {
      // Windows DPAPI
      const keyFile = path.join(app.getPath('userData'), 'secure', 'key.dat');
      
      try {
        const encrypted = await fs.readFile(keyFile);
        const decrypted = dpapiModule.unprotectData(encrypted, null, 'CurrentUser');
        return { success: true, key: decrypted.toString('utf8') };
      } catch (error) {
        if (error.code === 'ENOENT') {
          return { success: false };
        }
        throw error;
      }
    } else {
      // Fallback: use file-based storage (less secure)
      const keyFile = path.join(app.getPath('userData'), 'secure', 'key.json');
      try {
        const data = await fs.readFile(keyFile, 'utf8');
        return { success: true, key: data };
      } catch (error) {
        if (error.code === 'ENOENT') {
          return { success: false };
        }
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to get secure key:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set encryption key in secure storage
 */
async function setKey(key) {
  try {
    if (process.platform === 'darwin' && keytarModule) {
      // macOS Keychain
      await keytarModule.setPassword(SERVICE_NAME, ACCOUNT_NAME, key);
      return { success: true };
    } else if (process.platform === 'win32' && dpapiModule) {
      // Windows DPAPI
      const secureDir = path.join(app.getPath('userData'), 'secure');
      await fs.mkdir(secureDir, { recursive: true });
      
      const keyFile = path.join(secureDir, 'key.dat');
      const encrypted = dpapiModule.protectData(Buffer.from(key, 'utf8'), null, 'CurrentUser');
      await fs.writeFile(keyFile, encrypted);
      
      return { success: true };
    } else {
      // Fallback: file-based storage
      const secureDir = path.join(app.getPath('userData'), 'secure');
      await fs.mkdir(secureDir, { recursive: true });
      
      const keyFile = path.join(secureDir, 'key.json');
      await fs.writeFile(keyFile, key, 'utf8');
      
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to set secure key:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getKey,
  setKey
};
