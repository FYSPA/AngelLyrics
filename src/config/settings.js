import { readConfig, writeConfig } from './cache.js';

// ── Modos de visualización ────────────────────────────────────────────────────

export const VALID_MODES = ['lyrics', 'info', 'progress', 'compact'];

export function getDisplayMode() {
  return readConfig().displayMode || 'lyrics';
}

export function setDisplayMode(mode) {
  if (!VALID_MODES.includes(mode)) return;
  const updated = readConfig();
  updated.displayMode = mode;
  writeConfig(updated);
  console.log(`[Config] Modo de visualización cambiado a: ${mode}`);
}

// ── Backend (plataforma de detección) ─────────────────────────────────────────

export const VALID_BACKENDS = ['auto', 'api', 'native'];

export function getBackend() {
  const val = readConfig().backend;
  return VALID_BACKENDS.includes(val) ? val : 'auto';
}

export function setBackend(backend) {
  if (!VALID_BACKENDS.includes(backend)) return;
  const updated = readConfig();
  updated.backend = backend;
  writeConfig(updated);
  console.log(`[Config] Backend cambiado a: ${backend}`);
}

// ── Emoji del estado ─────────────────────────────────────────────────────────

export const VALID_EMOJIS = ['musical_note', 'musical_score', 'microphone', 'guitar', 'headphones', 'radio', 'star', 'none'];

export function getStatusEmoji() {
  return readConfig().statusEmoji || 'musical_note';
}

export function setStatusEmoji(emoji) {
  if (!VALID_EMOJIS.includes(emoji)) return;
  const updated = readConfig();
  updated.statusEmoji = emoji;
  writeConfig(updated);
  console.log(`[Config] Emoji cambiado a: ${emoji}`);
}

// ── Prefijo del texto ────────────────────────────────────────────────────────

export function getPrefix() {
  return readConfig().prefix ?? '🎵 ';
}

export function setPrefix(prefix) {
  const updated = readConfig();
  updated.prefix = prefix;
  writeConfig(updated);
  console.log(`[Config] Prefijo cambiado a: "${prefix}"`);
}

// ── Palabras filtradas ────────────────────────────────────────────────────────

export function getFilteredWords() {
  return readConfig().filteredWords || [];
}

export function addFilteredWord(word) {
  const list = getFilteredWords();
  if (list.includes(word)) return;
  const updated = readConfig();
  updated.filteredWords = [...list, word];
  writeConfig(updated);
  console.log(`[Config] Palabra filtrada añadida: "${word}"`);
}

export function removeFilteredWord(word) {
  const list = getFilteredWords().filter(w => w !== word);
  const updated = readConfig();
  updated.filteredWords = list;
  writeConfig(updated);
  console.log(`[Config] Palabra filtrada eliminada: "${word}"`);
}

// ── Cooldown (intervalo de polling) ─────────────────────────────────────────

export function getCooldownMs() {
  const val = readConfig().cooldownMs;
  return (val && val >= 500 && val <= 30000) ? val : 1500;
}

export function setCooldownMs(ms) {
  const n = Number(ms);
  if (isNaN(n) || n < 500 || n > 30000) return;
  const updated = readConfig();
  updated.cooldownMs = n;
  writeConfig(updated);
  console.log(`[Config] Cooldown cambiado a: ${n}ms`);
}

// ── Blacklist ────────────────────────────────────────────────────────────────

export function getBlacklist() {
  return readConfig().blacklist || [];
}

export function addToBlacklist(pattern) {
  const list = getBlacklist();
  if (list.includes(pattern)) return;
  const updated = readConfig();
  updated.blacklist = [...list, pattern];
  writeConfig(updated);
  console.log(`[Config] Blacklist añadido: "${pattern}"`);
}

export function removeFromBlacklist(pattern) {
  const list = getBlacklist().filter(p => p !== pattern);
  const updated = readConfig();
  updated.blacklist = list;
  writeConfig(updated);
  console.log(`[Config] Blacklist eliminado: "${pattern}"`);
}

// ── Estilo de barra de progreso ──────────────────────────────────────────────

export const VALID_PROGRESS_STYLES = ['blocks', 'squares'];

export function getProgressStyle() {
  const val = readConfig().progressStyle;
  return VALID_PROGRESS_STYLES.includes(val) ? val : 'blocks';
}

export function setProgressStyle(style) {
  if (!VALID_PROGRESS_STYLES.includes(style)) return;
  const updated = readConfig();
  updated.progressStyle = style;
  writeConfig(updated);
  console.log(`[Config] Estilo de progreso cambiado a: ${style}`);
}

// ── UI Theme ─────────────────────────────────────────────────────────────────

export function getUiTheme() {
  const val = readConfig().uiTheme;
  return val === 'classic' || val === 'cyberpunk' || val === 'minimal' || val === 'retro' || val === 'gradient' ? val : 'classic';
}

export function setUiTheme(theme) {
  if (!['classic', 'cyberpunk', 'minimal', 'retro', 'gradient'].includes(theme)) return;
  const updated = readConfig();
  updated.uiTheme = theme;
  writeConfig(updated);
  console.log(`[Config] UI theme cambiado a: ${theme}`);
}

// ── Broadcast webhook ────────────────────────────────────────────────────────

export function getBroadcastWebhook() {
  return readConfig().broadcastWebhook || '';
}

export function setBroadcastWebhook(url) {
  const updated = readConfig();
  updated.broadcastWebhook = url;
  writeConfig(updated);
  console.log(`[Config] Webhook de broadcast configurado.`);
}

export function clearBroadcastWebhook() {
  const updated = readConfig();
  updated.broadcastWebhook = '';
  writeConfig(updated);
  console.log(`[Config] Webhook de broadcast eliminado.`);
}

// ── Formato de estado personalizado ──────────────────────────────────────────

export const VALID_FORMAT_VARS = ['{title}', '{artist}', '{album}', '{prefix}', '{emoji}', '{progress}', '{time_cur}', '{time_total}', '{time}', '{lyrics}'];

export const DEFAULT_FORMATS = {
  info: '{prefix}{title} — {artist}',
  progress: '{prefix}{progress} {time}',
  compact: '{prefix}{progress} {time_cur} {title}',
  lyrics: '{prefix}{lyrics}',
};

export function getStatusFormat(mode) {
  const cfg = readConfig();
  if (mode && cfg.statusFormats?.[mode]) {
    return cfg.statusFormats[mode];
  }
  return cfg.statusFormat || null;
}

export function setStatusFormat(format, mode) {
  const updated = readConfig();
  if (mode) {
    if (!updated.statusFormats) updated.statusFormats = {};
    if (format === null || format === undefined) {
      delete updated.statusFormats[mode];
    } else {
      updated.statusFormats[mode] = format;
    }
  } else {
    updated.statusFormat = format || null;
  }
  writeConfig(updated);
  console.log(`[Config] Formato de estado ${format ? 'cambiado' : 'restablecido'}${mode ? ` para modo ${mode}` : ''}`);
}

export function getActiveFormat(mode) {
  return getStatusFormat(mode) || DEFAULT_FORMATS[mode] || null;
}

// ── Live channel ────────────────────────────────────────────────────────────

export function getLiveChannelId() {
  return readConfig().liveChannelId || null;
}

export function setLiveChannelId(channelId) {
  const updated = readConfig();
  updated.liveChannelId = channelId;
  writeConfig(updated);
  console.log(`[Config] Live channel ID guardado: ${channelId}`);
}

export function getLiveMessageId() {
  return readConfig().liveMessageId || null;
}

export function setLiveMessageId(messageId) {
  const updated = readConfig();
  updated.liveMessageId = messageId;
  writeConfig(updated);
}

// ── Historial reciente ──────────────────────────────────────────────────────

export function getRecentTracks() {
  return readConfig().recentTracks || [];
}

export function addRecentTrack(track) {
  const list = getRecentTracks();
  list.unshift({
    trackName: track.trackName,
    artistName: track.artistName,
    albumName: track.albumName || '',
    at: Date.now(),
  });
  if (list.length > 20) list.length = 20;
  const updated = readConfig();
  updated.recentTracks = list;
  writeConfig(updated);
}

// ── Offset de letras (ms) ────────────────────────────────────────────────────

export function getLyricOffset() {
  const val = readConfig().lyricOffset;
  return (typeof val === 'number' && val >= -10000 && val <= 10000) ? val : 0;
}

export function setLyricOffset(ms) {
  const n = Number(ms);
  if (isNaN(n) || n < -10000 || n > 10000) return;
  const updated = readConfig();
  updated.lyricOffset = n;
  writeConfig(updated);
  console.log(`[Config] Offset de letras cambiado a: ${n}ms`);
}
