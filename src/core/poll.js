import { writeFileSync, mkdirSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getCurrentTrack } from '../spotify/index.js';
import { getLyrics } from '../lyrics.js';
import { clearCustomStatus } from '../status.js';
import { LyricScheduler } from './scheduler.js';
import { CONFIG_DIR } from '../config/paths.js';
import { refreshConfig } from '../config/cache.js';
import { getToken } from '../config/tokens.js';
import { getDisplayMode, setDisplayMode, getCooldownMs, getBlacklist, getBroadcastWebhook, getLyricOffset, addRecentTrack, addTrackPlay } from '../config/settings.js';
import { SEEK_THRESHOLD_MS } from '../constants.js';
import { showTrackInfo, showProgress, showCompact, onLineChange, resetBroadcastDedup } from './display.js';
import { resetProgressTracking } from '../spotify/progress.js';

const NOWPLAYING_FILE = join(CONFIG_DIR, 'nowplaying.json');
const RESYNC_FILE = join(CONFIG_DIR, 'resync.json');

let currentTrackId = null;
let currentTrackName = '';
let currentArtistName = '';
let currentAlbumName = '';
let currentDurationMs = 0;
let currentAlbumArtUrl = '';
let currentLyricLine = '';
let currentLyricLines = [];
let currentLyricIndex = -1;
let scheduler = null;
let lastProgressMs = 0;
let lastPollTime = 0;
let lastRawProgressMs = 0;
let lastLoggedRawDelta = -1;
let trackStartTime = 0;
let displayMode = getDisplayMode();
let _polling = false;
let pollInterval = null;
let _schedulerDeferred = false;
let _deferredSince = 0;
let _smtcWasDead = false;
let _smtcWasDeadSince = 0;
let _captureMode = false;
let _captureSince = 0;
let currentSourceApp = '';

function saveNowplaying() {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const data = {
      trackId: currentTrackId,
      trackName: currentTrackName,
      artistName: currentArtistName,
      albumName: currentAlbumName,
      albumArtUrl: currentAlbumArtUrl,
      durationMs: currentDurationMs,
      progressMs: scheduler ? scheduler.estimatedProgressMs : lastProgressMs,
      lastRawProgressMs,
      lastPollTime: Date.now(),
      mode: displayMode,
      lyricLine: currentLyricLine,
      lyricLines: currentLyricLines,
      lyricIndex: currentLyricIndex,
      sourceApp: currentSourceApp,
    };
    writeFileSync(NOWPLAYING_FILE, JSON.stringify(data), 'utf8');
  } catch (err) {
    console.error('[Poll] Error guardando nowplaying.json:', err.message);
  }
}

function applyDisplayMode(newMode) {
  if (newMode === displayMode) return;

  const oldMode = displayMode;
  displayMode = newMode;
  setDisplayMode(newMode);

  console.log(`[Display] Modo cambiado: ${oldMode} → ${newMode}`);

  switch (newMode) {
    case 'lyrics':
      if (scheduler && currentTrackId) {
        const now = Date.now();
        const adjustedProgress = lastProgressMs + (now - lastPollTime);
        scheduler.restart(adjustedProgress);
      } else if (currentTrackId) {
        showTrackInfo(currentTrackName, currentArtistName, currentAlbumName, 'lyrics');
      }
      break;
    case 'info':
      showTrackInfo(currentTrackName, currentArtistName, currentAlbumName, 'info');
      break;
    case 'progress':
      showProgress(
        scheduler ? scheduler.estimatedProgressMs : lastProgressMs,
        currentDurationMs,
        'progress'
      );
      break;
    case 'compact':
      showCompact(
        scheduler ? scheduler.estimatedProgressMs : lastProgressMs,
        currentDurationMs,
        currentTrackName,
        'compact'
      );
      break;
  }
  saveNowplaying();
}

async function poll() {
  if (_polling) return;
  _polling = true;
  try {
    refreshConfig();
    const trackFetchedAt = Date.now();
    const track = await getCurrentTrack();

    const now = Date.now();

    const cfgMode = getDisplayMode();
    if (cfgMode !== displayMode) {
      applyDisplayMode(cfgMode);
    }

    if (!track || !track.isPlaying) {
      if (currentTrackId !== null) {
        console.log('[Principal] Reproducción pausada o detenida. Limpiando estado.');
        if (scheduler) { scheduler.stop(); scheduler = null; }
        currentTrackId = null;
        currentTrackName = '';
        currentArtistName = '';
        currentAlbumName = '';
        currentAlbumArtUrl = '';
        currentDurationMs = 0;
        currentLyricLine = '';
        currentLyricLines = [];
        currentLyricIndex = -1;
        clearCustomStatus();
        saveNowplaying();
      }
      lastPollTime = now;
      return;
    }

    const blacklist = getBlacklist();
    const trackLabel = `${track.trackName} — ${track.artistName}`.toLowerCase();
    const isBlacklisted = blacklist.some(pattern => trackLabel.includes(pattern.toLowerCase()));
    if (isBlacklisted) {
      if (currentTrackId !== null) {
        console.log(`[Principal] Canción en blacklist, ignorando: "${track.trackName}"`);
        if (scheduler) { scheduler.stop(); scheduler = null; }
        currentTrackId = null;
        currentTrackName = '';
        currentArtistName = '';
        currentAlbumName = '';
        currentAlbumArtUrl = '';
        currentDurationMs = 0;
        currentLyricLine = '';
        currentLyricLines = [];
        currentLyricIndex = -1;
        clearCustomStatus();
        saveNowplaying();
      }
      lastPollTime = now;
      return;
    }

    if (track.trackId !== currentTrackId) {
      console.log(`[Principal] Canción cambiada → "${track.trackName}" de ${track.artistName}`);
      resetBroadcastDedup();

      currentTrackId = track.trackId;
      trackStartTime = Date.now();
      currentTrackName = track.trackName;
      currentArtistName = track.artistName;
      currentAlbumName = track.albumName;
      currentAlbumArtUrl = track.albumArtUrl || '';
      currentDurationMs = track.durationMs;
      currentLyricLine = '';
      currentLyricLines = [];
      currentLyricIndex = -1;

      if (scheduler) { scheduler.stop(); scheduler = null; }
      _smtcWasDead = false;
      currentSourceApp = track.sourceApp || '';

      addRecentTrack({ trackName: track.trackName, artistName: track.artistName, albumName: track.albumName });
      addTrackPlay(track.trackId || 'unknown', track.trackName, track.artistName, track.durationMs);

      if (displayMode === 'info') {
        showTrackInfo(currentTrackName, currentArtistName, currentAlbumName, 'info');
      } else if (displayMode === 'progress') {
        showProgress(track.progressMs, currentDurationMs, 'progress', currentTrackName, currentArtistName, currentAlbumName);
      } else if (displayMode === 'compact') {
        showCompact(track.progressMs, currentDurationMs, currentTrackName, 'compact', currentArtistName, currentAlbumName);
      } else {
        lastProgressMs = track.progressMs;
        showProgress(track.progressMs, currentDurationMs, 'lyrics');

        const lyrics = await getLyrics(track.trackId, track.trackName, track.artistName, track.albumName, track.durationMs);
        currentLyricLines = lyrics || [];

        if (lyrics && lyrics.length > 0) {
          const rawAtChange = track.rawProgressMs ?? track.progressMs;
          if (rawAtChange < 500) {
            _schedulerDeferred = true;
            _deferredSince = Date.now();
            console.log('[Principal] SMTC=0, scheduler diferido hasta próximo ciclo');
          } else {
            const adjustedMs = Math.max(0, track.progressMs + getLyricOffset());
            scheduler = new LyricScheduler(lyrics, (line, index) => {
              currentLyricLine = line.text || '';
              currentLyricIndex = index;
              saveNowplaying();
              onLineChange(line, displayMode, currentTrackName, currentArtistName, currentAlbumName);
            });
            scheduler.start(adjustedMs);
          }
        } else {
          lastProgressMs = track.progressMs + (Date.now() - trackFetchedAt);
          showProgress(lastProgressMs, currentDurationMs, 'lyrics');
        }
      }

      saveNowplaying();
    }

    else if (displayMode === 'lyrics' && lastPollTime > 0) {
      if (!scheduler) {
        if (_schedulerDeferred) {
          const rawNow = track.rawProgressMs ?? track.progressMs;
          if (rawNow >= 500) {
            _schedulerDeferred = false;
            console.log(`[Principal] SMTC despertó en ${rawNow}ms, creando scheduler`);
          } else if (Date.now() - _deferredSince > 4000) {
            _schedulerDeferred = false;
            _smtcWasDead = true;
            _smtcWasDeadSince = Date.now();
            console.log(`[Principal] Timeout SMTC, creando scheduler con ${Math.round(track.progressMs)}ms`);
          }
        }
        if (!_schedulerDeferred && currentLyricLines.length > 0) {
          currentLyricIndex = -1;
          const adjustedMs = Math.max(0, track.progressMs + getLyricOffset());
          scheduler = new LyricScheduler(currentLyricLines, (line, index) => {
            currentLyricLine = line.text || '';
            currentLyricIndex = index;
            saveNowplaying();
            onLineChange(line, displayMode, currentTrackName, currentArtistName, currentAlbumName);
          });
          scheduler.start(adjustedMs);
          saveNowplaying();
          showProgress(track.progressMs, currentDurationMs, 'lyrics');
        }
      } else {
        const nowMs = Date.now();
        const rawPos = track.rawProgressMs ?? track.progressMs;

        if (_smtcWasDead) {
          if (rawPos >= 1000) {
            _smtcWasDead = false;
            const restartMs = Math.max(0, track.progressMs + getLyricOffset());
            console.log(`[Principal] SMTC despertó (raw=${rawPos}ms), resync a ${Math.round(restartMs)}ms`);
            scheduler.restart(restartMs);
            saveNowplaying();
          } else if (nowMs - _smtcWasDeadSince > 60000) {
            _smtcWasDead = false;
            console.log('[Principal] SMTC siguió muerto 60s, abandonando flag');
          }
        }

        if (_captureMode) {
          if (rawPos >= 1000) {
            _captureMode = false;
            const restartMs = Math.max(0, track.progressMs + getLyricOffset());
            console.log(`[Principal] Captura: SMTC=${rawPos}ms, scheduler reajustado a ${Math.round(restartMs)}ms`);
            scheduler.restart(restartMs);
            saveNowplaying();
          } else if (nowMs - _captureSince > 30000) {
            _captureMode = false;
            console.log('[Principal] Captura expiró tras 30s sin SMTC válido');
          }
        }

        const elapsed = nowMs - lastPollTime;
        const expectedProgress = lastProgressMs + elapsed;
        const drift = Math.abs(track.progressMs - expectedProgress);
        const rawPosDelta = Math.abs(rawPos - lastRawProgressMs);
        const stalled = rawPosDelta < 500 && elapsed > 1000 && rawPosDelta < elapsed * 0.5;

        if (stalled) {
          if (rawPosDelta !== lastLoggedRawDelta) {
            console.log(`[Principal] Posición SMTC estancada (Δ${rawPosDelta}ms en ${elapsed}ms)`);
            lastLoggedRawDelta = rawPosDelta;
          }
          // Even when stalled, if raw SMTC position changed significantly, resync
          if (rawPos !== lastRawProgressMs && scheduler) {
            const restartMs = Math.max(0, track.progressMs + getLyricOffset());
            const currentPos = scheduler.estimatedProgressMs;
            if (Math.abs(restartMs - currentPos) > 2000) {
              console.log(
                `[Principal] Resincronizando (SMTC actualizado): prog=${Math.round(track.progressMs)}ms sched=${Math.round(currentPos)}ms`
              );
              scheduler.restart(restartMs);
              saveNowplaying();
            }
          }
        } else {
          const restartMs = Math.max(0, track.progressMs + getLyricOffset());
          const currentPos = scheduler.estimatedProgressMs;
          if (drift > SEEK_THRESHOLD_MS || Math.abs(restartMs - currentPos) > 2000) {
            console.log(
              `[Principal] Resincronizando: prog=${Math.round(track.progressMs)}ms sched=${Math.round(currentPos)}ms`
            );
            scheduler.restart(restartMs);
            saveNowplaying();
          }
        }
      }
    }

    lastRawProgressMs = track.rawProgressMs ?? track.progressMs;

    if (currentTrackId) {
      try {
        if (existsSync(RESYNC_FILE)) {
          const resync = JSON.parse(readFileSync(RESYNC_FILE, 'utf8'));
          unlinkSync(RESYNC_FILE);
          if (resync.positionMs != null && scheduler) {
            const adjustedMs = Math.max(0, resync.positionMs + getLyricOffset());
            console.log(`[Resync] Posición forzada a ${resync.positionMs}ms (${(resync.positionMs / 1000).toFixed(1)}s)`);
            scheduler.restart(adjustedMs);
            saveNowplaying();
          } else if (resync.relativeMs != null && scheduler) {
            const currentPos = scheduler.estimatedProgressMs;
            const adjustedMs = Math.max(0, currentPos + resync.relativeMs + getLyricOffset());
            console.log(`[Resync] Ajuste relativo: ${resync.relativeMs >= 0 ? '+' : ''}${resync.relativeMs}ms → ${Math.round(adjustedMs / 1000)}s`);
            scheduler.restart(adjustedMs);
            saveNowplaying();
          } else if (resync.force && scheduler) {
            const restartMs = Math.max(0, track.progressMs + getLyricOffset());
            console.log(`[Resync] Forzado desde backend: ${Math.round(track.progressMs)}ms`);
            scheduler.restart(restartMs);
            saveNowplaying();
          } else if (resync.capture) {
            _captureMode = true;
            _captureSince = Date.now();
            console.log('[Resync] Modo captura activado');
          }
        }
      } catch (err) {
        console.error('[Resync] Error procesando:', err.message);
      }

      const pMs = scheduler ? scheduler.estimatedProgressMs : lastProgressMs;
      if (displayMode === 'progress') {
        showProgress(pMs, currentDurationMs, 'progress');
      } else if (displayMode === 'compact') {
        showCompact(pMs, currentDurationMs, currentTrackName, 'compact');
      } else if (displayMode === 'lyrics' && !scheduler) {
        showProgress(pMs, currentDurationMs, 'lyrics');
      }
    }

    lastProgressMs = scheduler ? scheduler.estimatedProgressMs : track.progressMs;
    lastPollTime = Date.now();
  } catch (err) {
    console.error('[Principal] Error en polling:', err.message);
  } finally {
    _polling = false;
  }
}

export function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  if (scheduler) { scheduler.stop(); scheduler = null; }
  currentTrackId = null;
  currentTrackName = '';
  currentArtistName = '';
  currentAlbumName = '';
  currentAlbumArtUrl = '';
  currentDurationMs = 0;
  currentLyricLine = '';
  currentLyricLines = [];
  currentLyricIndex = -1;
}

export function getLyricLines() { return currentLyricLines; }

export function getLyricIndex() { return currentLyricIndex; }

export function getSchedulerProgress() {
  return scheduler ? scheduler.estimatedProgressMs : 0;
}

export function getTrackInfo() {
  return {
    trackId: currentTrackId,
    trackName: currentTrackName,
    artistName: currentArtistName,
    albumName: currentAlbumName,
    durationMs: currentDurationMs,
    albumArtUrl: currentAlbumArtUrl,
    lyricLine: currentLyricLine,
    lyricIndex: currentLyricIndex,
    lyricLines: currentLyricLines,
    progressMs: scheduler ? scheduler.estimatedProgressMs : lastProgressMs,
    lastRawProgressMs,
    lastPollTime,
    sourceApp: currentSourceApp,
  };
}

export async function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  currentTrackId = null;
  if (scheduler) { scheduler.stop(); scheduler = null; }
  displayMode = getDisplayMode();
  await poll();
  const interval = getCooldownMs();
  pollInterval = setInterval(poll, interval);
  console.log(`[Principal] Polling cada ${interval}ms`);
}
