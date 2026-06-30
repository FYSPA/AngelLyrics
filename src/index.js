import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getCurrentTrack } from './spotify.js';
import { getLyrics } from './lyrics.js';
import { setCustomStatus, clearCustomStatus, onUnauthorized } from './status.js';
import { LyricScheduler } from './scheduler.js';
import { getToken, clearToken, getDisplayMode, setDisplayMode, CONFIG_DIR } from './config.js';
import { runSetup } from './setup.js';
import { POLL_INTERVAL_MS, SEEK_THRESHOLD_MS, LYRIC_MIN_LENGTH } from './constants.js';

const NOWPLAYING_FILE = join(CONFIG_DIR, 'nowplaying.json');

// ── Estado ────────────────────────────────────────────────────────────────────

let currentTrackId = null;
let currentTrackName = '';
let currentArtistName = '';
let currentAlbumName = '';
let currentDurationMs = 0;
let scheduler = null;
let lastProgressMs = 0;
let lastPollTime = 0;
let displayMode = getDisplayMode();

// ── Cambio de línea de letra ──────────────────────────────────────────────────

async function onLineChange(line) {
  if (displayMode !== 'lyrics') return;

  const rawText = line.text?.trim() || '';
  const text = rawText.length >= LYRIC_MIN_LENGTH ? rawText : (rawText + ' ♪').trim().padEnd(LYRIC_MIN_LENGTH, '♪');

  console.log(`[Letra] ${text}`);
  setCustomStatus(text);
}

// ── Mostrar info de canción (modo info) ──────────────────────────────────────

function showTrackInfo() {
  if (currentTrackName) {
    const text = `🎵 ${currentTrackName} — ${currentArtistName}`;
    console.log(`[Info] ${text}`);
    setCustomStatus(text);
  }
}

// ── Mostrar barra de progreso (modo progress) ────────────────────────────────

function showProgress() {
  if (!currentTrackId || currentDurationMs <= 0) return;

  let progressMs = lastProgressMs;
  if (scheduler) {
    progressMs = scheduler.estimatedProgressMs;
  }

  const pct = Math.min(100, Math.round((progressMs / currentDurationMs) * 100));
  const barWidth = 10;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = '▰'.repeat(filled) + '▱'.repeat(barWidth - filled);
  const text = `🎵 ${bar} ${pct}%`;

  console.log(`[Progreso] ${text}`);
  setCustomStatus(text);
}

// ── Persistir nowplaying ─────────────────────────────────────────────────────

function saveNowplaying() {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const data = {
      trackId: currentTrackId,
      trackName: currentTrackName,
      artistName: currentArtistName,
      albumName: currentAlbumName,
      durationMs: currentDurationMs,
      progressMs: scheduler ? scheduler.estimatedProgressMs : lastProgressMs,
      mode: displayMode,
    };
    writeFileSync(NOWPLAYING_FILE, JSON.stringify(data), 'utf8');
  } catch {}
}

// ── Aplicar modo de visualización ────────────────────────────────────────────

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
        showTrackInfo();
      }
      break;
    case 'info':
      showTrackInfo();
      break;
    case 'progress':
      showProgress();
      break;
  }
  saveNowplaying();
}

// ── Bucle de polling ─────────────────────────────────────────────────────────

async function poll() {
  try {
    const trackFetchedAt = Date.now();
    const track = await getCurrentTrack();

    const now = Date.now();

    // Verificar si el modo cambió desde el bot de control
    const cfgMode = getDisplayMode();
    if (cfgMode !== displayMode) {
      applyDisplayMode(cfgMode);
    }

    // ── Nada reproduciéndose ─────────────────────────────────────────────────
    if (!track || !track.isPlaying) {
      if (currentTrackId !== null) {
        console.log('[Principal] Reproducción pausada o detenida. Limpiando estado.');
        if (scheduler) {
          scheduler.stop();
          scheduler = null;
        }
        currentTrackId = null;
        currentTrackName = '';
        currentArtistName = '';
        currentAlbumName = '';
        currentDurationMs = 0;
        clearCustomStatus();
        saveNowplaying();
      }

      lastPollTime = now;
      return;
    }

    // ── Canción cambiada ─────────────────────────────────────────────────────
    if (track.trackId !== currentTrackId) {
      console.log(`[Principal] Canción cambiada → "${track.trackName}" de ${track.artistName}`);

      currentTrackId = track.trackId;
      currentTrackName = track.trackName;
      currentArtistName = track.artistName;
      currentAlbumName = track.albumName;
      currentDurationMs = track.durationMs;

      if (scheduler) {
        scheduler.stop();
        scheduler = null;
      }

      if (displayMode === 'info') {
        showTrackInfo();
      } else if (displayMode === 'progress') {
        showProgress();
      } else {
        const lyrics = await getLyrics(track.trackId, track.trackName, track.artistName, track.albumName, track.durationMs);

        if (lyrics && lyrics.length > 0) {
          scheduler = new LyricScheduler(lyrics, onLineChange);
          scheduler.start(track.progressMs + (Date.now() - trackFetchedAt));
        } else {
          setCustomStatus(`🎵 ${track.trackName} — ${track.artistName}`);
        }
      }

      saveNowplaying();
    }

    // ── Detección de salto (misma canción) ───────────────────────────────────
    else if (scheduler && displayMode === 'lyrics' && lastPollTime > 0) {
      const elapsed = now - lastPollTime;
      const expectedProgress = lastProgressMs + elapsed;
      const drift = Math.abs(track.progressMs - expectedProgress);

      if (drift > SEEK_THRESHOLD_MS) {
        console.log(
          `[Principal] Salto detectado (desfase ${(drift / 1000).toFixed(1)}s). Resincronizando letras.`
        );
        scheduler.restart(track.progressMs + (Date.now() - trackFetchedAt));
        saveNowplaying();
      }
    }

    // ── Actualizar progreso si estamos en modo progress ──────────────────────
    if (displayMode === 'progress' && currentTrackId) {
      showProgress();
    }

    lastProgressMs = track.progressMs;
    lastPollTime = now;
  } catch (err) {
    console.error('[Principal] Error en polling:', err.message);
  }
}

// ── Punto de entrada ──────────────────────────────────────────────────────────

let pollInterval = null;

async function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  currentTrackId = null;
  if (scheduler) { scheduler.stop(); scheduler = null; }
  displayMode = getDisplayMode();
  await poll();
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
}

async function main() {
  console.log('🎵 Discord Lyrics Status iniciando…');

  if (process.argv.includes('--reset')) {
    console.log('[Config] --reset: borrando token y reabriendo configuración…');
    clearToken();
  }

  onUnauthorized(async () => {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    if (scheduler) { scheduler.stop(); scheduler = null; }
    currentTrackId = null;

    console.log('\n[Config] Token expirado. Abriendo navegador para ingresar uno nuevo…');
    await runSetup();
    console.log('[Config] ✓ Nuevo token guardado. Reanudando seguimiento de música.\n');
    await startPolling();
  });

  if (!getToken()) {
    console.log('[Config] Sin token guardado. Abriendo navegador para configurar…');
    await runSetup();
    console.log('[Config] ✓ Configuración lista. Comenzando a escuchar música.\n');
  } else {
    console.log(`   Token: OK  |  Modo: ${displayMode}  |  Presiona Ctrl+C para detener.\n`);
  }

  await startPolling();
}

process.on('SIGINT', async () => {
  console.log('\n[Principal] Cerrando…');
  if (scheduler) scheduler.stop();
  clearCustomStatus();
  process.exit(0);
});

main();
