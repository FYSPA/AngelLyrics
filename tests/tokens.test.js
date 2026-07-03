import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStore = {};

vi.mock('../src/config/cache.js', () => ({
  readConfig: vi.fn(() => mockStore),
  writeConfig: vi.fn((updated) => {
    Object.keys(updated).forEach(k => { mockStore[k] = updated[k]; });
    Object.keys(mockStore).forEach(k => { if (!(k in updated)) delete mockStore[k]; });
  }),
  refreshConfig: vi.fn(() => {}),
}));

vi.mock('../src/config/crypto.js', () => ({
  encryptToken: vi.fn((t) => ({ e: true, iv: 'iv', t: 'tag', d: `enc:${t}` })),
  decryptToken: vi.fn((s) => {
    if (typeof s === 'object' && s.e) return s.d.replace('enc:', '');
    if (typeof s === 'string') return s;
    return null;
  }),
}));

describe('tokens', () => {
  let mod;

  beforeEach(async () => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    delete process.env.DISCORD_USER_TOKEN;
    mod = await import('../src/config/tokens.js');
  });

  describe('getToken', () => {
    it('returns null when no token stored', () => {
      expect(mod.getToken()).toBeNull();
    });

    it('returns env var DISCORD_USER_TOKEN when set', () => {
      process.env.DISCORD_USER_TOKEN = 'env-token';
      expect(mod.getToken()).toBe('env-token');
    });

    it('returns stored encrypted token', () => {
      mod.saveToken('my-token');
      expect(mod.getToken()).toBe('my-token');
    });
  });

  describe('saveToken', () => {
    it('encrypts and stores token', () => {
      mod.saveToken('secret-123');
      expect(mockStore.userToken).toBeDefined();
      expect(mockStore.userToken.e).toBe(true);
      expect(mod.getToken()).toBe('secret-123');
    });
  });

  describe('clearToken', () => {
    it('removes userToken from config', () => {
      mod.saveToken('secret');
      mod.clearToken();
      expect(mockStore.userToken).toBeUndefined();
      expect(mod.getToken()).toBeNull();
    });
  });

  describe('Spotify tokens', () => {
    it('getSpotifyRefreshToken returns null by default', () => {
      expect(mod.getSpotifyRefreshToken()).toBeNull();
    });

    it('saveSpotifyTokens stores refresh token and user', () => {
      mod.saveSpotifyTokens('refresh-abc', 'user123');
      expect(mod.getSpotifyRefreshToken()).toBe('refresh-abc');
      expect(mod.getSpotifyUser()).toBe('user123');
    });

    it('clearSpotifyTokens removes spotify data', () => {
      mod.saveSpotifyTokens('refresh-abc', 'user123');
      mod.clearSpotifyTokens();
      expect(mod.getSpotifyRefreshToken()).toBeNull();
      expect(mod.getSpotifyUser()).toBeNull();
    });
  });
});
