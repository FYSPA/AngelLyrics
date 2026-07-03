import { runCommand, makeTrackId } from './utils.js';
import { estimateProgress } from './progress.js';

const _deezerUrlCache = new Map();

async function fetchAlbumArtFromDeezer(trackName, artistName) {
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
  } catch {
    _deezerUrlCache.set(key, '');
    return '';
  }
}

async function listDbusServices() {
  const raw = await runCommand('dbus-send', [
    '--session', '--print-reply',
    '--dest=org.freedesktop.DBus',
    '/org/freedesktop/DBus',
    'org.freedesktop.DBus.ListNames',
  ]);
  if (!raw) return [];
  const names = [...raw.matchAll(/string "([^"]+)"/g)].map((m) => m[1]);
  return names.filter((n) => n.startsWith('org.mpris.MediaPlayer2.'));
}

async function getPlayerProperties(serviceName) {
  return runCommand('dbus-send', [
    '--session', '--print-reply',
    `--dest=${serviceName}`,
    '/org/mpris/MediaPlayer2',
    'org.freedesktop.DBus.Properties.GetAll',
    'string:org.mpris.MediaPlayer2.Player',
  ]);
}

function extractString(output, field) {
  const m = output.match(
    new RegExp(`string "${field}"[\\s\\S]*?variant[\\s\\S]*?string "([^"]*)"`, 'm')
  );
  return m ? m[1] : '';
}

function extractNumber(output, field) {
  const m = output.match(
    new RegExp(`string "${field}"[\\s\\S]*?variant[\\s\\S]*?(?:int64|uint64|double)\\s+([\\d.]+)`, 'm')
  );
  return m ? Number(m[1]) : 0;
}

function toHttpArtUrl(url) {
  if (!url) return '';
  if (url.startsWith('spotify:image:'))
    return 'https://i.scdn.co/image/' + url.slice('spotify:image:'.length);
  if (url.startsWith('http://') || url.startsWith('https://'))
    return url;
  return '';
}

function parseDbusOutput(raw) {
  const playbackStatus = extractString(raw, 'PlaybackStatus');
  const title = extractString(raw, 'xesam:title');
  const album = extractString(raw, 'xesam:album');
  const url = extractString(raw, 'xesam:url');
  const artUrl = extractString(raw, 'mpris:artUrl');
  const artistM = raw.match(
    /string "xesam:artist"[\s\S]*?array \[\s*string "([^"]*)"/m
  );
  const artist = artistM ? artistM[1] : '';
  const positionUs = extractNumber(raw, 'Position');
  const lengthUs = extractNumber(raw, 'mpris:length');
  return {
    playbackStatus, title, artist, album, url, artUrl,
    positionMs: Math.round(positionUs / 1000),
    durationMs: Math.round(lengthUs / 1000),
  };
}

export async function getCurrentTrackLinux() {
  const services = await listDbusServices();
  if (services.length === 0) return null;

  for (const name of services) {
    const raw = await getPlayerProperties(name);
    if (!raw) continue;
    const data = parseDbusOutput(raw);
    if (!data.title) continue;

    const trackId = makeTrackId(data.title, data.artist);
    let albumArtUrl = toHttpArtUrl(data.artUrl);
    if (!albumArtUrl) {
      albumArtUrl = await fetchAlbumArtFromDeezer(data.title, data.artist);
    }
    return {
      isPlaying: data.playbackStatus === 'Playing',
      trackId,
      trackName: data.title,
      artistName: data.artist,
      albumName: data.album,
      progressMs: estimateProgress(name, data.positionMs, data.playbackStatus, trackId, data.durationMs),
      durationMs: data.durationMs,
      albumArtUrl,
    };
  }

  return null;
}
