import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetBackend = vi.fn();
const mockPlatform = vi.fn();

vi.mock('os', () => ({ platform: () => mockPlatform() }));
vi.mock('../src/config.js', () => ({
  getBackend: () => mockGetBackend(),
  getSpotifyRefreshToken: () => null,
  saveSpotifyTokens: () => {},
  clearSpotifyTokens: () => {},
}));

// ── API: Spotify Auth URL ──────────────────────────────────────────────────

describe('getSpotifyAuthUrl', () => {
  it('generates a valid Spotify auth URL', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test_secret';

    const mod = await import('../src/spotify/api.js');
    const url = mod.getSpotifyAuthUrl('http://localhost:3000/callback');

    expect(url).toContain('https://accounts.spotify.com/authorize');
    expect(url).toContain('client_id=test_client_id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
    expect(url).toContain('response_type=code');
    expect(url).toContain('user-read-currently-playing');
  });
});

describe('SPOTIFY_USE_API', () => {
  it('is true when both are set', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';
    vi.resetModules();
    const mod = await import('../src/spotify/api.js');
    expect(mod.SPOTIFY_USE_API).toBe(true);
  });

  it('is false when client ID is empty', async () => {
    process.env.SPOTIFY_CLIENT_ID = '';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';
    vi.resetModules();
    const mod = await import('../src/spotify/api.js');
    expect(mod.SPOTIFY_USE_API).toBe(false);
  });

  it('is false when secret is empty', async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = '';
    vi.resetModules();
    const mod = await import('../src/spotify/api.js');
    expect(mod.SPOTIFY_USE_API).toBe(false);
  });
});

describe('invalidateSpotifyToken', () => {
  it('does not throw', async () => {
    const mod = await import('../src/spotify/api.js');
    expect(() => mod.invalidateSpotifyToken()).not.toThrow();
  });
});

// ── Index: Dispatcher logic ────────────────────────────────────────────────

describe('getCurrentTrack dispatcher', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetBackend.mockReturnValue('auto');
    mockPlatform.mockReturnValue('linux');
  });

  it('returns null when backend=api on Linux', async () => {
    mockGetBackend.mockReturnValue('api');
    mockPlatform.mockReturnValue('linux');

    const index = await import('../src/spotify/index.js');
    const result = await index.getCurrentTrack();
    expect(result).toBeNull();
  });

  it('throws for unsupported platforms', async () => {
    mockGetBackend.mockReturnValue('native');
    mockPlatform.mockReturnValue('darwin');

    const index = await import('../src/spotify/index.js');
    await expect(index.getCurrentTrack()).rejects.toThrow('Plataforma no soportada');
  });
});
