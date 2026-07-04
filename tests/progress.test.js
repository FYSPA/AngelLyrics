import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('estimateProgress', () => {
  let estimateProgress;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    // Import after reset to get fresh module state
    const mod = await import('../src/spotify/progress.js');
    estimateProgress = mod.estimateProgress;
    mod.resetProgressTracking();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the given positionMs on first call', () => {
    const result = estimateProgress('test', 5000, 'Playing', 'track-1', 100000);
    expect(result).toBe(5000);
  });

  it('estimates forward progress when position has not changed', () => {
    estimateProgress('test', 5000, 'Playing', 'track-1', 100000);
    vi.advanceTimersByTime(2000);
    const result = estimateProgress('test', 5000, 'Playing', 'track-1', 100000);
    expect(result).toBeGreaterThanOrEqual(7000);
    expect(result).toBeLessThanOrEqual(7100);
  });

  it('caps at durationMs', () => {
    estimateProgress('test', 99000, 'Playing', 'track-1', 100000);
    vi.advanceTimersByTime(5000);
    const result = estimateProgress('test', 99000, 'Playing', 'track-1', 100000);
    expect(result).toBe(100000);
  });

  it('resets when track changes', () => {
    estimateProgress('test', 5000, 'Playing', 'track-1', 100000);
    vi.advanceTimersByTime(2000);
    const result = estimateProgress('test', 3000, 'Playing', 'track-2', 100000);
    expect(result).toBe(3000);
  });

  it('uses actual position when position changes externally (seek)', () => {
    estimateProgress('test', 5000, 'Playing', 'track-1', 100000);
    vi.advanceTimersByTime(2000);
    // External seek moved position to 30000
    const result = estimateProgress('test', 30000, 'Playing', 'track-1', 100000);
    expect(result).toBe(30000);
  });

  it('does not estimate during paused state', () => {
    estimateProgress('test', 5000, 'Paused', 'track-1', 100000);
    vi.advanceTimersByTime(2000);
    const result = estimateProgress('test', 5000, 'Paused', 'track-1', 100000);
    expect(result).toBe(5000);
  });

  it('handles different sources independently', () => {
    estimateProgress('source-a', 1000, 'Playing', 'track-1', 100000);
    estimateProgress('source-b', 5000, 'Playing', 'track-1', 100000);
    vi.advanceTimersByTime(1000);
    const a = estimateProgress('source-a', 1000, 'Playing', 'track-1', 100000);
    const b = estimateProgress('source-b', 5000, 'Playing', 'track-1', 100000);
    expect(a).toBeGreaterThanOrEqual(2000);
    expect(b).toBeGreaterThanOrEqual(6000);
  });
});

describe('resetProgressTracking', () => {
  it('clears all tracking data', async () => {
    const mod = await import('../src/spotify/progress.js');
    mod.estimateProgress('test', 1000, 'Playing', 'track-1', 100000);
    mod.resetProgressTracking();
    // After reset, first call should return the raw position again
    const result = mod.estimateProgress('test', 999, 'Playing', 'track-2', 100000);
    expect(result).toBe(999);
  });
});
