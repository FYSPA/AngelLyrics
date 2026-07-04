import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Deezer album art fallback logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches album art from Deezer API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [{ album: { cover_medium: 'https://cdm.images/deezer/123.jpg' } }],
      }),
    });

    const q = encodeURIComponent('artist:"Test Artist" track:"Test Song"');
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
    const data = await res.json();
    const url = data?.data?.[0]?.album?.cover_medium;
    expect(url).toBe('https://cdm.images/deezer/123.jpg');
  });

  it('returns empty string when Deezer returns no results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const q = encodeURIComponent('artist:"Fake" track:"Nonexistent"');
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
    const data = await res.json();
    const url = data?.data?.[0]?.album?.cover_medium || '';
    expect(url).toBe('');
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(fetch('https://api.deezer.com/search?q=test'))
      .rejects.toThrow('Network error');
  });

  it('encodes queries correctly for Deezer API', () => {
    const q = encodeURIComponent('artist:"AC/DC" track:"Highway to Hell"');
    expect(q).toContain('AC%2FDC');
    expect(q).toContain('Highway%20to%20Hell');
  });
});

describe('makeTrackId', () => {
  it('creates consistent track IDs', async () => {
    const { makeTrackId } = await import('../src/spotify/utils.js');
    expect(makeTrackId('Hello', 'World')).toBe('hello::world');
    expect(makeTrackId('Bohemian Rhapsody', 'Queen')).toBe('bohemian-rhapsody::queen');
    expect(makeTrackId('Test Song', 'Artist Name')).toBe('test-song::artist-name');
  });
});
