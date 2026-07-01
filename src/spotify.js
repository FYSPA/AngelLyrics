/**
 * @fileoverview Obtiene la canción actual de Spotify desde el sistema.
 *
 * - Linux:    D-Bus / MPRIS
 * - Windows:  SMTC (PowerShell)
 * - Spotify API (opcional): si hay credenciales configuradas, se intenta
 *   primero la API oficial. Si falla, fallback automático al método gratuito.
 */

import { spawn } from 'child_process';
import { platform } from 'os';
import { POSITION_CLEANUP_MS } from './constants.js';
import { getSpotifyRefreshToken, saveSpotifyTokens, clearSpotifyTokens, getBackend } from './config.js';

const IS_LINUX = platform() === 'linux';
const IS_WINDOWS = platform() === 'win32';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_USE_API = !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);

/** @typedef {{ isPlaying: boolean, trackId: string, trackName: string, artistName: string, albumName: string, progressMs: number, durationMs: number, albumArtUrl: string }} TrackInfo */

function makeTrackId(title, artist) {
  return `${title}::${artist}`.toLowerCase().replace(/\s+/g, '-');
}

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (d) => (stdout += d));
    proc.on('close', (code) => resolve(code === 0 ? stdout : null));
    proc.on('error', () => resolve(null));
  });
}

// ── Position drift compensation ────────────────────────────────────────────

/** @type {Map<string, { positionMs: number, atMs: number, trackId: string }>} */
const lastSeen = new Map();

setInterval(() => {
  const cutoff = Date.now() - POSITION_CLEANUP_MS;
  for (const [key, val] of lastSeen) {
    if (val.atMs < cutoff) lastSeen.delete(key);
  }
}, POSITION_CLEANUP_MS);

function estimateProgress(source, positionMs, playbackStatus, trackId, durationMs) {
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

// ════════════════════════════════════════════════════════════════════════════
// SPOTIFY API (opcional)
// ════════════════════════════════════════════════════════════════════════════

let _spotifyAccessToken = null;
let _spotifyTokenExpires = 0;

async function refreshSpotifyToken() {
  const refreshToken = getSpotifyRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      clearSpotifyTokens();
      return false;
    }

    const data = await res.json();
    _spotifyAccessToken = data.access_token;
    _spotifyTokenExpires = Date.now() + (data.expires_in * 1000);

    if (data.refresh_token) {
      saveSpotifyTokens(data.refresh_token, getSpotifyRefreshToken() || '');
    }

    return true;
  } catch {
    return false;
  }
}

async function ensureSpotifyToken() {
  if (_spotifyAccessToken && Date.now() < _spotifyTokenExpires) return true;
  return refreshSpotifyToken();
}

async function getCurrentTrackSpotify() {
  if (!await ensureSpotifyToken()) return null;

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${_spotifyAccessToken}` },
  });

  // 204 = no track playing, 401/403 = token expired
  if (res.status === 204) return null;
  if (res.status === 401 || res.status === 403) {
    _spotifyAccessToken = null;
    return null; // next poll will refresh
  }
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.item) return null;

  const item = data.item;
  const isPlaying = data.is_playing;
  const trackId = makeTrackId(item.name, item.artists[0]?.name || '');
  const progressMs = estimateProgress(
    'spotify::api', data.progress_ms, isPlaying ? 'Playing' : 'Paused', trackId, item.duration_ms
  );

  return {
    isPlaying,
    trackId,
    trackName: item.name,
    artistName: item.artists[0]?.name || '',
    albumName: item.album?.name || '',
    progressMs,
    durationMs: item.duration_ms || 0,
    albumArtUrl: item.album?.images?.[0]?.url || '',
  };
}

// ════════════════════════════════════════════════════════════════════════════
// LINUX — D-Bus / MPRIS
// ════════════════════════════════════════════════════════════════════════════

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

function parseDbusOutput(raw) {
  const playbackStatus = extractString(raw, 'PlaybackStatus');
  const title = extractString(raw, 'xesam:title');
  const album = extractString(raw, 'xesam:album');
  const url = extractString(raw, 'xesam:url');
  const artistM = raw.match(
    /string "xesam:artist"[\s\S]*?array \[\s*string "([^"]*)"/m
  );
  const artist = artistM ? artistM[1] : '';
  const positionUs = extractNumber(raw, 'Position');
  const lengthUs = extractNumber(raw, 'mpris:length');
  return {
    playbackStatus, title, artist, album, url,
    positionMs: Math.round(positionUs / 1000),
    durationMs: Math.round(lengthUs / 1000),
  };
}

async function getCurrentTrackLinux() {
  const services = await listDbusServices();
  if (services.length === 0) return null;

  for (const name of services) {
    const raw = await getPlayerProperties(name);
    if (!raw) continue;
    const data = parseDbusOutput(raw);
    if (!data.title) continue;

    const trackId = makeTrackId(data.title, data.artist);
    return {
      isPlaying: data.playbackStatus === 'Playing',
      trackId,
      trackName: data.title,
      artistName: data.artist,
      albumName: data.album,
      progressMs: estimateProgress(name, data.positionMs, data.playbackStatus, trackId, data.durationMs),
      durationMs: data.durationMs,
      albumArtUrl: '',
    };
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// WINDOWS — SMTC via PowerShell (one-shot por ciclo)
// ════════════════════════════════════════════════════════════════════════════

const SMTC_SCRIPT = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($Op, $T) { $sp = $asTask.MakeGenericMethod($T); $t = $sp.Invoke($null, @($Op)); $t.Wait(-1) | Out-Null; $t.Result }
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
try {
  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $sessions = $mgr.GetSessions()
  $result = $null
  foreach ($s in $sessions) {
    $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    if (-not $props.Title) { continue }
    $pb = $s.GetPlaybackInfo()
    $tl = $s.GetTimelineProperties()
    $result = @{
      playbackStatus = "$($pb.PlaybackStatus)"
      sourceApp = "$($s.SourceAppUserModelId)"
      title    = "$($props.Title)"
      artist   = "$($props.Artist)"
      album    = "$($props.AlbumTitle)"
      positionMs = [math]::Round($tl.Position.TotalMilliseconds)
      durationMs = [math]::Round($tl.EndTime.TotalMilliseconds)
    }
    break
  }
  if ($result) { ConvertTo-Json $result -Depth 5 -Compress } else { Write-Output 'null' }
} catch { Write-Output 'null' }
`;

async function getCurrentTrackWindows() {
  const raw = await runCommand('powershell', ['-NoProfile', '-NonInteractive', '-Command', SMTC_SCRIPT]);
  if (!raw) return null;
  const lines = raw.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const data = JSON.parse(trimmed);
      if (!data || data === 'null' || !data.title) return null;
      const trackId = makeTrackId(data.title, data.artist);
      return {
        isPlaying: data.playbackStatus === 'Playing',
        trackId,
        trackName: data.title,
        artistName: data.artist,
        albumName: data.album || '',
        progressMs: estimateProgress('windows::smtc', data.positionMs, data.playbackStatus, trackId, data.durationMs),
        durationMs: data.durationMs || 0,
        albumArtUrl: '',
      };
    } catch {}
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// Public API — dispatcher con fallback
// ════════════════════════════════════════════════════════════════════════════

/**
 * Intenta primero la API de Spotify (si configurada), luego cae al método
 * gratuito según la plataforma (D-Bus en Linux, SMTC en Windows).
 * Respeta la configuración de backend guardada por el control bot.
 * @returns {Promise<TrackInfo|null>}
 */
export async function getCurrentTrack() {
  const backend = getBackend();

  if (backend === 'api' || (backend === 'auto' && SPOTIFY_USE_API)) {
    try {
      const result = await getCurrentTrackSpotify();
      if (result !== null) return result;
    } catch (err) {
      console.warn(`[Spotify] API falló: ${err.message} — usando método gratuito.`);
      _spotifyAccessToken = null;
    }
  }

  if (backend === 'api') return null;

  if (IS_LINUX) {
    try {
      return await getCurrentTrackLinux();
    } catch (err) {
      throw new Error(`Error leyendo Spotify (D-Bus/MPRIS): ${err.message}`);
    }
  }

  if (IS_WINDOWS) {
    try {
      return await getCurrentTrackWindows();
    } catch (err) {
      throw new Error(`Error leyendo Spotify (SMTC): ${err.message}`);
    }
  }

  throw new Error(
    `Plataforma no soportada: ${platform()}. ` +
    `Usa Linux (D-Bus/MPRIS) o Windows 10+ (SMTC).`
  );
}

/**
 * @returns {string} URL de autorización de Spotify para OAuth.
 */
export function getSpotifyAuthUrl(redirectUri) {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-currently-playing user-read-playback-state',
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

/**
 * Intercambia un código de autorización por tokens y los guarda.
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function exchangeSpotifyCode(code, redirectUri) {
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Spotify HTTP ${res.status}: ${text}` };
    }

    const data = await res.json();

    // Obtener nombre de usuario
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userRes.json().catch(() => ({}));
    const username = userData.display_name || userData.id || 'Desconocido';

    saveSpotifyTokens(data.refresh_token, username);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
