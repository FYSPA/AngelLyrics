import { getPrefix, getStatusEmoji, getFilteredWords, getProgressStyle, getStatusFormat, getBroadcastWebhook } from '../config/settings.js';
import { setCustomStatus } from '../status.js';
import { LYRIC_MIN_LENGTH } from '../constants.js';

export function formatStatusText(template, data) {
  if (!template) return '';
  let result = template;
  result = result.replace(/{title}/g, data.title || '');
  result = result.replace(/{artist}/g, data.artist || '');
  result = result.replace(/{album}/g, data.album || '');
  result = result.replace(/{prefix}/g, data.prefix || '');
  result = result.replace(/{emoji}/g, data.emoji || '');
  result = result.replace(/{progress}/g, data.progress || '');
  result = result.replace(/{time_cur}/g, data.timeCur || '');
  result = result.replace(/{time_total}/g, data.timeTotal || '');
  result = result.replace(/{time}/g, data.time || '');
  result = result.replace(/{lyrics}/g, data.lyrics || '');
  return result;
}

export function applyFilters(text) {
  const words = getFilteredWords();
  if (!words.length) return text;
  let filtered = text;
  for (const word of words) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    filtered = filtered.replace(re, '***');
  }
  return filtered;
}

export function formatTime(ms) {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function makeProgressBar(filled, total) {
  const style = getProgressStyle();
  if (style === 'squares') {
    return '🟩'.repeat(filled) + '⬛'.repeat(total - filled);
  }
  return '▰'.repeat(filled) + '▱'.repeat(total - filled);
}

export function showTrackInfo(trackName, artistName, albumName, mode) {
  if (!trackName) return;
  const prefix = getPrefix();
  const emoji = getStatusEmoji();
  const emojiStr = emoji === 'none' ? '' : emoji;
  const custom = getStatusFormat(mode);
  const text = custom
    ? formatStatusText(custom, { title: trackName, artist: artistName, album: albumName || '', prefix, emoji: emojiStr, progress: '', timeCur: '', timeTotal: '', time: '', lyrics: '' })
    : `${prefix}${trackName} — ${artistName}`;
  console.log(`[Info] ${text}`);
  setCustomStatus(text, emojiStr);
}

export function showProgress(progressMs, durationMs, mode) {
  if (!progressMs || durationMs <= 0) return;

  const pct = Math.min(100, Math.round((progressMs / durationMs) * 100));
  const barWidth = 10;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = makeProgressBar(filled, barWidth);
  const timeCur = formatTime(progressMs);
  const timeTotal = formatTime(durationMs);
  const time = `${timeCur} / ${timeTotal}`;
  const prefix = getPrefix();
  const emoji = getStatusEmoji();
  const emojiStr = emoji === 'none' ? '' : emoji;
  const custom = getStatusFormat(mode);

  const text = custom
    ? formatStatusText(custom, { title: '', artist: '', album: '', prefix, emoji: emojiStr, progress: bar, timeCur, timeTotal, time, lyrics: '' })
    : `${prefix}${bar} ${time}`;

  console.log(`[Progreso] ${text}`);
  setCustomStatus(text, emojiStr);
}

export function showCompact(progressMs, durationMs, trackName, mode) {
  if (!progressMs || durationMs <= 0) return;

  const pct = Math.min(100, Math.round((progressMs / durationMs) * 100));
  const barWidth = 6;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = makeProgressBar(filled, barWidth);
  const timeCur = formatTime(progressMs);
  const prefix = getPrefix();
  const emoji = getStatusEmoji();
  const emojiStr = emoji === 'none' ? '' : emoji;
  const custom = getStatusFormat(mode);

  const raw = custom
    ? formatStatusText(custom, { title: trackName, artist: '', album: '', prefix, emoji: emojiStr, progress: bar, timeCur, timeTotal: '', time: '', lyrics: '' })
    : `${prefix}${bar} ${timeCur} ${trackName}`;
  const text = raw.slice(0, 128);

  console.log(`[Compacto] ${text}`);
  setCustomStatus(text, emojiStr);
}

export function onLineChange(line, displayMode) {
  if (displayMode !== 'lyrics') return;

  const rawText = line.text?.trim() || '';
  const cleanText = applyFilters(rawText);
  const displayText = cleanText.length >= LYRIC_MIN_LENGTH ? cleanText : (cleanText + ' ♪').trim().padEnd(LYRIC_MIN_LENGTH, '♪');
  const prefix = getPrefix();
  const emoji = getStatusEmoji();
  const emojiStr = emoji === 'none' ? '' : emoji;
  const custom = getStatusFormat(displayMode);

  const text = custom
    ? formatStatusText(custom, { title: '', artist: '', album: '', prefix, emoji: emojiStr, progress: '', timeCur: '', timeTotal: '', time: '', lyrics: displayText })
    : prefix ? `${prefix}${displayText}` : displayText;

  console.log(`[Letra] ${text}`);
  setCustomStatus(text, emojiStr);
  broadcastLine(text);
}

let lastBroadcastLine = '';

export async function broadcastLine(text) {
  const webhook = getBroadcastWebhook();
  if (!webhook || text === lastBroadcastLine) return;
  lastBroadcastLine = text;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
  } catch {}
}
