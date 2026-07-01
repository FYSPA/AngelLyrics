import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { homedir, hostname } from 'os';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const APP_NAME = 'AngelLyrics';
const ALGORITHM = 'aes-256-gcm';

export const CONFIG_DIR = join(
  process.env.APPDATA || join(homedir(), '.config'),
  APP_NAME
);

const OLD_CONFIG_DIR = join(
  process.env.APPDATA || join(homedir(), '.config'),
  'discord-lyrics-status'
);

const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const OLD_CONFIG_FILE = join(OLD_CONFIG_DIR, 'config.json');

function deriveKey() {
  return createHash('sha256').update(hostname() + '::' + APP_NAME).digest();
}

function encryptToken(plaintext) {
  const key = deriveKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    e: true,
    iv: iv.toString('hex'),
    t: cipher.getAuthTag().toString('hex'),
    d: encrypted,
  };
}

function decryptToken(stored) {
  try {
    if (typeof stored === 'object' && stored.e === true) {
      const key = deriveKey();
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(stored.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(stored.t, 'hex'));
      let decrypted = decipher.update(stored.d, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    if (typeof stored === 'string') return stored;
  } catch {}
  return null;
}

function migrateOldConfig() {
  try {
    if (existsSync(OLD_CONFIG_FILE) && !existsSync(CONFIG_FILE)) {
      console.log(`[Config] Migrando configuración desde ${OLD_CONFIG_DIR}…`);
      mkdirSync(CONFIG_DIR, { recursive: true });
      copyFileSync(OLD_CONFIG_FILE, CONFIG_FILE);
      console.log('[Config] Migración completada.');
    }
  } catch (err) {
    console.error('[Config] Error en migración:', err.message);
  }
}

migrateOldConfig();

/** @type {Record<string, any>|null} */
let _cache = null;

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

export function getToken() {
  if (process.env.DISCORD_USER_TOKEN) return process.env.DISCORD_USER_TOKEN;
  const stored = read().userToken;
  if (!stored) return null;
  if (typeof stored === 'object' && stored.e === true) return decryptToken(stored);
  if (typeof stored === 'string') return stored;
  return null;
}

export function clearToken() {
  try {
    if (existsSync(CONFIG_FILE)) {
      _cache = null;
      const updated = { ...read() };
      delete updated.userToken;
      writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
      _cache = updated;
    }
  } catch {}
  console.log('[Config] Token eliminado.');
}

export function saveToken(token) {
  _cache = null;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), userToken: encryptToken(token) };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Token guardado en ${CONFIG_FILE}`);
}

export function getDisplayMode() {
  return read().displayMode || 'lyrics';
}

export function setDisplayMode(mode) {
  if (!VALID_MODES.includes(mode)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), displayMode: mode };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Modo de visualización cambiado a: ${mode}`);
}

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

// ── Backend (plataforma de detección) ─────────────────────────────────────────

export const VALID_BACKENDS = ['auto', 'api', 'native'];

export function refreshConfig() {
  _cache = null;
}

export function getBackend() {
  const val = read().backend;
  return VALID_BACKENDS.includes(val) ? val : 'auto';
}

export function setBackend(backend) {
  if (!VALID_BACKENDS.includes(backend)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), backend };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Backend cambiado a: ${backend}`);
}

// ── Modo compact ─────────────────────────────────────────────────────────────

export const VALID_MODES = ['lyrics', 'info', 'progress', 'compact'];

// ── Emoji del estado ─────────────────────────────────────────────────────────

export const VALID_EMOJIS = ['musical_note', 'musical_score', 'microphone', 'guitar', 'headphones', 'radio', 'star', 'none'];

export function getStatusEmoji() {
  return read().statusEmoji || 'musical_note';
}

export function setStatusEmoji(emoji) {
  if (!VALID_EMOJIS.includes(emoji)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), statusEmoji: emoji };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Emoji cambiado a: ${emoji}`);
}

// ── Prefijo del texto ────────────────────────────────────────────────────────

export function getPrefix() {
  return read().prefix ?? '🎵 ';
}

export function setPrefix(prefix) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), prefix };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Prefijo cambiado a: "${prefix}"`);
}

// ── Palabras filtradas ────────────────────────────────────────────────────────

export function getFilteredWords() {
  return read().filteredWords || [];
}

export function addFilteredWord(word) {
  const list = getFilteredWords();
  if (list.includes(word)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), filteredWords: [...list, word] };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Palabra filtrada añadida: "${word}"`);
}

export function removeFilteredWord(word) {
  const list = getFilteredWords().filter(w => w !== word);
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), filteredWords: list };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Palabra filtrada eliminada: "${word}"`);
}

// ── Cooldown (intervalo de polling) ─────────────────────────────────────────

export function getCooldownMs() {
  const val = read().cooldownMs;
  return (val && val >= 500 && val <= 30000) ? val : 1500;
}

export function setCooldownMs(ms) {
  const n = Number(ms);
  if (isNaN(n) || n < 500 || n > 30000) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), cooldownMs: n };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Cooldown cambiado a: ${n}ms`);
}

// ── Blacklist ────────────────────────────────────────────────────────────────

export function getBlacklist() {
  return read().blacklist || [];
}

export function addToBlacklist(pattern) {
  const list = getBlacklist();
  if (list.includes(pattern)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), blacklist: [...list, pattern] };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Blacklist añadido: "${pattern}"`);
}

export function removeFromBlacklist(pattern) {
  const list = getBlacklist().filter(p => p !== pattern);
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), blacklist: list };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Blacklist eliminado: "${pattern}"`);
}

// ── Estilo de barra de progreso ──────────────────────────────────────────────

export const VALID_PROGRESS_STYLES = ['blocks', 'squares'];

export function getProgressStyle() {
  const val = read().progressStyle;
  return VALID_PROGRESS_STYLES.includes(val) ? val : 'blocks';
}

export function setProgressStyle(style) {
  if (!VALID_PROGRESS_STYLES.includes(style)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), progressStyle: style };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Estilo de progreso cambiado a: ${style}`);
}

// ── Broadcast webhook ────────────────────────────────────────────────────────

export function getBroadcastWebhook() {
  return read().broadcastWebhook || '';
}

export function setBroadcastWebhook(url) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), broadcastWebhook: url };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Webhook de broadcast configurado.`);
}

export function clearBroadcastWebhook() {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const updated = { ...read(), broadcastWebhook: '' };
  _cache = updated;
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`[Config] Webhook de broadcast eliminado.`);
}
