import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from '../config/paths.js';
import { karaokeEmbed, noMusicEmbed } from './ui.js';

const POLL_MS = 1500;
const NOWPLAYING_FILE = join(CONFIG_DIR, 'nowplaying.json');

let karaokeInterval = null;
let karaokeChannelId = '';
let karaokeMessageId = '';
let lastIndex = -1;

function readNowplaying() {
  try {
    if (!existsSync(NOWPLAYING_FILE)) return null;
    return JSON.parse(readFileSync(NOWPLAYING_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function isKaraokeActive() {
  return karaokeInterval !== null;
}

export function startKaraoke(client, channelId) {
  stopKaraoke();
  karaokeChannelId = channelId;
  karaokeMessageId = '';
  lastIndex = -1;
  updateKaraoke(client);
  karaokeInterval = setInterval(() => updateKaraoke(client), POLL_MS);
}

export function stopKaraoke() {
  if (karaokeInterval) {
    clearInterval(karaokeInterval);
    karaokeInterval = null;
  }
  karaokeChannelId = '';
  karaokeMessageId = '';
  lastIndex = -1;
}

async function updateKaraoke(client) {
  if (!karaokeChannelId) {
    stopKaraoke();
    return;
  }

  let channel;
  try {
    channel = await client.channels.fetch(karaokeChannelId);
  } catch {
    console.warn('[Karaoke] Canal no encontrado, deteniendo.');
    stopKaraoke();
    return;
  }

  const np = readNowplaying();
  if (!np || !np.trackName) {
    if (karaokeMessageId) {
      try {
        const msg = await channel.messages.fetch(karaokeMessageId);
        await msg.edit({ embeds: [noMusicEmbed()] });
      } catch {}
    }
    return;
  }

  const idx = np.lyricIndex != null ? np.lyricIndex : -1;
  if (idx === lastIndex && karaokeMessageId) return;
  lastIndex = idx;

  const embed = karaokeEmbed(np);

  if (karaokeMessageId) {
    try {
      const msg = await channel.messages.fetch(karaokeMessageId);
      await msg.edit({ embeds: [embed] });
      return;
    } catch {
      karaokeMessageId = '';
    }
  }

  try {
    const msg = await channel.send({ embeds: [embed] });
    karaokeMessageId = msg.id;
  } catch (err) {
    console.error('[Karaoke] Error enviando mensaje:', err.message);
  }
}
