import { spawn } from 'child_process';

const _deezerUrlCache = new Map();

export function makeTrackId(title, artist) {
  return `${title}::${artist}`.toLowerCase().replace(/\s+/g, '-');
}

export function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (d) => (stdout += d));
    proc.on('close', (code) => resolve(code === 0 ? stdout : null));
    proc.on('error', () => resolve(null));
  });
}

export async function fetchAlbumArtFromDeezer(trackName, artistName) {
  const key = `${trackName}::${artistName}`.toLowerCase();
  if (_deezerUrlCache.has(key)) return _deezerUrlCache.get(key);

  try {
    const q = encodeURIComponent(`artist:"${artistName}" track:"${trackName}"`);
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
    if (!res.ok) { _deezerUrlCache.set(key, ''); return ''; }
    const data = await res.json();
    const url = data?.data?.[0]?.album?.cover_medium || '';
    _deezerUrlCache.set(key, url);
    return url;
  } catch (err) {
    console.warn('[Deezer] Error buscando album art:', err.message);
    _deezerUrlCache.set(key, '');
    return '';
  }
}

export function clearDeezerCache() {
  _deezerUrlCache.clear();
}
