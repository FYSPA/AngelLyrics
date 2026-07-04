import { POSITION_CLEANUP_MS } from '../constants.js';

/** @type {Map<string, { positionMs: number, atMs: number, trackId: string }>} */
const lastSeen = new Map();
let cleanupInterval = null;

function ensureCleanupInterval() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - POSITION_CLEANUP_MS;
    for (const [key, val] of lastSeen) {
      if (val.atMs < cutoff) lastSeen.delete(key);
    }
  }, POSITION_CLEANUP_MS);
}

export function resetProgressTracking() {
  lastSeen.clear();
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export function estimateProgress(source, positionMs, playbackStatus, trackId, durationMs) {
  ensureCleanupInterval();
  const now = Date.now();
  const prev = lastSeen.get(source);
  let estimatedMs = positionMs;

  if (
    prev &&
    prev.trackId === trackId &&
    positionMs === prev.positionMs &&
    playbackStatus === 'Playing'
  ) {
    estimatedMs = prev.positionMs + (now - prev.atMs);
  }

  if (durationMs > 0) estimatedMs = Math.min(estimatedMs, durationMs);

  lastSeen.set(source, { positionMs, atMs: now, trackId });
  return Math.round(estimatedMs);
}
