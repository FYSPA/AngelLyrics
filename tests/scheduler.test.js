import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LyricScheduler } from '../src/core/scheduler.js';

describe('LyricScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onLineChange with the correct line at start', () => {
    const lyrics = [
      { timeMs: 0, text: 'Start' },
      { timeMs: 5000, text: 'Middle' },
      { timeMs: 10000, text: 'End' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    // Start at 0ms progress - should call with first line
    scheduler.start(0);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 0, text: 'Start' }, 0);
    scheduler.stop();
  });

  it('starts at the correct index when progressMs is in the middle', () => {
    const lyrics = [
      { timeMs: 0, text: 'Intro' },
      { timeMs: 3000, text: 'Verse' },
      { timeMs: 6000, text: 'Chorus' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    // Start at 4000ms - should show Verse (timeMs 3000 is the last <= 4000)
    scheduler.start(4000);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 3000, text: 'Verse' }, 1);
    scheduler.stop();
  });

  it('does not call onChange if line has not changed', () => {
    const lyrics = [
      { timeMs: 0, text: 'Only line' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    scheduler.start(0);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Advance 1 second - still on same line
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('advances to next line when time passes', () => {
    const lyrics = [
      { timeMs: 0, text: 'Line 1' },
      { timeMs: 2000, text: 'Line 2' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    scheduler.start(0);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 0, text: 'Line 1' }, 0);

    // Advance past 2000ms
    vi.advanceTimersByTime(2500);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 2000, text: 'Line 2' }, 1);
    scheduler.stop();
  });

  it('calls onChange immediately, not just on interval tick', () => {
    const lyrics = [
      { timeMs: 0, text: 'Immediate' },
      { timeMs: 3000, text: 'Later' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    // Should fire immediately on start
    scheduler.start(0);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Even without advancing timers, the first line should be shown
    expect(onChange).toHaveBeenCalledWith({ timeMs: 0, text: 'Immediate' }, 0);
    scheduler.stop();
  });

  it('restarts correctly from a new position', () => {
    const lyrics = [
      { timeMs: 0, text: 'Start' },
      { timeMs: 5000, text: 'Middle' },
      { timeMs: 10000, text: 'End' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    // Start at 0
    scheduler.start(0);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 0, text: 'Start' }, 0);

    // Restart at 6000ms
    scheduler.restart(6000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 5000, text: 'Middle' }, 1);
    scheduler.stop();
  });

  it('does nothing with empty lyrics array', () => {
    const onChange = vi.fn();
    const scheduler = new LyricScheduler([], onChange);
    scheduler.start(0);
    expect(onChange).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('returns estimated progress via getter', () => {
    const lyrics = [{ timeMs: 0, text: 'Test' }];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    const now = Date.now();
    scheduler.start(5000);

    // estimatedProgressMs should be startProgressMs + elapsed
    expect(scheduler.estimatedProgressMs).toBeGreaterThanOrEqual(5000);

    vi.advanceTimersByTime(1000);
    expect(scheduler.estimatedProgressMs).toBeGreaterThanOrEqual(6000);
    scheduler.stop();
  });

  it('handles multiple line transitions correctly', () => {
    const lyrics = [
      { timeMs: 0, text: 'A' },
      { timeMs: 1000, text: 'B' },
      { timeMs: 2000, text: 'C' },
      { timeMs: 3000, text: 'D' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    scheduler.start(0);

    vi.advanceTimersByTime(1100);
    expect(onChange).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 3000, text: 'D' }, 3);
    scheduler.stop();
  });

  it('skips lines when advancing far ahead', () => {
    const lyrics = [
      { timeMs: 0, text: 'A' },
      { timeMs: 5000, text: 'B' },
      { timeMs: 10000, text: 'C' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    // Start at 12000 - should jump directly to C
    scheduler.start(12000);
    expect(onChange).toHaveBeenCalledWith({ timeMs: 10000, text: 'C' }, 2);
    scheduler.stop();
  });

  it('stops the interval on stop()', () => {
    const lyrics = [
      { timeMs: 0, text: 'A' },
      { timeMs: 1000, text: 'B' },
    ];
    const onChange = vi.fn();
    const scheduler = new LyricScheduler(lyrics, onChange);

    scheduler.start(0);
    scheduler.stop();

    vi.advanceTimersByTime(5000);
    // onChange should still have been called only once (from start)
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
