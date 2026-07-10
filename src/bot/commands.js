import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, MODE_NAMES, SO_ACTUAL, VALID_UI_THEMES } from './constants.js';
import { pm2Start, pm2Stop, pm2Restart, pm2Reset, getPm2Status, getPm2Logs } from './pm2.js';
import {
  controlRow, modeRow, themeRow,
  onEmbed, offEmbed, restartEmbed, resetEmbed, errorEmbed,
  buildModeEmbed, modeChangedEmbed,
  noMusicEmbed, nowplayingEmbed,
  liveChannelEmbed, liveChannelRemovedEmbed, channelNotFoundEmbed,
  statusEmbed, helpEmbed,
  backendInfoEmbed, backendChangedEmbed,
  emojiInfoEmbed, emojiChangedEmbed,
  prefixInfoEmbed, prefixChangedEmbed,
  styleInfoEmbed, styleChangedEmbed,
  cooldownInfoEmbed, cooldownChangedEmbed, cooldownErrorEmbed,
  filterListEmbed, filterAddedEmbed, filterRemovedEmbed, filterUsageEmbed,
  blacklistInfoEmbed, blacklistAddedEmbed, blacklistRemovedEmbed, blacklistUsageEmbed,
  broadcastInfoEmbed, broadcastSetEmbed, broadcastRemovedEmbed,
  formatInfoEmbed, formatChangedEmbed, formatResetEmbed,
  formatOverrideAddedEmbed, formatOverrideRemovedEmbed, formatOverrideListEmbed,
  offsetInfoEmbed, offsetChangedEmbed, offsetErrorEmbed,
  recentEmptyEmbed, recentListEmbed,
  logsEmbed, pingEmbed, pingResultEmbed,
  themeInfoEmbed, themeChangedEmbed,
  statsEmbed, statsResetEmbed,
  diagnosticEmbed, compactDebug,
} from './ui.js';
import {
  getDisplayMode, setDisplayMode,
  getLiveChannelId, setLiveChannelId, setLiveMessageId,
  getBackend, setBackend, VALID_BACKENDS, VALID_MODES,
  getStatusEmoji, setStatusEmoji, VALID_EMOJIS,
  getPrefix, setPrefix,
  getFilteredWords, addFilteredWord, removeFilteredWord,
  getCooldownMs, setCooldownMs,
  getBlacklist, addToBlacklist, removeFromBlacklist,
  getProgressStyle, setProgressStyle, VALID_PROGRESS_STYLES,
  getBroadcastWebhook, setBroadcastWebhook, clearBroadcastWebhook,
  getStatusFormat, setStatusFormat, VALID_FORMAT_VARS, DEFAULT_FORMATS,
  getLyricOffset, setLyricOffset,
  getRecentTracks,
  getUiTheme, setUiTheme,
  getFormatOverrides, setFormatOverride, removeFormatOverride,
  getStats, resetStats,
} from '../config.js';
import { readNowplaying } from '../core/nowplaying.js';
import { canGenerate, fetchImage, generateImage } from './image.js';
import { startLiveUpdates, stopLiveUpdates } from './live.js';
import { startKaraoke, stopKaraoke, isKaraokeActive } from './lyrics-live.js';
import { CONFIG_DIR } from '../config/paths.js';
import { join } from 'path';
import { writeFileSync } from 'fs';

const RESYNC_FILE = join(CONFIG_DIR, 'resync.json');

const MODE_CHOICES = [
  { name: 'Lyrics', value: 'lyrics' },
  { name: 'Info', value: 'info' },
  { name: 'Progress', value: 'progress' },
  { name: 'Compact', value: 'compact' },
];

const BACKEND_CHOICES = [
  { name: 'Auto', value: 'auto' },
  { name: 'API', value: 'api' },
  { name: 'Native', value: 'native' },
];

const EMOJI_CHOICES = [
  { name: 'Note', value: 'musical_note' },
  { name: 'Score', value: 'musical_score' },
  { name: 'Mic', value: 'microphone' },
  { name: 'Guitar', value: 'guitar' },
  { name: 'Headphones', value: 'headphones' },
  { name: 'Radio', value: 'radio' },
  { name: 'Star', value: 'star' },
  { name: 'None', value: 'none' },
];

const STYLE_CHOICES = [
  { name: 'Blocks', value: 'blocks' },
  { name: 'Squares', value: 'squares' },
];

const THEME_CHOICES = VALID_UI_THEMES.map(function (t) {
  return { name: t.charAt(0).toUpperCase() + t.slice(1), value: t };
});

async function addNowplayingImage(embed, np) {
  if (!canGenerate()) return null;
  try {
    const artBuf = await fetchImage(np.albumArtUrl);
    const pngBuf = await generateImage(np, np.lyricLine || '', artBuf);
    if (pngBuf) {
      const att = new AttachmentBuilder(pngBuf, { name: 'nowplaying.png' });
      embed.setImage('attachment://nowplaying.png');
      return [att];
    }
  } catch (err) {
    console.error('[Bot] Error generando imagen:', err.message);
  }
  return null;
}

async function handleOn(interaction) {
  await interaction.deferReply();
  const err = await pm2Start();
  if (err) return interaction.editReply({ embeds: [errorEmbed(err)] });
  await interaction.editReply({ embeds: [onEmbed()], components: [controlRow(), modeRow()] });
}

async function handleOff(interaction) {
  await interaction.deferReply();
  const err = await pm2Stop();
  if (err) return interaction.editReply({ embeds: [errorEmbed(err)] });
  await interaction.editReply({ embeds: [offEmbed()], components: [controlRow(), modeRow()] });
}

async function handleRestart(interaction) {
  await interaction.deferReply();
  const err = await pm2Restart();
  if (err) return interaction.editReply({ embeds: [errorEmbed(err)] });
  await interaction.editReply({ embeds: [restartEmbed()], components: [controlRow(), modeRow()] });
}

async function handleReset(interaction) {
  await interaction.deferReply();
  const err = await pm2Reset();
  if (err) return interaction.editReply({ embeds: [errorEmbed(err)] });
  await interaction.editReply({ embeds: [resetEmbed()], components: [controlRow(), modeRow()] });
}

async function handleStatus(interaction) {
  await interaction.deferReply();
  const proc = await getPm2Status();
  await interaction.editReply({ embeds: [statusEmbed(proc)], components: [controlRow(), modeRow()] });
}

async function handlePing(interaction, client) {
  await interaction.reply({ embeds: [pingEmbed()] });
  const sent = await interaction.fetchReply();
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply({ embeds: [pingResultEmbed(latency, client.ws.ping)] });
}

async function handleLogs(interaction) {
  await interaction.deferReply();
  const logOutput = await getPm2Logs();
  const logLines = logOutput.split('\n').filter(function (l) { return l.trim(); });
  const formatted = logLines.map(function (l) {
    const cleaned = l.replace(/\x1B\[[0-9;]*m/g, '').trim();
    return cleaned.length > 150 ? cleaned.slice(0, 150) + '...' : cleaned;
  }).join('\n').slice(0, 4000);
  await interaction.editReply({ embeds: [logsEmbed(formatted || null)] });
}

async function handleRecent(interaction) {
  const tracks = getRecentTracks();
  if (!tracks.length) return interaction.reply({ embeds: [recentEmptyEmbed()] });
  await interaction.reply({ embeds: [recentListEmbed(tracks)] });
}

async function handleRepeat(interaction) {
  const np = readNowplaying();
  if (!np || !np.trackName) return interaction.reply({ embeds: [noMusicEmbed()] });
  const embed = nowplayingEmbed(np);
  const replyOpts = { embeds: [embed], components: [controlRow(), modeRow()] };
  const files = await addNowplayingImage(embed, np);
  if (files) replyOpts.files = files;
  await interaction.reply(replyOpts);
}

async function handleHelp(interaction) {
  await interaction.reply({ embeds: [helpEmbed()] });
}

async function handleLyrics(interaction, client) {
  if (isKaraokeActive()) {
    stopKaraoke();
    await interaction.reply({ embeds: [new EmbedBuilder()
      .setColor(COLORS.RED)
      .setTitle('Karaoke stopped')
      .setDescription('Real-time lyrics will no longer be displayed.')
    ]});
  } else {
    startKaraoke(client, interaction.channelId);
    await interaction.reply({ embeds: [new EmbedBuilder()
      .setColor(COLORS.GREEN)
      .setTitle('Karaoke started')
      .setDescription('Lyrics will update in real-time in this channel. Use `/lyrics` again to stop.')
    ]});
  }
}

async function handleNp(interaction, client) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (group === 'channel') {
    if (sub === 'set') {
      await interaction.deferReply();
      const channel = interaction.options.getChannel('channel');
      setLiveChannelId(channel.id);
      setLiveMessageId('');
      startLiveUpdates(client);
      return interaction.editReply({ embeds: [liveChannelEmbed(channel.toString())] });
    }
    if (sub === 'remove') {
      setLiveChannelId('');
      setLiveMessageId('');
      stopLiveUpdates();
      return interaction.reply({ embeds: [liveChannelRemovedEmbed()] });
    }
  }

  await interaction.deferReply();
  const np = readNowplaying();
  if (!np || !np.trackName) return interaction.editReply({ embeds: [noMusicEmbed()] });
  const embed = nowplayingEmbed(np);
  const replyOpts = { embeds: [embed], components: [controlRow(), modeRow()] };
  const files = await addNowplayingImage(embed, np);
  if (files) replyOpts.files = files;
  await interaction.editReply(replyOpts);
}

async function handleMode(interaction) {
  const mode = interaction.options.getString('mode');
  if (!mode) {
    await interaction.reply({ embeds: [buildModeEmbed(getDisplayMode())], components: [modeRow()] });
  } else {
    setDisplayMode(mode);
    await interaction.reply({ embeds: [modeChangedEmbed(mode)], components: [controlRow(), modeRow()] });
  }
}

async function handleBackend(interaction) {
  const backend = interaction.options.getString('backend');
  if (!backend) {
    await interaction.reply({ embeds: [backendInfoEmbed(getBackend())] });
  } else {
    setBackend(backend);
    await interaction.reply({ embeds: [backendChangedEmbed(backend)] });
  }
}

async function handleEmoji(interaction) {
  const emoji = interaction.options.getString('emoji');
  if (!emoji) {
    await interaction.reply({ embeds: [emojiInfoEmbed(getStatusEmoji())] });
  } else {
    setStatusEmoji(emoji);
    await interaction.reply({ embeds: [emojiChangedEmbed(emoji)] });
  }
}

async function handleStyle(interaction) {
  const style = interaction.options.getString('style');
  if (!style) {
    await interaction.reply({ embeds: [styleInfoEmbed(getProgressStyle())] });
  } else {
    setProgressStyle(style);
    await interaction.reply({ embeds: [styleChangedEmbed(style)] });
  }
}

async function handleCooldown(interaction) {
  const ms = interaction.options.getInteger('ms');
  if (ms === null || ms === undefined) {
    await interaction.reply({ embeds: [cooldownInfoEmbed(getCooldownMs())] });
  } else {
    if (ms < 500 || ms > 30000) {
      return interaction.reply({ embeds: [cooldownErrorEmbed()], ephemeral: true });
    }
    setCooldownMs(ms);
    await interaction.reply({ embeds: [cooldownChangedEmbed(ms)] });
  }
}

async function handleUi(interaction) {
  const theme = interaction.options.getString('theme');
  if (!theme) {
    await interaction.reply({ embeds: [themeInfoEmbed(getUiTheme())], components: [themeRow()] });
  } else {
    setUiTheme(theme);
    await interaction.reply({ embeds: [themeChangedEmbed(theme)], components: [themeRow()] });
  }
}

async function handlePrefix(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'show') {
    await interaction.reply({ embeds: [prefixInfoEmbed(getPrefix())] });
  } else if (sub === 'set') {
    const value = interaction.options.getString('value');
    setPrefix(value);
    const preview = value + 'Bohemian Rhapsody — Queen';
    await interaction.reply({ embeds: [prefixChangedEmbed(value, preview)] });
  } else if (sub === 'remove') {
    setPrefix('');
    await interaction.reply({ embeds: [prefixChangedEmbed('')] });
  }
}

async function handleOffset(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'show') {
    await interaction.reply({ embeds: [offsetInfoEmbed(getLyricOffset())] });
  } else if (sub === 'set') {
    const ms = interaction.options.getInteger('ms');
    if (ms < -10000 || ms > 10000) {
      return interaction.reply({ embeds: [offsetErrorEmbed()], ephemeral: true });
    }
    setLyricOffset(ms);
    await interaction.reply({ embeds: [offsetChangedEmbed(ms)] });
  } else if (sub === 'reset') {
    setLyricOffset(0);
    await interaction.reply({ embeds: [offsetChangedEmbed(0)] });
  }
}

async function handleFilter(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'list') {
    await interaction.reply({ embeds: [filterListEmbed(getFilteredWords())] });
  } else if (sub === 'add') {
    const word = interaction.options.getString('word');
    addFilteredWord(word);
    await interaction.reply({ embeds: [filterAddedEmbed(word)] });
  } else if (sub === 'remove') {
    const word = interaction.options.getString('word');
    removeFilteredWord(word);
    await interaction.reply({ embeds: [filterRemovedEmbed(word)] });
  }
}

async function handleBlacklist(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'list') {
    await interaction.reply({ embeds: [blacklistInfoEmbed(getBlacklist())] });
  } else if (sub === 'add') {
    const pattern = interaction.options.getString('pattern');
    addToBlacklist(pattern);
    await interaction.reply({ embeds: [blacklistAddedEmbed(pattern)] });
  } else if (sub === 'remove') {
    const pattern = interaction.options.getString('pattern');
    removeFromBlacklist(pattern);
    await interaction.reply({ embeds: [blacklistRemovedEmbed(pattern)] });
  }
}

async function handleBroadcast(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'info') {
    await interaction.reply({ embeds: [broadcastInfoEmbed(getBroadcastWebhook())] });
  } else if (sub === 'set') {
    const url = interaction.options.getString('url');
    setBroadcastWebhook(url);
    await interaction.reply({ embeds: [broadcastSetEmbed()] });
  } else if (sub === 'remove') {
    clearBroadcastWebhook();
    await interaction.reply({ embeds: [broadcastRemovedEmbed()] });
  }
}

async function handleFormat(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  if (group === 'override') {
    return handleFormatOverride(interaction);
  }

  const sub = interaction.options.getSubcommand();
  const mode = interaction.options.getString('mode');

  if (sub === 'show') {
    const targetMode = mode || getDisplayMode();
    const allFormats = {};
    for (const m of VALID_MODES) allFormats[m] = getStatusFormat(m);
    await interaction.reply({ embeds: [formatInfoEmbed(targetMode, allFormats)] });
  } else if (sub === 'set') {
    const template = interaction.options.getString('template');
    setStatusFormat(template, mode || null);
    const reply = { embeds: [formatChangedEmbed(template, mode)] };
    await interaction.reply(reply);
  } else if (sub === 'reset') {
    setStatusFormat(null, mode || null);
    await interaction.reply({ embeds: [formatResetEmbed(mode)] });
  }
}

async function handleFormatOverride(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'list') {
    await interaction.reply({ embeds: [formatOverrideListEmbed(getFormatOverrides())] });
  } else if (sub === 'add') {
    const type = interaction.options.getString('type');
    const name = interaction.options.getString('name');
    const template = interaction.options.getString('template');
    setFormatOverride(type, name, template);
    await interaction.reply({ embeds: [formatOverrideAddedEmbed(type, name, template)] });
  } else if (sub === 'remove') {
    const type = interaction.options.getString('type');
    const name = interaction.options.getString('name');
    removeFormatOverride(type, name);
    await interaction.reply({ embeds: [formatOverrideRemovedEmbed(type, name)] });
  }
}

async function handleStats(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'reset') {
    resetStats();
    await interaction.reply({ embeds: [statsResetEmbed()] });
  } else {
    await interaction.reply({ embeds: [statsEmbed(getStats())] });
  }
}

async function handleDiagnostico(interaction) {
  const np = readNowplaying();
  if (!np || !np.trackName) return interaction.reply({ embeds: [noMusicEmbed()] });
  await interaction.reply({ embeds: [diagnosticEmbed(np)] });
}

async function handleDebug(interaction) {
  const np = readNowplaying();
  if (!np || !np.trackName) return interaction.reply({ content: 'No hay música reproduciéndose.', ephemeral: true });
  await interaction.reply({ content: compactDebug(np) });
}

async function handleResync(interaction) {
  const np = readNowplaying();
  if (!np || !np.trackName) return interaction.reply({ embeds: [noMusicEmbed()] });

  const secs = interaction.options.getNumber('seconds');
  try {
    if (secs != null) {
      writeFileSync(RESYNC_FILE, JSON.stringify({ positionMs: Math.round(secs * 1000) }), 'utf8');
      const m = Math.floor(secs / 60);
      const s = Math.round(secs) % 60;
      const newPos = m + ':' + String(s).padStart(2, '0');
      await interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setTitle('Resincronización solicitada')
        .setDescription('El scheduler se reajustará a **' + newPos + '** en el próximo ciclo (~1.5s).')
      ]});
    } else {
      writeFileSync(RESYNC_FILE, JSON.stringify({ force: true }), 'utf8');
      await interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setTitle('Resincronización solicitada')
        .setDescription('El scheduler se reajustará a la posición actual del backend en el próximo ciclo (~1.5s).')
      ]});
    }
  } catch (err) {
    await interaction.reply({ embeds: [errorEmbed('Error: ' + err.message)] });
  }
}

const HANDLERS = {
  on: handleOn, encender: handleOn,
  off: handleOff, apagar: handleOff,
  restart: handleRestart, reiniciar: handleRestart,
  reset: handleReset, resetear: handleReset,
  status: handleStatus, estado: handleStatus,
  ping: handlePing,
  logs: handleLogs,
  recent: handleRecent,
  repeat: handleRepeat,
  help: handleHelp, ayuda: handleHelp,
  lyrics: handleLyrics, letras: handleLyrics,
  np: handleNp, nowplaying: handleNp,
  mode: handleMode, modo: handleMode,
  backend: handleBackend, plataforma: handleBackend,
  emoji: handleEmoji,
  style: handleStyle,
  cooldown: handleCooldown,
  ui: handleUi, tema: handleUi,
  prefix: handlePrefix, prefijo: handlePrefix,
  offset: handleOffset,
  filter: handleFilter, filtro: handleFilter,
  blacklist: handleBlacklist,
  broadcast: handleBroadcast,
  format: handleFormat,
  stats: handleStats, estadisticas: handleStats,
  diagnostico: handleDiagnostico, diagnostic: handleDiagnostico,
  debug: handleDebug,
  resync: handleResync, resincronizar: handleResync,
};

function b(name, desc, fn) {
  return fn(new SlashCommandBuilder().setName(name).setDescription(desc));
}

export const COMMANDS = [
  b('on', 'Start showing lyrics in your Discord status', function (c) { return c; }),
  b('encender', 'Mostrar letras en tu estado de Discord', function (c) { return c; }),
  b('off', 'Stop showing lyrics in your Discord status', function (c) { return c; }),
  b('apagar', 'Dejar de mostrar letras en tu estado', function (c) { return c; }),
  b('restart', 'Restart the lyrics system', function (c) { return c; }),
  b('reiniciar', 'Reiniciar el sistema de letras', function (c) { return c; }),
  b('reset', 'Reset token and re-authenticate', function (c) { return c; }),
  b('resetear', 'Resetear token y re-autenticar', function (c) { return c; }),
  b('status', 'Show system status', function (c) { return c; }),
  b('estado', 'Mostrar estado del sistema', function (c) { return c; }),
  b('ping', 'Check bot latency', function (c) { return c; }),
  b('logs', 'Show recent PM2 logs', function (c) { return c; }),
  b('recent', 'Show recently played tracks', function (c) { return c; }),
  b('repeat', 'Repeat the nowplaying embed', function (c) { return c; }),
  b('help', 'Show help with all commands', function (c) { return c; }),
  b('ayuda', 'Mostrar ayuda con todos los comandos', function (c) { return c; }),
  b('lyrics', 'Toggle real-time karaoke lyrics', function (c) { return c; }),
  b('letras', 'Activar/desactivar karaoke en tiempo real', function (c) { return c; }),

  b('mode', 'Set or view display mode', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('mode').setDescription('Display mode').setRequired(false)
        .addChoices(MODE_CHOICES[0], MODE_CHOICES[1], MODE_CHOICES[2], MODE_CHOICES[3]);
    });
  }),
  b('modo', 'Ver o cambiar modo de visualización', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('mode').setDescription('Modo de visualización').setRequired(false)
        .addChoices(MODE_CHOICES[0], MODE_CHOICES[1], MODE_CHOICES[2], MODE_CHOICES[3]);
    });
  }),
  b('backend', 'Set or view detection backend', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('backend').setDescription('Detection backend').setRequired(false)
        .addChoices(BACKEND_CHOICES[0], BACKEND_CHOICES[1], BACKEND_CHOICES[2]);
    });
  }),
  b('plataforma', 'Ver o cambiar plataforma de detección', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('backend').setDescription('Plataforma de detección').setRequired(false)
        .addChoices(BACKEND_CHOICES[0], BACKEND_CHOICES[1], BACKEND_CHOICES[2]);
    });
  }),
  b('emoji', 'Set or view status emoji', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('emoji').setDescription('Status emoji').setRequired(false)
        .addChoices(EMOJI_CHOICES[0], EMOJI_CHOICES[1], EMOJI_CHOICES[2], EMOJI_CHOICES[3],
          EMOJI_CHOICES[4], EMOJI_CHOICES[5], EMOJI_CHOICES[6], EMOJI_CHOICES[7]);
    });
  }),
  b('style', 'Set or view progress bar style', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('style').setDescription('Progress bar style').setRequired(false)
        .addChoices(STYLE_CHOICES[0], STYLE_CHOICES[1]);
    });
  }),
  b('cooldown', 'Set or view update interval', function (c) {
    return c.addIntegerOption(function (o) {
      return o.setName('ms').setDescription('Interval in ms (500-30000)').setRequired(false);
    });
  }),
  b('ui', 'Set or view visual theme', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('theme').setDescription('Theme name').setRequired(false)
        .addChoices(THEME_CHOICES[0], THEME_CHOICES[1], THEME_CHOICES[2], THEME_CHOICES[3], THEME_CHOICES[4]);
    });
  }),
  b('tema', 'Ver o cambiar tema visual', function (c) {
    return c.addStringOption(function (o) {
      return o.setName('theme').setDescription('Nombre del tema').setRequired(false)
        .addChoices(THEME_CHOICES[0], THEME_CHOICES[1], THEME_CHOICES[2], THEME_CHOICES[3], THEME_CHOICES[4]);
    });
  }),

  b('prefix', 'Manage status text prefix', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('show').setDescription('Show current prefix'); })
      .addSubcommand(function (s) {
        return s.setName('set').setDescription('Set prefix text')
          .addStringOption(function (o) { return o.setName('value').setDescription('Prefix text').setRequired(true); });
      })
      .addSubcommand(function (s) { return s.setName('remove').setDescription('Remove prefix'); });
  }),
  b('prefijo', 'Gestionar prefijo del estado', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('show').setDescription('Mostrar prefijo actual'); })
      .addSubcommand(function (s) {
        return s.setName('set').setDescription('Establecer prefijo')
          .addStringOption(function (o) { return o.setName('value').setDescription('Texto del prefijo').setRequired(true); });
      })
      .addSubcommand(function (s) { return s.setName('remove').setDescription('Eliminar prefijo'); });
  }),
  b('offset', 'Manage lyric timing offset', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('show').setDescription('Show current offset'); })
      .addSubcommand(function (s) {
        return s.setName('set').setDescription('Set offset in ms')
          .addIntegerOption(function (o) { return o.setName('ms').setDescription('Offset in ms (-10000 to 10000)').setRequired(true); });
      })
      .addSubcommand(function (s) { return s.setName('reset').setDescription('Reset offset to 0'); });
  }),
  b('filter', 'Manage filtered words', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('list').setDescription('List filtered words'); })
      .addSubcommand(function (s) {
        return s.setName('add').setDescription('Add a word to filter')
          .addStringOption(function (o) { return o.setName('word').setDescription('Word to filter').setRequired(true); });
      })
      .addSubcommand(function (s) {
        return s.setName('remove').setDescription('Remove a filtered word')
          .addStringOption(function (o) { return o.setName('word').setDescription('Word to remove').setRequired(true); });
      });
  }),
  b('filtro', 'Gestionar palabras filtradas', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('list').setDescription('Listar palabras filtradas'); })
      .addSubcommand(function (s) {
        return s.setName('add').setDescription('Añadir palabra a filtrar')
          .addStringOption(function (o) { return o.setName('word').setDescription('Palabra a filtrar').setRequired(true); });
      })
      .addSubcommand(function (s) {
        return s.setName('remove').setDescription('Quitar palabra filtrada')
          .addStringOption(function (o) { return o.setName('word').setDescription('Palabra a quitar').setRequired(true); });
      });
  }),
  b('blacklist', 'Manage blacklisted artists/songs', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('list').setDescription('List blacklisted patterns'); })
      .addSubcommand(function (s) {
        return s.setName('add').setDescription('Add a pattern to blacklist')
          .addStringOption(function (o) { return o.setName('pattern').setDescription('Artist or song pattern').setRequired(true); });
      })
      .addSubcommand(function (s) {
        return s.setName('remove').setDescription('Remove a blacklisted pattern')
          .addStringOption(function (o) { return o.setName('pattern').setDescription('Pattern to remove').setRequired(true); });
      });
  }),
  b('broadcast', 'Manage broadcast webhook', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('info').setDescription('Show broadcast webhook info'); })
      .addSubcommand(function (s) {
        return s.setName('set').setDescription('Set broadcast webhook URL')
          .addStringOption(function (o) { return o.setName('url').setDescription('Webhook URL').setRequired(true); });
      })
      .addSubcommand(function (s) { return s.setName('remove').setDescription('Remove broadcast webhook'); });
  }),
  b('format', 'Manage status format template', function (c) {
    return c
      .addSubcommand(function (s) {
        return s.setName('show').setDescription('Show current format')
          .addStringOption(function (o) {
            return o.setName('mode').setDescription('Mode to show format for').setRequired(false)
              .addChoices(MODE_CHOICES[0], MODE_CHOICES[1], MODE_CHOICES[2], MODE_CHOICES[3]);
          });
      })
      .addSubcommand(function (s) {
        return s.setName('set').setDescription('Set format template')
          .addStringOption(function (o) { return o.setName('template').setDescription('Format template with {variables}').setRequired(true); })
          .addStringOption(function (o) {
            return o.setName('mode').setDescription('Mode to set format for').setRequired(false)
              .addChoices(MODE_CHOICES[0], MODE_CHOICES[1], MODE_CHOICES[2], MODE_CHOICES[3]);
          });
      })
      .addSubcommand(function (s) {
        return s.setName('reset').setDescription('Reset format to default')
          .addStringOption(function (o) {
            return o.setName('mode').setDescription('Mode to reset format for').setRequired(false)
              .addChoices(MODE_CHOICES[0], MODE_CHOICES[1], MODE_CHOICES[2], MODE_CHOICES[3]);
          });
      })
      .addSubcommandGroup(function (g) {
        return g.setName('override').setDescription('Manage per-artist/album/track format overrides')
          .addSubcommand(function (s) {
            return s.setName('add').setDescription('Add format override')
              .addStringOption(function (o) {
                return o.setName('type').setDescription('Override type').setRequired(true)
                  .addChoices({ name: 'Artist', value: 'artist' }, { name: 'Album', value: 'album' }, { name: 'Track', value: 'track' });
              })
              .addStringOption(function (o) { return o.setName('name').setDescription('Artist/album/track name').setRequired(true); })
              .addStringOption(function (o) { return o.setName('template').setDescription('Format template with {variables}').setRequired(true); });
          })
          .addSubcommand(function (s) {
            return s.setName('remove').setDescription('Remove format override')
              .addStringOption(function (o) {
                return o.setName('type').setDescription('Override type').setRequired(true)
                  .addChoices({ name: 'Artist', value: 'artist' }, { name: 'Album', value: 'album' }, { name: 'Track', value: 'track' });
              })
              .addStringOption(function (o) { return o.setName('name').setDescription('Artist/album/track name').setRequired(true); });
          })
          .addSubcommand(function (s) { return s.setName('list').setDescription('List all format overrides'); });
      });
  }),
  b('stats', 'Show listening statistics', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('show').setDescription('Show listening statistics'); })
      .addSubcommand(function (s) { return s.setName('reset').setDescription('Reset all statistics'); });
  }),
  b('estadisticas', 'Mostrar estadísticas de escucha', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('show').setDescription('Mostrar estadísticas de escucha'); })
      .addSubcommand(function (s) { return s.setName('reset').setDescription('Reiniciar todas las estadísticas'); });
  }),
  b('np', 'Show nowplaying info and manage live channel', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('show').setDescription('Show currently playing track'); })
      .addSubcommandGroup(function (g) {
        return g.setName('channel').setDescription('Manage live channel')
          .addSubcommand(function (s) {
            return s.setName('set').setDescription('Set live channel')
              .addChannelOption(function (o) { return o.setName('channel').setDescription('Channel').setRequired(true); });
          })
          .addSubcommand(function (s) { return s.setName('remove').setDescription('Remove live channel'); });
      });
  }),
  b('nowplaying', 'Show nowplaying info and manage live channel', function (c) {
    return c
      .addSubcommand(function (s) { return s.setName('show').setDescription('Show currently playing track'); })
      .addSubcommandGroup(function (g) {
        return g.setName('channel').setDescription('Manage live channel')
          .addSubcommand(function (s) {
            return s.setName('set').setDescription('Set live channel')
              .addChannelOption(function (o) { return o.setName('channel').setDescription('Channel').setRequired(true); });
          })
          .addSubcommand(function (s) { return s.setName('remove').setDescription('Remove live channel'); });
      });
  }),
  b('diagnostico', 'Ver diagnóstico de sincronización de la canción actual', function (c) { return c; }),
  b('diagnostic', 'View sync diagnostic for current track', function (c) { return c; }),
  b('resync', 'Force resync scheduler position', function (c) {
    return c.addNumberOption(function (o) {
      return o.setName('seconds').setDescription('Position in seconds (optional)').setRequired(false);
    });
  }),
  b('resincronizar', 'Forzar resincronización del scheduler', function (c) {
    return c.addNumberOption(function (o) {
      return o.setName('segundos').setDescription('Posición en segundos (opcional)').setRequired(false);
    });
  }),
  b('debug', 'Show compact sync debug info', function (c) { return c; }),
];

export async function executeSlashCommand(interaction, client) {
  const handler = HANDLERS[interaction.commandName];
  if (!handler) {
    await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    return;
  }
  try {
    await handler(interaction, client);
  } catch (err) {
    console.error(`[Slash] Error en /${interaction.commandName}:`, err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: 'Error: ' + err.message, ephemeral: true });
      } else {
        await interaction.reply({ content: 'Error: ' + err.message, ephemeral: true });
      }
    } catch (_) {
      // ignore follow-up errors
    }
  }
}
