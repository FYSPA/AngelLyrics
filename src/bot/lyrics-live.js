import { karaokeEmbed, noMusicEmbed } from './ui.js';
import { readNowplaying } from '../core/nowplaying.js';
import { getLiveChannelId } from '../config.js';
import { setKaraokeMode, isKaraokeMode } from './live.js';

const POLL_MS = 1500;

let karaokeInterval = null;
let karaokeChannelId = '';
let karaokeMessageId = '';
let lastIndex = -1;
let _delegatedToLive = false;

export function isKaraokeActive() {
  return karaokeInterval !== null || _delegatedToLive;
}

export function startKaraoke(client, channelId) {
  stopKaraoke();

  const liveChannelId = getLiveChannelId();
  if (liveChannelId && channelId === liveChannelId) {
    _delegatedToLive = true;
    setKaraokeMode(true);
    return;
  }

  karaokeChannelId = channelId;
  karaokeMessageId = '';
  lastIndex = -1;
  updateKaraoke(client);
  karaokeInterval = setInterval(() => updateKaraoke(client), POLL_MS);
}

export function stopKaraoke() {
  if (_delegatedToLive) {
    _delegatedToLive = false;
    setKaraokeMode(false);
    return;
  }

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
    } catch (err) {
      console.warn('[Karaoke] Error editando mensaje:', err.message);
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
