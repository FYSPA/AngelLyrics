import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../src/config/paths.js', () => ({
  CONFIG_DIR: '/mock/config',
}));

describe('lyrics-live.js', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('exports isKaraokeActive returning false initially', async () => {
    const ll = await import('../src/bot/lyrics-live.js');
    expect(ll.isKaraokeActive()).toBe(false);
  }, 10000);

  it('exports startKaraoke and stopKaraoke functions', async () => {
    const ll = await import('../src/bot/lyrics-live.js');
    expect(typeof ll.startKaraoke).toBe('function');
    expect(typeof ll.stopKaraoke).toBe('function');
    expect(typeof ll.isKaraokeActive).toBe('function');
  }, 10000);

  it('isKaraokeActive returns true after startKaraoke', async () => {
    const ll = await import('../src/bot/lyrics-live.js');
    const mockClient = {
      channels: {
        fetch: vi.fn().mockRejectedValue(new Error('not found')),
      },
    };
    ll.startKaraoke(mockClient, 'channel_123');
    expect(ll.isKaraokeActive()).toBe(true);
    ll.stopKaraoke();
    expect(ll.isKaraokeActive()).toBe(false);
  }, 10000);

  it('stopKaraoke can be called multiple times safely', async () => {
    const ll = await import('../src/bot/lyrics-live.js');
    ll.stopKaraoke();
    ll.stopKaraoke();
    expect(ll.isKaraokeActive()).toBe(false);
  }, 10000);

  it('startKaraoke stops previous karaoke session', async () => {
    const ll = await import('../src/bot/lyrics-live.js');
    const mockClient = {
      channels: {
        fetch: vi.fn().mockRejectedValue(new Error('not found')),
      },
    };
    ll.startKaraoke(mockClient, 'channel_1');
    ll.startKaraoke(mockClient, 'channel_2');
    expect(ll.isKaraokeActive()).toBe(true);
    ll.stopKaraoke();
  }, 10000);
});
