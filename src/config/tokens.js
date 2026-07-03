import { readConfig, writeConfig } from './cache.js';
import { encryptToken, decryptToken } from './crypto.js';

const TOKEN_KEY = 'userToken';
const SPOTIFY_REFRESH_KEY = 'spotifyRefreshToken';
const SPOTIFY_USER_KEY = 'spotifyUser';

export function getToken() {
  if (process.env.DISCORD_USER_TOKEN) return process.env.DISCORD_USER_TOKEN;
  const stored = readConfig()[TOKEN_KEY];
  if (!stored) return null;
  if (typeof stored === 'object' && stored.e === true) return decryptToken(stored);
  if (typeof stored === 'string') return stored;
  return null;
}

export function saveToken(token) {
  const updated = readConfig();
  updated[TOKEN_KEY] = encryptToken(token);
  writeConfig(updated);
  console.log(`[Config] Token guardado.`);
}

export function clearToken() {
  const updated = readConfig();
  delete updated[TOKEN_KEY];
  writeConfig(updated);
  console.log('[Config] Token eliminado.');
}

export function getSpotifyRefreshToken() {
  return readConfig()[SPOTIFY_REFRESH_KEY] || null;
}

export function getSpotifyUser() {
  return readConfig()[SPOTIFY_USER_KEY] || null;
}

export function saveSpotifyTokens(refreshToken, user) {
  const updated = readConfig();
  updated[SPOTIFY_REFRESH_KEY] = refreshToken;
  updated[SPOTIFY_USER_KEY] = user;
  writeConfig(updated);
  console.log(`[Config] Spotify conectado como: ${user}`);
}

export function clearSpotifyTokens() {
  const updated = readConfig();
  delete updated[SPOTIFY_REFRESH_KEY];
  delete updated[SPOTIFY_USER_KEY];
  writeConfig(updated);
  console.log('[Config] Token de Spotify eliminado.');
}
