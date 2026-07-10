import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from './config/paths.js';
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

// ── Helper: distribuir letra plana en líneas con timestamp ────────────────

function distributeLyrics(text, durationMs = 0) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;
  if (lines.length === 1) return [{ timeMs: 0, text: lines[0] }];

  const effectiveDuration = durationMs > 0 ? durationMs : 30_000;

  return lines.map((line, i) => ({
    timeMs: Math.round((i / lines.length) * effectiveDuration),
    text: line,
  }));
}

// ── Fuente 2: lyrics.ovh (plain, fallback) ─────────────────────────────────

async function fetchLyricsOvh(trackName, artistName, durationMs = 0) {
  const res = await fetch(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.lyrics) return null;

  const plain = data.lyrics.trim();
  if (!plain) return null;

  console.log(`[Letras] Letra plana obtenida de lyrics.ovh para "${trackName}"`);
  return distributeLyrics(plain, durationMs);
}

// ── Fuente 3: AZLyrics (plain, scraping) ──────────────────────────────────

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^the/, '');
}

async function fetchAZLyrics(trackName, artistName, durationMs = 0) {
  const artistSlug = slugify(artistName);
  const trackSlug = slugify(trackName);
  if (!artistSlug || !trackSlug) return null;

  const url = `https://www.azlyrics.com/lyrics/${artistSlug}/${trackSlug}.html`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) return null;

  const html = await res.text();

  // AZLyrics places lyrics between <!-- start of lyrics --> and <!-- end of lyrics -->
  const startMarker = '<!-- start of lyrics -->';
  const endMarker = '<!-- end of lyrics -->';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) return null;

  const raw = html.slice(startIdx + startMarker.length, endIdx)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  if (!raw) return null;

  console.log(`[Letras] Letra plana obtenida de AZLyrics para "${trackName}"`);
  return distributeLyrics(raw, durationMs);
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
    const plain = await fetchLyricsOvh(trackName, artistName, durationMs);
    if (plain && plain.length > 0) {
      cache.set(trackId, plain);
      saveDiskCache();
      return plain;
    }
  } catch (err) {
    console.warn(`[Letras] lyrics.ovh error: ${err.message}`);
  }

  // ── Fuente 3: AZLyrics (plain, scraping) ──────────────────────────────
  try {
    const az = await fetchAZLyrics(trackName, artistName, durationMs);
    if (az && az.length > 0) {
      cache.set(trackId, az);
      saveDiskCache();
      return az;
    }
  } catch (err) {
    console.warn(`[Letras] AZLyrics error: ${err.message}`);
  }

  console.log(`[Letras] Ninguna fuente tiene letras para "${trackName}" de ${artistName}`);
  cache.set(trackId, null);
  saveDiskCache();
  return null;
}
