/**
 * Secure encryption key storage using OS-level security
 * - Windows: DPAPI
 * - macOS: Keychain
 */

const KEY_STORAGE_NAME = 'arrangely_audio_encryption_key';

declare global {
  interface Window {
    electron?: {
      secureStore: {
        getKey: () => Promise<{ success: boolean; key?: string; error?: string }>;
        setKey: (key: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

export async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  // Check if running in Electron
  if (!window.electron?.secureStore) {
    console.warn('Secure store not available, falling back to localStorage');
    return getOrCreateEncryptionKeyFallback();
  }

  try {
    // Try to get existing key from secure storage
    const result = await window.electron.secureStore.getKey();
    
    if (result.success && result.key) {
      // Import existing key
      const keyData = JSON.parse(result.key);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Store key securely
    const exported = await crypto.subtle.exportKey('jwk', key);
    await window.electron.secureStore.setKey(JSON.stringify(exported));

    return key;
  } catch (error) {
    console.error('Failed to use secure key store:', error);
    return getOrCreateEncryptionKeyFallback();
  }
}

// Fallback to localStorage (less secure)
async function getOrCreateEncryptionKeyFallback(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE_NAME);
  
  if (stored) {
    const keyData = JSON.parse(stored);
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(KEY_STORAGE_NAME, JSON.stringify(exported));

  return key;
}
