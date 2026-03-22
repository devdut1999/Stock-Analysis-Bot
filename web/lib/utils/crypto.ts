import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // Key should be 32 bytes for AES-256
  return Buffer.from(key, 'hex');
}

function getHmacKey(): string {
  const key = process.env.HMAC_SECRET || process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('HMAC_SECRET or ENCRYPTION_KEY environment variable is required');
  }
  return key;
}

/**
 * Encrypt sensitive data (like OAuth tokens)
 * Returns base64-encoded string: iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encrypt()
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivBase64, authTagBase64, encryptedData] = parts;
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Check if a string is encrypted (has our format)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

/**
 * Safely decrypt - returns original value if not encrypted or decryption fails
 */
export function safeDecrypt(value: string): string {
  if (!isEncrypted(value)) return value;
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

/**
 * Create HMAC-signed state for OAuth flows
 * Includes timestamp to prevent replay attacks
 */
export function signState(data: Record<string, unknown>): string {
  const payload = {
    ...data,
    timestamp: Date.now(),
    nonce: randomBytes(8).toString('hex'),
  };
  
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
  
  const signature = createHmac('sha256', getHmacKey())
    .update(payloadBase64)
    .digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode HMAC-signed state
 * Throws if invalid or expired (default 10 min expiry)
 */
export function verifyState(state: string, maxAgeMs: number = 10 * 60 * 1000): Record<string, unknown> {
  const parts = state.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid state format');
  }
  
  const [payloadBase64, signature] = parts;
  
  // Verify signature
  const expectedSignature = createHmac('sha256', getHmacKey())
    .update(payloadBase64)
    .digest('base64url');
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid state signature');
  }
  
  // Decode payload
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
  
  // Check timestamp
  if (payload.timestamp && Date.now() - payload.timestamp > maxAgeMs) {
    throw new Error('State expired');
  }
  
  return payload;
}

/**
 * Generate a secure random key for ENCRYPTION_KEY env var
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
