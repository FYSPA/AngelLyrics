import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR, getLiveChannelId, setLiveChannelId, getLiveMessageId, setLiveMessageId, getUiTheme } from '../config.js';
import { LIVE_UPDATE_INTERVAL_MS } from '../constants.js';
import { nowplayingEmbed, noMusicEmbed } from './ui.js';
import { canGenerate, fetchImage, generateImage } from './image.js';

let liveInterval = null;

function readNowplaying() {
  try {
    const file = join(CONFIG_DIR, 'nowplaying.json');
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
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
  liveInterval = setInterval(() => updateLiveMessage(client), LIVE_UPDATE_INTERVAL_MS);
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
  const embed = np && np.trackName ? nowplayingEmbed(np) : noMusicEmbed();
  const msgOpts = { embeds: [embed], files: [] };

  if (np && np.trackName && canGenerate() && getUiTheme() !== 'classic') {
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

  const msgId = getLiveMessageId();

  if (msgId) {
    try {
      const msg = await channel.messages.fetch(msgId);
      await msg.edit(msgOpts);
      return;
    } catch {
      // mensaje eliminado o no encontrado
    }
  }

  try {
    const msg = await channel.send(msgOpts);
    setLiveMessageId(msg.id);
  } catch (err) {
    console.error('[Bot] Error enviando live message:', err.message);
  }
}
