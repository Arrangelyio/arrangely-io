/**
 * Audio encryption utilities using Web Crypto API
 * Encrypts audio files for secure disk storage
 */

const ENCRYPTION_KEY_NAME = 'daw_audio_encryption_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Get or generate encryption key
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (stored) {
    const keyData = JSON.parse(stored);
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  // Store key
  const exported = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exported));

  return key;
}

/**
 * Encrypt audio ArrayBuffer
 * @param audioData Raw audio buffer
 * @returns Encrypted data with IV prepended
 */
export async function encryptAudio(audioData: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    audioData
  );

  // Prepend IV to encrypted data (needed for decryption)
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result.buffer;
}

/**
 * Decrypt audio ArrayBuffer
 * @param encryptedData Encrypted data with IV prepended
 * @returns Decrypted audio buffer
 */
export async function decryptAudio(encryptedData: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await getOrCreateEncryptionKey();
  
  // Extract IV (first 12 bytes)
  const iv = new Uint8Array(encryptedData.slice(0, 12));
  const encrypted = encryptedData.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  return decrypted;
}
