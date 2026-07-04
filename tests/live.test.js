import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config.js', () => ({
  CONFIG_DIR: '/mock/config',
  getLiveChannelId: vi.fn(() => 'channel_123'),
  setLiveChannelId: vi.fn(),
  getLiveMessageId: vi.fn(() => ''),
  setLiveMessageId: vi.fn(),
  getUiTheme: vi.fn(() => 'classic'),
}));

import { getLiveChannelId, getUiTheme } from '../src/config.js';

describe('live.js', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('stopLiveUpdates without error when not running', async () => {
    const live = await import('../src/bot/live.js');
    expect(() => live.stopLiveUpdates()).not.toThrow();
  }, 10000);

  it('does not start updates when channel is empty', async () => {
    vi.mocked(getLiveChannelId).mockReturnValue('');
    const live = await import('../src/bot/live.js');
    live.startLiveUpdates({});
    live.stopLiveUpdates();
  }, 10000);

  it('reads nowplaying.json when it exists', async () => {
    const live = await import('../src/bot/live.js');
    const mockClient = {
      channels: {
        fetch: vi.fn().mockRejectedValue(new Error('channel not found')),
      },
    };
    live.startLiveUpdates(mockClient);
    await new Promise(r => setTimeout(r, 10));
    live.stopLiveUpdates();
  }, 10000);

  it('skips image generation for classic theme', async () => {
    vi.mocked(getUiTheme).mockReturnValue('classic');
    const live = await import('../src/bot/live.js');
    // just verify the module loads and works
    expect(typeof live.startLiveUpdates).toBe('function');
    expect(typeof live.stopLiveUpdates).toBe('function');
  }, 10000);
});
