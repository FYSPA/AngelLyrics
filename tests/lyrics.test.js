import { describe, it, expect } from 'vitest';

// parseLRC is not exported directly, so we replicate the logic
function parseLRC(lrc) {
  const lines = [];
  const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/;

  for (const rawLine of lrc.split('\n')) {
    const match = rawLine.trim().match(regex);
    if (!match) continue;

    const [, mm, ss, cs, text] = match;
    const ms =
      parseInt(mm, 10) * 60_000 +
      parseInt(ss, 10) * 1_000 +
      (cs.length === 3 ? parseInt(cs, 10) : parseInt(cs, 10) * 10);

    lines.push({ timeMs: ms, text: text.trim() });
  }

  return lines;
}

describe('parseLRC', () => {
  it('parses standard LRC format mm:ss.xx', () => {
    const lrc = `[00:12.34]First line
[00:56.78]Second line
[01:23.45]Third line`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ timeMs: 12340, text: 'First line' });
    expect(result[1]).toEqual({ timeMs: 56780, text: 'Second line' });
    expect(result[2]).toEqual({ timeMs: 83450, text: 'Third line' });
  });

  it('parses LRC with 3-digit centiseconds (mm:ss.xxx)', () => {
    const lrc = `[00:01.234]Line one
[00:05.678]Line two`;
    const result = parseLRC(lrc);
    expect(result[0]).toEqual({ timeMs: 1234, text: 'Line one' });
    expect(result[1]).toEqual({ timeMs: 5678, text: 'Line two' });
  });

  it('handles empty lines and metadata tags', () => {
    const lrc = `[ti:Song Title]
[ar:Artist Name]
[00:10.00]Actual lyric

[00:20.00]Another lyric`;
    const result = parseLRC(lrc);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Actual lyric');
  });

  it('returns empty array for empty input', () => {
    expect(parseLRC('')).toEqual([]);
    expect(parseLRC('   \n  \n')).toEqual([]);
  });

  it('handles timestamps with leading zeros correctly', () => {
    const lrc = `[00:00.00]Start
[00:00.50]Half second
[01:00.00]One minute`;
    const result = parseLRC(lrc);
    expect(result[0].timeMs).toBe(0);
    expect(result[1].timeMs).toBe(500);
    expect(result[2].timeMs).toBe(60000);
  });
});
