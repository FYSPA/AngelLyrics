import { getLiveChannelId, setLiveChannelId, getLiveMessageId, setLiveMessageId, getUiTheme } from '../config.js';
import { LIVE_UPDATE_INTERVAL_MS } from '../constants.js';
import { nowplayingEmbed, karaokeEmbed, noMusicEmbed } from './ui.js';
import { canGenerate, fetchImage, generateImage } from './image.js';
import { readNowplaying } from '../core/nowplaying.js';

const KARAOKE_INTERVAL_MS = 1500;

let liveInterval = null;
let _karaokeMode = false;

export function isKaraokeMode() {
  return _karaokeMode;
}

export function setKaraokeMode(active) {
  _karaokeMode = active;
}

export function stopLiveUpdates() {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
  }
}

export function startLiveUpdates(client) {
  stopLiveUpdates();
  updateLiveMessage(client);
  const interval = _karaokeMode ? KARAOKE_INTERVAL_MS : LIVE_UPDATE_INTERVAL_MS;
  liveInterval = setInterval(() => updateLiveMessage(client), interval);
}

async function updateLiveMessage(client) {
  const channelId = getLiveChannelId();
  if (!channelId) {
    stopLiveUpdates();
    return;
  }

  let channel;
  try {
    channel = await client.channels.fetch(channelId);
  } catch {
    console.warn('[Bot] Live channel no encontrado, deteniendo updates.');
    stopLiveUpdates();
    setLiveChannelId('');
    setLiveMessageId('');
    return;
  }

  const np = readNowplaying();
  if (!np || !np.trackName) {
    const embed = noMusicEmbed();
    const msgOpts = { embeds: [embed] };
    await sendOrEdit(channel, msgOpts);
    return;
  }

  const embed = _karaokeMode ? karaokeEmbed(np) : nowplayingEmbed(np);
  const msgOpts = { embeds: [embed], files: [] };

  if (!_karaokeMode && np.trackName && canGenerate() && getUiTheme() !== 'classic') {
    try {
      const artBuf = await fetchImage(np.albumArtUrl);
      const pngBuf = await generateImage(np, np.lyricLine || '', artBuf);
      if (pngBuf) {
        embed.setImage('attachment://nowplaying.png');
        msgOpts.files = [{ attachment: pngBuf, name: 'nowplaying.png' }];
      }
    } catch (err) {
      console.error('[Live] Error generando imagen:', err.message);
    }
  }

  await sendOrEdit(channel, msgOpts);
}

async function sendOrEdit(channel, msgOpts) {
  const msgId = getLiveMessageId();
  if (msgId) {
    try {
      const msg = await channel.messages.fetch(msgId);
      await msg.edit(msgOpts);
      return;
    } catch {
      // message deleted or not found
    }
  }

  try {
    const msg = await channel.send(msgOpts);
    setLiveMessageId(msg.id);
  } catch (err) {
    console.error('[Bot] Error enviando live message:', err.message);
  }
}
