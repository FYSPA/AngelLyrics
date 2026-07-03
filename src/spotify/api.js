import { getSpotifyRefreshToken, saveSpotifyTokens, clearSpotifyTokens, getBackend } from '../config.js';
import { makeTrackId } from './utils.js';
import { estimateProgress } from './progress.js';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
export const SPOTIFY_USE_API = !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);

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

export async function getCurrentTrackSpotify() {
  if (!await ensureSpotifyToken()) return null;

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${_spotifyAccessToken}` },
  });

  if (res.status === 204) return null;
  if (res.status === 401 || res.status === 403) {
    _spotifyAccessToken = null;
    return null;
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

export function invalidateSpotifyToken() {
  _spotifyAccessToken = null;
}

export function getSpotifyAuthUrl(redirectUri) {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-currently-playing user-read-playback-state',
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

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
