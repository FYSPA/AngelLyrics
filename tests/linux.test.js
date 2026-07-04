import { describe, it, expect } from 'vitest';

// Test the pure utility functions used by linux.js
// These are internal to the module but we replicate the logic for testing

function extractString(output, field) {
  const m = output.match(
    new RegExp(`string "${field}"[\\s\\S]*?variant[\\s\\S]*?string "([^"]*)"`, 'm')
  );
  return m ? m[1] : '';
}

function extractNumber(output, field) {
  const m = output.match(
    new RegExp(`string "${field}"[\\s\\S]*?variant[\\s\\S]*?(?:int64|uint64|double)\\s+([\\d.]+)`, 'm')
  );
  return m ? Number(m[1]) : 0;
}

function toHttpArtUrl(url) {
  if (!url) return '';
  if (url.startsWith('spotify:image:'))
    return 'https://i.scdn.co/image/' + url.slice('spotify:image:'.length);
  if (url.startsWith('http://') || url.startsWith('https://'))
    return url;
  return '';
}

function parseDbusOutput(raw) {
  const playbackStatus = extractString(raw, 'PlaybackStatus');
  const title = extractString(raw, 'xesam:title');
  const album = extractString(raw, 'xesam:album');
  const artUrl = extractString(raw, 'mpris:artUrl');
  const artistM = raw.match(
    /string "xesam:artist"[\s\S]*?array \[\s*string "([^"]*)"/m
  );
  const artist = artistM ? artistM[1] : '';
  const positionUs = extractNumber(raw, 'Position');
  const lengthUs = extractNumber(raw, 'mpris:length');
  return {
    playbackStatus, title, artist, album, artUrl,
    positionMs: Math.round(positionUs / 1000),
    durationMs: Math.round(lengthUs / 1000),
  };
}

describe('extractString', () => {
  const sample = `string "PlaybackStatus" variant string "Playing"
string "xesam:title" variant string "Bohemian Rhapsody"
string "xesam:album" variant string "A Night at the Opera"
string "mpris:artUrl" variant string "spotify:image:abc123"`;

  it('extracts string fields from D-Bus output', () => {
    expect(extractString(sample, 'PlaybackStatus')).toBe('Playing');
    expect(extractString(sample, 'xesam:title')).toBe('Bohemian Rhapsody');
    expect(extractString(sample, 'xesam:album')).toBe('A Night at the Opera');
    expect(extractString(sample, 'mpris:artUrl')).toBe('spotify:image:abc123');
  });

  it('returns empty string for missing field', () => {
    expect(extractString(sample, 'nonexistent')).toBe('');
  });

  it('handles empty output', () => {
    expect(extractString('', 'field')).toBe('');
  });
});

describe('extractNumber', () => {
  const sample = `string "Position" variant int64 123456789
string "mpris:length" variant int64 200000000`;

  it('extracts int64 numbers', () => {
    expect(extractNumber(sample, 'Position')).toBe(123456789);
    expect(extractNumber(sample, 'mpris:length')).toBe(200000000);
  });

  it('returns 0 for missing field', () => {
    expect(extractNumber(sample, 'nonexistent')).toBe(0);
  });
});

describe('toHttpArtUrl', () => {
  it('converts spotify:image: URIs to HTTPS URLs', () => {
    expect(toHttpArtUrl('spotify:image:abc123def')).toBe('https://i.scdn.co/image/abc123def');
  });

  it('passes through HTTP URLs', () => {
    expect(toHttpArtUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
  });

  it('passes through HTTP (non-S) URLs', () => {
    expect(toHttpArtUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
  });

  it('returns empty for empty input', () => {
    expect(toHttpArtUrl('')).toBe('');
    expect(toHttpArtUrl(null)).toBe('');
    expect(toHttpArtUrl(undefined)).toBe('');
  });

  it('returns empty for unknown URI schemes', () => {
    expect(toHttpArtUrl('unknown://test')).toBe('');
  });
});

describe('parseDbusOutput', () => {
  it('parses full D-Bus metadata output', () => {
    const raw = `string "PlaybackStatus" variant string "Playing"
string "xesam:title" variant string "Test Song"
string "xesam:album" variant string "Test Album"
string "xesam:artist" variant array [
  string "Test Artist"
]
string "mpris:artUrl" variant string "spotify:image:def456"
string "Position" variant int64 120000000
string "mpris:length" variant int64 300000000`;

    const result = parseDbusOutput(raw);
    expect(result.playbackStatus).toBe('Playing');
    expect(result.title).toBe('Test Song');
    expect(result.artist).toBe('Test Artist');
    expect(result.album).toBe('Test Album');
    expect(result.artUrl).toBe('spotify:image:def456');
    expect(result.positionMs).toBe(120000);
    expect(result.durationMs).toBe(300000);
  });

  it('handles missing artist field', () => {
    const raw = `string "PlaybackStatus" variant string "Playing"
string "xesam:title" variant string "No Artist"`;
    const result = parseDbusOutput(raw);
    expect(result.title).toBe('No Artist');
    expect(result.artist).toBe('');
  });

  it('handles empty input', () => {
    const result = parseDbusOutput('');
    expect(result.playbackStatus).toBe('');
    expect(result.title).toBe('');
  });
});
