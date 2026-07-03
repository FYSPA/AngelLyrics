import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../src/config/crypto.js';

describe('crypto', () => {
  it('encrypts and decrypts a token', () => {
    const token = 'my-secret-discord-token-12345';
    const encrypted = encryptToken(token);

    expect(encrypted).toHaveProperty('e', true);
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('t');
    expect(encrypted).toHaveProperty('d');
    expect(encrypted.d).not.toBe(token);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it('returns plain string for non-encrypted token', () => {
    const result = decryptToken('raw-token-string');
    expect(result).toBe('raw-token-string');
  });

  it('returns null for invalid encrypted data', () => {
    const result = decryptToken({ e: true, iv: 'bad', t: 'bad', d: 'bad' });
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    expect(decryptToken(null)).toBeNull();
  });

  it('produces different ciphertexts each time (random IV)', () => {
    const token = 'same-token';
    const a = encryptToken(token);
    const b = encryptToken(token);
    expect(a.d).not.toBe(b.d);
  });

  it('decrypts its own output round-trip', () => {
    const tokens = ['hello', '', 'a'.repeat(100), 'token-with-unicode-ñ-é-ü'];
    for (const t of tokens) {
      expect(decryptToken(encryptToken(t))).toBe(t);
    }
  });
});
