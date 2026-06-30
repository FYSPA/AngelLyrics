import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const CONFIG_DIR = join(
  process.env.APPDATA || join(homedir(), '.config'),
  'discord-lyrics-status'
);
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/** @type {Record<string, any>|null} */
let _cache = null;

/**
 * Lee la configuración desde el archivo en disco (con caché en memoria).
 * @returns {Record<string, any>}
 */
function read() {
  if (_cache) return _cache;
  try {
    if (existsSync(CONFIG_FILE)) {
      _cache = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
      return _cache;
    }
  } catch {}
  return {};
}

/**
 * Devuelve el token de usuario de Discord.
 * Prioridad: variable de entorno → archivo de configuración.
 * @returns {string|null}
 */
export function getToken() {
  if (process.env.DISCORD_USER_TOKEN) return process.env.DISCORD_USER_TOKEN;
  return read().userToken || null;
}

/** Elimina el token guardado del archivo de configuración. */
export function clearToken() {
  _cache = null;
  try {
    if (existsSync(CONFIG_FILE)) {
      const updated = { ...read() };
      delete updated.userToken;
      writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
    }
  } catch {}
  console.log('[Config] Token eliminado.');
}

/**
 * Guarda un nuevo token en el archivo de configuración.
 * @param {string} token
 */
export function saveToken(token) {
  _cache = null;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), userToken: token };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Token guardado en ${CONFIG_FILE}`);
}

/**
 * Devuelve el modo de visualización actual.
 * @returns {'lyrics'|'info'|'progress'}
 */
export function getDisplayMode() {
  return read().displayMode || 'lyrics';
}

/**
 * Cambia el modo de visualización y lo persiste.
 * @param {'lyrics'|'info'|'progress'} mode
 */
export function setDisplayMode(mode) {
  const validModes = ['lyrics', 'info', 'progress'];
  if (!validModes.includes(mode)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), displayMode: mode };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Modo de visualización cambiado a: ${mode}`);
}

// ── Spotify API (opcional) ─────────────────────────────────────────────────

export function getSpotifyRefreshToken() {
  return read().spotifyRefreshToken || null;
}

export function getSpotifyUser() {
  return read().spotifyUser || null;
}

export function saveSpotifyTokens(refreshToken, user) {
  _cache = null;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), spotifyRefreshToken: refreshToken, spotifyUser: user };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Spotify conectado como: ${user}`);
}

export function clearSpotifyTokens() {
  _cache = null;
  try {
    if (existsSync(CONFIG_FILE)) {
      const updated = { ...read() };
      delete updated.spotifyRefreshToken;
      delete updated.spotifyUser;
      writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
    }
  } catch {}
  console.log('[Config] Token de Spotify eliminado.');
}

// ── Live Channel (Now Playing persistente) ─────────────────────────────────

export function getLiveChannelId() {
  return read().liveChannelId || null;
}

export function setLiveChannelId(channelId) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), liveChannelId: channelId };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Live channel ID guardado: ${channelId}`);
}

export function getLiveMessageId() {
  return read().liveMessageId || null;
}

export function setLiveMessageId(messageId) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), liveMessageId: messageId };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
}
