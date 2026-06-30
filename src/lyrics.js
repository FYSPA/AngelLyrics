import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from './config.js';
import { LYRIC_CACHE_MAX_AGE_MS } from './constants.js';

const CACHE_FILE = join(CONFIG_DIR, 'lyrics-cache.json');

// ── Caché en disco y memoria ───────────────────────────────────────────────

function loadDiskCache() {
  try {
    if (!existsSync(CACHE_FILE)) return new Map();
    const raw = readFileSync(CACHE_FILE, 'utf8');
    const obj = JSON.parse(raw);

    const map = new Map();
    const cutoff = Date.now() - LYRIC_CACHE_MAX_AGE_MS;
    for (const [key, val] of Object.entries(obj)) {
      if (val && val.fetchedAt && val.fetchedAt < cutoff) continue;
      map.set(key, val ? val.lines : null);
    }
    console.log(`[Letras] Cargadas ${map.size} entradas de caché desde disco`);
    return map;
  } catch (err) {
    console.error(`[Letras] Error cargando caché: ${err.message}`);
    return new Map();
  }
}

/** @type {Map<string, Array<{timeMs: number, text: string}>|null>} */
let cache = loadDiskCache();

function saveDiskCache() {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const obj = {};
    const now = Date.now();
    for (const [key, val] of cache) {
      obj[key] = { lines: val, fetchedAt: now };
    }
    writeFileSync(CACHE_FILE, JSON.stringify(obj), 'utf8');
  } catch (err) {
    console.error(`[Letras] Error guardando caché: ${err.message}`);
  }
}

// ── LRC parser ─────────────────────────────────────────────────────────────

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

// ── Fuente 1: LRCLIB (synced) ──────────────────────────────────────────────

async function fetchLRCLIB(trackName, artistName, albumName, durationMs) {
  const params = new URLSearchParams({ track_name: trackName, artist_name: artistName });
  if (albumName) params.set('album_name', albumName);
  if (durationMs > 0) params.set('duration', Math.round(durationMs / 1000).toString());

  const res = await fetch(`https://lrclib.net/api/get?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LRCLIB HTTP ${res.status}`);

  const data = await res.json();
  if (!data?.syncedLyrics) return null;

  return parseLRC(data.syncedLyrics);
}

// ── Fuente 2: lyrics.ovh (plain, fallback) ─────────────────────────────────

async function fetchLyricsOvh(trackName, artistName) {
  const res = await fetch(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.lyrics) return null;

  // Convertir plain text a líneas sin timestamps para que el scheduler
  // muestre el texto completo como una sola línea "estática"
  const plain = data.lyrics.trim();
  if (!plain) return null;

  console.log(`[Letras] Letra plana obtenida de lyrics.ovh para "${trackName}"`);
  // Devolvemos una línea única con timestamp 0 — el scheduler la mostrará
  return [{ timeMs: 0, text: plain }];
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getLyrics(trackId, trackName, artistName, albumName = '', durationMs = 0) {
  if (cache.has(trackId)) {
    return cache.get(trackId);
  }

  // ── Fuente 1: LRCLIB (synced) ──────────────────────────────────────────
  try {
    const synced = await fetchLRCLIB(trackName, artistName, albumName, durationMs);
    if (synced && synced.length > 0) {
      console.log(`[Letras] Cargadas ${synced.length} líneas sincronizadas (LRCLIB) para "${trackName}"`);
      cache.set(trackId, synced);
      saveDiskCache();
      return synced;
    }
    console.log(`[Letras] LRCLIB sin letras para "${trackName}" — probando fallback…`);
  } catch (err) {
    console.warn(`[Letras] LRCLIB error: ${err.message} — probando fallback…`);
  }

  // ── Fuente 2: lyrics.ovh (plain) ───────────────────────────────────────
  try {
    const plain = await fetchLyricsOvh(trackName, artistName);
    if (plain && plain.length > 0) {
      console.log(`[Letras] Letra plana obtenida de lyrics.ovh para "${trackName}"`);
      cache.set(trackId, plain);
      saveDiskCache();
      return plain;
    }
  } catch (err) {
    console.warn(`[Letras] lyrics.ovh error: ${err.message}`);
  }

  console.log(`[Letras] Ninguna fuente tiene letras para "${trackName}" de ${artistName}`);
  cache.set(trackId, null);
  saveDiskCache();
  return null;
}
