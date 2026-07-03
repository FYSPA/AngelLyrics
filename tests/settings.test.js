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

describe('settings', () => {
  let mod;

  beforeEach(async () => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    mod = await import('../src/config/settings.js');
  });

  describe('display mode', () => {
    it('defaults to lyrics', () => {
      expect(mod.getDisplayMode()).toBe('lyrics');
    });

    it('setDisplayMode updates value', () => {
      mod.setDisplayMode('info');
      expect(mod.getDisplayMode()).toBe('info');
    });

    it('ignores invalid modes', () => {
      mod.setDisplayMode('invalid');
      expect(mod.getDisplayMode()).toBe('lyrics');
    });
  });

  describe('backend', () => {
    it('defaults to auto', () => {
      expect(mod.getBackend()).toBe('auto');
    });

    it('setBackend updates value', () => {
      mod.setBackend('native');
      expect(mod.getBackend()).toBe('native');
    });

    it('ignores invalid backends', () => {
      mod.setBackend('invalid');
      expect(mod.getBackend()).toBe('auto');
    });
  });

  describe('emoji', () => {
    it('defaults to musical_note', () => {
      expect(mod.getStatusEmoji()).toBe('musical_note');
    });

    it('setStatusEmoji updates value', () => {
      mod.setStatusEmoji('star');
      expect(mod.getStatusEmoji()).toBe('star');
    });
  });

  describe('prefix', () => {
    it('defaults to 🎵', () => {
      expect(mod.getPrefix()).toBe('🎵 ');
    });

    it('setPrefix updates value', () => {
      mod.setPrefix('>> ');
      expect(mod.getPrefix()).toBe('>> ');
    });
  });

  describe('filtered words', () => {
    it('defaults to empty array', () => {
      expect(mod.getFilteredWords()).toEqual([]);
    });

    it('addFilteredWord adds and deduplicates', () => {
      mod.addFilteredWord('bad');
      mod.addFilteredWord('bad');
      expect(mod.getFilteredWords()).toEqual(['bad']);
    });

    it('removeFilteredWord removes', () => {
      mod.addFilteredWord('bad');
      mod.removeFilteredWord('bad');
      expect(mod.getFilteredWords()).toEqual([]);
    });
  });

  describe('cooldown', () => {
    it('defaults to 1500', () => {
      expect(mod.getCooldownMs()).toBe(1500);
    });

    it('setCooldownMs clamps to valid range', () => {
      mod.setCooldownMs(100);
      expect(mod.getCooldownMs()).toBe(1500);
      mod.setCooldownMs(35000);
      expect(mod.getCooldownMs()).toBe(1500);
      mod.setCooldownMs(3000);
      expect(mod.getCooldownMs()).toBe(3000);
    });
  });

  describe('blacklist', () => {
    it('defaults to empty array', () => {
      expect(mod.getBlacklist()).toEqual([]);
    });

    it('addToBlacklist adds and deduplicates', () => {
      mod.addToBlacklist('artist');
      mod.addToBlacklist('artist');
      expect(mod.getBlacklist()).toEqual(['artist']);
    });
  });

  describe('progress style', () => {
    it('defaults to blocks', () => {
      expect(mod.getProgressStyle()).toBe('blocks');
    });

    it('setProgressStyle updates', () => {
      mod.setProgressStyle('squares');
      expect(mod.getProgressStyle()).toBe('squares');
    });
  });

  describe('broadcast webhook', () => {
    it('defaults to empty string', () => {
      expect(mod.getBroadcastWebhook()).toBe('');
    });

    it('setBroadcastWebhook updates', () => {
      mod.setBroadcastWebhook('https://hook.example.com');
      expect(mod.getBroadcastWebhook()).toBe('https://hook.example.com');
    });

    it('clearBroadcastWebhook resets', () => {
      mod.setBroadcastWebhook('https://hook.example.com');
      mod.clearBroadcastWebhook();
      expect(mod.getBroadcastWebhook()).toBe('');
    });
  });

  describe('status format', () => {
    it('returns null by default', () => {
      expect(mod.getStatusFormat()).toBeNull();
    });

    it('setStatusFormat stores global format', () => {
      mod.setStatusFormat('{prefix}{title}');
      expect(mod.getStatusFormat()).toBe('{prefix}{title}');
    });

    it('setStatusFormat with mode stores per-mode', () => {
      mod.setStatusFormat('🎵 {title}', 'info');
      expect(mod.getStatusFormat('info')).toBe('🎵 {title}');
    });

    it('per-mode format takes precedence', () => {
      mod.setStatusFormat('global format');
      mod.setStatusFormat('info format', 'info');
      expect(mod.getStatusFormat('info')).toBe('info format');
    });

    it('setStatusFormat(null, mode) clears per-mode', () => {
      mod.setStatusFormat('format', 'info');
      mod.setStatusFormat(null, 'info');
      expect(mod.getStatusFormat('info')).toBeNull();
    });

    it('VALID_FORMAT_VARS is defined', () => {
      expect(mod.VALID_FORMAT_VARS).toContain('{title}');
      expect(mod.VALID_FORMAT_VARS).toContain('{lyrics}');
    });

    it('DEFAULT_FORMATS has all modes', () => {
      expect(mod.DEFAULT_FORMATS.info).toBe('{prefix}{title} — {artist}');
      expect(mod.DEFAULT_FORMATS.lyrics).toBe('{prefix}{lyrics}');
      expect(mod.DEFAULT_FORMATS.progress).toBe('{prefix}{progress} {time}');
      expect(mod.DEFAULT_FORMATS.compact).toBe('{prefix}{progress} {time_cur} {title}');
    });
  });

  describe('live channel', () => {
    it('defaults to null', () => {
      expect(mod.getLiveChannelId()).toBeNull();
      expect(mod.getLiveMessageId()).toBeNull();
    });

    it('setLiveChannelId and setLiveMessageId', () => {
      mod.setLiveChannelId('123');
      mod.setLiveMessageId('456');
      expect(mod.getLiveChannelId()).toBe('123');
      expect(mod.getLiveMessageId()).toBe('456');
    });
  });

  describe('recent tracks', () => {
    it('defaults to empty', () => {
      expect(mod.getRecentTracks()).toEqual([]);
    });

    it('addRecentTrack prepends and caps at 20', () => {
      for (let i = 0; i < 25; i++) {
        mod.addRecentTrack({ trackName: `Song ${i}`, artistName: 'Artist', albumName: '' });
      }
      expect(mod.getRecentTracks()).toHaveLength(20);
      expect(mod.getRecentTracks()[0].trackName).toBe('Song 24');
    });
  });

  describe('lyric offset', () => {
    it('defaults to 0', () => {
      expect(mod.getLyricOffset()).toBe(0);
    });

    it('setLyricOffset clamps to valid range', () => {
      mod.setLyricOffset(-20000);
      expect(mod.getLyricOffset()).toBe(0);
      mod.setLyricOffset(20000);
      expect(mod.getLyricOffset()).toBe(0);
      mod.setLyricOffset(500);
      expect(mod.getLyricOffset()).toBe(500);
    });
  });

  describe('VALID constants', () => {
    it('VALID_MODES has correct values', () => {
      expect(mod.VALID_MODES).toEqual(['lyrics', 'info', 'progress', 'compact']);
    });

    it('VALID_BACKENDS has correct values', () => {
      expect(mod.VALID_BACKENDS).toEqual(['auto', 'api', 'native']);
    });

    it('VALID_PROGRESS_STYLES has correct values', () => {
      expect(mod.VALID_PROGRESS_STYLES).toEqual(['blocks', 'squares']);
    });
  });
});
