import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { hostname } from 'os';
import { APP_NAME } from './paths.js';

const ALGORITHM = 'aes-256-gcm';

function deriveKey() {
  return createHash('sha256').update(hostname() + '::' + APP_NAME).digest();
}

export function encryptToken(plaintext) {
  const key = deriveKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    e: true,
    iv: iv.toString('hex'),
    t: cipher.getAuthTag().toString('hex'),
    d: encrypted,
  };
}

export function decryptToken(stored) {
  try {
    if (typeof stored === 'object' && stored.e === true) {
      const key = deriveKey();
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(stored.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(stored.t, 'hex'));
      let decrypted = decipher.update(stored.d, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    if (typeof stored === 'string') return stored;
  } catch {}
  return null;
}
