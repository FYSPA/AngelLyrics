import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, AttachmentBuilder, EmbedBuilder, REST, Routes } from 'discord.js';
import { canGenerate, fetchImage, generateImage } from './src/bot/image.js';
import { COLORS, MODE_NAMES, SO_ACTUAL, PM2_NAME, VALID_UI_THEMES } from './src/bot/constants.js';
import { pm2Start, pm2Stop, pm2Restart, pm2Reset, getPm2Status, getPm2Logs } from './src/bot/pm2.js';
import {
  controlRow, modeRow,
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
  offsetInfoEmbed, offsetChangedEmbed, offsetErrorEmbed,
  recentEmptyEmbed, recentListEmbed,
  logsEmbed,
  pingEmbed, pingResultEmbed,
  themeInfoEmbed, themeChangedEmbed, themeRow,
  formatOverrideAddedEmbed, formatOverrideRemovedEmbed, formatOverrideListEmbed,
  statsEmbed, statsResetEmbed,
  diagnosticEmbed,
} from './src/bot/ui.js';
import { startLiveUpdates, stopLiveUpdates } from './src/bot/live.js';
import { startKaraoke, stopKaraoke, isKaraokeActive } from './src/bot/lyrics-live.js';
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
} from './src/config.js';
import { readNowplaying } from './src/core/nowplaying.js';
import { COMMANDS, executeSlashCommand } from './src/bot/commands.js';

const BOT_TOKEN = process.env.CONTROL_BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!BOT_TOKEN || !OWNER_ID) {
  console.error('[Bot] Falta CONTROL_BOT_TOKEN o OWNER_ID en el archivo .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
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

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.guild) return;
  if (msg.author.id !== OWNER_ID) {
    console.log(`[Bot] Mensaje ignorado de usuario no autorizado: ${msg.author.id}`);
    return;
  }

  const content = msg.content.trim().toLowerCase();
  const args = content.split(/\s+/);
  const command = args[0];

  if (command === '!on' || command === '!encender') {
    const err = await pm2Start();
    if (err) return msg.reply({ embeds: [errorEmbed(err)] });
    msg.reply({ embeds: [onEmbed()], components: [controlRow(), modeRow()] });
  }

  else if (command === '!off' || command === '!apagar') {
    const err = await pm2Stop();
    if (err) return msg.reply({ embeds: [errorEmbed(err)] });
    msg.reply({ embeds: [offEmbed()], components: [controlRow(), modeRow()] });
  }

  else if (command === '!restart' || command === '!reiniciar') {
    const err = await pm2Restart();
    if (err) return msg.reply({ embeds: [errorEmbed(err)] });
    msg.reply({ embeds: [restartEmbed()], components: [controlRow(), modeRow()] });
  }

  else if (command === '!reset' || command === '!resetear') {
    const err = await pm2Reset();
    if (err) return msg.reply({ embeds: [errorEmbed(err)] });
    msg.reply({ embeds: [resetEmbed()], components: [controlRow(), modeRow()] });
  }

  else if (command === '!mode' || command === '!modo') {
    const mode = args[1];
    if (!mode || !VALID_MODES.includes(mode)) {
      msg.reply({ embeds: [buildModeEmbed(getDisplayMode())], components: [modeRow()] });
    } else {
      setDisplayMode(mode);
      msg.reply({ embeds: [modeChangedEmbed(mode)], components: [controlRow(), modeRow()] });
    }
  }

  else if (command === '!np' || command === '!nowplaying') {
    if (args[1] === 'channel') {
      if (!args[2] || args[2] === 'remove') {
        setLiveChannelId('');
        setLiveMessageId('');
        stopLiveUpdates();
        return msg.reply({ embeds: [liveChannelRemovedEmbed()] });
      }

      const channelId = args[2].replace(/[<#>]/g, '');
      const channel = client.channels.cache.get(channelId);
      if (!channel) return msg.reply({ embeds: [channelNotFoundEmbed()] });

      setLiveChannelId(channelId);
      setLiveMessageId('');
      startLiveUpdates(client);

      return msg.reply({ embeds: [liveChannelEmbed(args[2])] });
    }

    const np = readNowplaying();
    if (!np || !np.trackName) return msg.reply({ embeds: [noMusicEmbed()] });
    const embed = nowplayingEmbed(np);
    const replyOpts = { embeds: [embed], components: [controlRow(), modeRow()] };

    const files = await addNowplayingImage(embed, np);
    if (files) replyOpts.files = files;

    msg.reply(replyOpts);
  }

  else if (command === '!ping') {
    const sent = await msg.reply({ embeds: [pingEmbed()] });
    const latency = sent.createdTimestamp - msg.createdTimestamp;
    await sent.edit({ embeds: [pingResultEmbed(latency, client.ws.ping)] });
  }

  else if (command === '!backend' || command === '!plataforma') {
    const newBackend = args[1];
    if (!newBackend || !VALID_BACKENDS.includes(newBackend)) {
      return msg.reply({ embeds: [backendInfoEmbed(getBackend())] });
    }
    setBackend(newBackend);
    msg.reply({ embeds: [backendChangedEmbed(newBackend)] });
  }

  else if (command === '!status' || command === '!estado') {
    const proc = await getPm2Status();
    msg.reply({ embeds: [statusEmbed(proc)], components: [controlRow(), modeRow()] });
  }

  else if (command === '!emoji') {
    const newEmoji = args[1];
    if (!newEmoji || !VALID_EMOJIS.includes(newEmoji)) {
      return msg.reply({ embeds: [emojiInfoEmbed(getStatusEmoji())] });
    }
    setStatusEmoji(newEmoji);
    msg.reply({ embeds: [emojiChangedEmbed(newEmoji)] });
  }

  else if (command === '!prefix') {
    const newPrefix = content.slice(args[0].length + 1);
    if (!newPrefix || newPrefix === 'remove') {
      setPrefix('');
      return msg.reply({ embeds: [prefixChangedEmbed('')] });
    }
    setPrefix(newPrefix);
    msg.reply({ embeds: [prefixChangedEmbed(newPrefix, `${newPrefix}Bohemian Rhapsody — Queen`)] });
  }

  else if (command === '!style') {
    const newStyle = args[1];
    if (!newStyle || !VALID_PROGRESS_STYLES.includes(newStyle)) {
      return msg.reply({ embeds: [styleInfoEmbed(getProgressStyle())] });
    }
    setProgressStyle(newStyle);
    msg.reply({ embeds: [styleChangedEmbed(newStyle)] });
  }

  else if (command === '!cooldown') {
    const newMs = args[1];
    if (!newMs) {
      return msg.reply({ embeds: [cooldownInfoEmbed(getCooldownMs())] });
    }
    const ms = parseInt(newMs, 10);
    if (isNaN(ms) || ms < 500 || ms > 30000) {
      return msg.reply({ embeds: [cooldownErrorEmbed()] });
    }
    setCooldownMs(ms);
    msg.reply({ embeds: [cooldownChangedEmbed(ms)] });
  }

  else if (command === '!filter') {
    const sub = args[1];
    if (sub === 'add') {
      const word = content.slice(args[0].length + args[1].length + 2);
      if (!word) return msg.reply({ embeds: [filterUsageEmbed()] });
      addFilteredWord(word);
      return msg.reply({ embeds: [filterAddedEmbed(word)] });
    }
    if (sub === 'remove') {
      const word = content.slice(args[0].length + args[1].length + 2);
      if (!word) return msg.reply({ embeds: [filterUsageEmbed()] });
      removeFilteredWord(word);
      return msg.reply({ embeds: [filterRemovedEmbed(word)] });
    }
    msg.reply({ embeds: [filterListEmbed(getFilteredWords())] });
  }

  else if (command === '!blacklist') {
    const sub = args[1];
    if (sub === 'add') {
      const pattern = content.slice(args[0].length + args[1].length + 2);
      if (!pattern) return msg.reply({ embeds: [blacklistUsageEmbed()] });
      addToBlacklist(pattern);
      return msg.reply({ embeds: [blacklistAddedEmbed(pattern)] });
    }
    if (sub === 'remove') {
      const pattern = content.slice(args[0].length + args[1].length + 2);
      if (!pattern) return msg.reply({ embeds: [blacklistUsageEmbed()] });
      removeFromBlacklist(pattern);
      return msg.reply({ embeds: [blacklistRemovedEmbed(pattern)] });
    }
    msg.reply({ embeds: [blacklistInfoEmbed(getBlacklist())] });
  }

  else if (command === '!broadcast') {
    const sub = args[1];
    if (sub === 'remove') {
      clearBroadcastWebhook();
      return msg.reply({ embeds: [broadcastRemovedEmbed()] });
    }
    if (sub && sub.startsWith('http')) {
      setBroadcastWebhook(sub);
      return msg.reply({ embeds: [broadcastSetEmbed()] });
    }
    msg.reply({ embeds: [broadcastInfoEmbed(getBroadcastWebhook())] });
  }

  else if (command === '!format') {
    if (args[1] === 'override') {
      const sub = args[2];
      if (sub === 'add') {
        const type = args[3];
        const name = args[4];
        const template = content.slice(args[0].length + args[1].length + args[2].length + args[3].length + args[4].length + 5);
        if (!type || !name || !template || !['artist', 'album', 'track'].includes(type)) {
          return msg.reply({ embeds: [formatInfoEmbed(getDisplayMode(), {})] });
        }
        setFormatOverride(type, name, template);
        return msg.reply({ embeds: [formatOverrideAddedEmbed(type, name, template)] });
      }
      if (sub === 'remove') {
        const type = args[3];
        const name = args[4];
        if (!type || !name) return msg.reply({ embeds: [formatInfoEmbed(getDisplayMode(), {})] });
        removeFormatOverride(type, name);
        return msg.reply({ embeds: [formatOverrideRemovedEmbed(type, name)] });
      }
      return msg.reply({ embeds: [formatOverrideListEmbed(getFormatOverrides())] });
    }

    const vars = VALID_FORMAT_VARS.join(' ');
    const modeArg = args[1];
    const isModeArg = modeArg && VALID_MODES.includes(modeArg);

    if (!modeArg || modeArg === 'reset' || (isModeArg && (!args[2] || args[2] === 'reset'))) {
      if (modeArg === 'reset') {
        setStatusFormat(null);
        return msg.reply({ embeds: [formatResetEmbed()] });
      }
      if (isModeArg && args[2] === 'reset') {
        setStatusFormat(null, modeArg);
        return msg.reply({ embeds: [formatResetEmbed(modeArg)] });
      }

      const mode = isModeArg ? modeArg : getDisplayMode();
      const allFormats = {};
      for (const m of VALID_MODES) {
        allFormats[m] = getStatusFormat(m);
      }
      return msg.reply({ embeds: [formatInfoEmbed(mode, allFormats)] });
    }

    if (isModeArg) {
      setStatusFormat(args.slice(2).join(' '), modeArg);
      return msg.reply({ embeds: [formatChangedEmbed(args.slice(2).join(' '), modeArg)] });
    }

    setStatusFormat(args.slice(1).join(' '));
    msg.reply({ embeds: [formatChangedEmbed(args.slice(1).join(' '))] });
  }

  else if (command === '!offset') {
    const current = getLyricOffset();
    if (!args[1] || args[1] === 'reset') {
      if (args[1] === 'reset') setLyricOffset(0);
      return msg.reply({ embeds: [offsetInfoEmbed(current)] });
    }
    const ms = parseInt(args[1], 10);
    if (isNaN(ms) || ms < -10000 || ms > 10000) {
      return msg.reply({ embeds: [offsetErrorEmbed()] });
    }
    setLyricOffset(ms);
    msg.reply({ embeds: [offsetChangedEmbed(ms)] });
  }

  else if (command === '!recent') {
    const tracks = getRecentTracks();
    if (!tracks.length) return msg.reply({ embeds: [recentEmptyEmbed()] });
    msg.reply({ embeds: [recentListEmbed(tracks)] });
  }

  else if (command === '!repeat') {
    const np = readNowplaying();
    if (!np || !np.trackName) return msg.reply({ embeds: [noMusicEmbed()] });
    const embed = nowplayingEmbed(np);
    const replyOpts = { embeds: [embed], components: [controlRow(), modeRow()] };
    const files = await addNowplayingImage(embed, np);
    if (files) replyOpts.files = files;
    msg.reply(replyOpts);
  }

  else if (command === '!logs') {
    const logOutput = await getPm2Logs();
    const logLines = logOutput.split('\n').filter(l => l.trim());
    const formatted = logLines.map(l => {
      const cleaned = l.replace(/\x1B\[[0-9;]*m/g, '').trim();
      return cleaned.length > 150 ? cleaned.slice(0, 150) + '…' : cleaned;
    }).join('\n').slice(0, 4000);

    msg.reply({ embeds: [logsEmbed(formatted || null, `pm2 logs ${PM2_NAME} --lines 30`)] });
  }

  else if (command === '!lyrics' || command === '!letras') {
    if (isKaraokeActive()) {
      stopKaraoke();
      msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.RED)
          .setTitle('Karaoke detenido')
          .setDescription('Ya no se mostrar\u00E1n las letras en tiempo real.')
        ],
      });
    } else {
      startKaraoke(client, msg.channelId);
      msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('Karaoke iniciado')
          .setDescription('Las letras se actualizar\u00E1n en tiempo real en este canal. Env\u00EDa `!lyrics` de nuevo para detener.')
        ],
      });
    }
  }

  else if (command === '!ui' || command === '!tema') {
    const theme = args[1];
    if (!theme || !VALID_UI_THEMES.includes(theme)) {
      return msg.reply({ embeds: [themeInfoEmbed(getUiTheme())], components: [themeRow()] });
    }
    setUiTheme(theme);
    msg.reply({ embeds: [themeChangedEmbed(theme)], components: [themeRow()] });
  }

  else if (command === '!stats' || command === '!estadisticas') {
    if (args[1] === 'reset') {
      resetStats();
      return msg.reply({ embeds: [statsResetEmbed()] });
    }
    msg.reply({ embeds: [statsEmbed(getStats())] });
  }

  else if (command === '!diag' || command === '!diagnostico') {
    const np = readNowplaying();
    if (!np || !np.trackName) return msg.reply({ embeds: [noMusicEmbed()] });
    msg.reply({ embeds: [diagnosticEmbed(np)] });
  }

  else if (command === '!help' || command === '!ayuda') {
    msg.reply({ embeds: [helpEmbed()] });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: 'No autorizado.', ephemeral: true });
    }
    await executeSlashCommand(interaction, client);
    return;
  }

  if (!interaction.isButton()) return;
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: 'No autorizado.', ephemeral: true });
  }

  await interaction.deferReply();

  switch (interaction.customId) {
    case 'cmd_on': {
      const err = await pm2Start();
      if (err) return interaction.editReply({ embeds: [errorEmbed(err)] });
      interaction.editReply({ embeds: [onEmbed()], components: [controlRow(), modeRow()] });
      break;
    }
    case 'cmd_off': {
      const err = await pm2Stop();
      if (err) return interaction.editReply({ embeds: [errorEmbed(err)] });
      interaction.editReply({ embeds: [offEmbed()], components: [controlRow(), modeRow()] });
      break;
    }
    case 'cmd_restart': {
      const err = await pm2Restart();
      if (err) return interaction.editReply({ embeds: [errorEmbed(err)] });
      interaction.editReply({ embeds: [restartEmbed()], components: [controlRow(), modeRow()] });
      break;
    }
    case 'cmd_status': {
      const proc = await getPm2Status();
      interaction.editReply({ embeds: [statusEmbed(proc)], components: [controlRow(), modeRow()] });
      break;
    }
    case 'cmd_mode_lyrics':
    case 'cmd_mode_info':
    case 'cmd_mode_progress':
    case 'cmd_mode_compact': {
      const mode = interaction.customId.replace('cmd_mode_', '');
      setDisplayMode(mode);
      interaction.editReply({ embeds: [modeChangedEmbed(mode)], components: [controlRow(), modeRow()] });
      break;
    }
    case 'cmd_theme_classic':
    case 'cmd_theme_cyberpunk':
    case 'cmd_theme_minimal':
    case 'cmd_theme_retro':
    case 'cmd_theme_gradient': {
      const theme = interaction.customId.replace('cmd_theme_', '');
      setUiTheme(theme);
      interaction.editReply({ embeds: [themeChangedEmbed(theme)], components: [controlRow(), modeRow(), themeRow()] });
      break;
    }
    case 'cmd_repeat': {
      const np = readNowplaying();
      if (!np || !np.trackName) return interaction.editReply({ embeds: [noMusicEmbed()] });
      const embed = nowplayingEmbed(np);
      const replyOpts = { embeds: [embed], components: [controlRow(), modeRow()] };
      const files = await addNowplayingImage(embed, np);
      if (files) replyOpts.files = files;
      interaction.editReply(replyOpts);
      break;
    }
  }
});

client.once('ready', async () => {
  console.log(`[Bot] Conectado como ${client.user.tag}`);
  console.log(`[Bot] SO detectado: ${SO_ACTUAL}`);
  console.log(`[Bot] Esperando comandos por DM de tu usuario (${OWNER_ID})…`);

  const CLIENT_ID = process.env.CLIENT_ID;
  const DEV_GUILD_ID = process.env.DEV_GUILD_ID;

  if (!CLIENT_ID) {
    console.log('[Bot] CLIENT_ID no configurado — no se registraron slash commands.');
    console.log('[Bot] Agrega CLIENT_ID a .env para habilitar slash commands.');
  } else {
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

    if (DEV_GUILD_ID) {
      try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, DEV_GUILD_ID), { body: COMMANDS });
        console.log(`[Bot] ${COMMANDS.length} comandos slash registrados en guild ${DEV_GUILD_ID} (instantáneo).`);
      } catch (err) {
        console.error('[Bot] Error registrando comandos en guild:', err.message);
      }
    } else {
      try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: COMMANDS });
        console.log(`[Bot] ${COMMANDS.length} comandos slash registrados globalmente (puede tardar hasta 1h).`);
      } catch (err) {
        console.error('[Bot] Error registrando comandos globales:', err.message);
      }
    }
  }

  const savedChannel = getLiveChannelId();
  if (savedChannel) {
    console.log('[Bot] Live channel configurado, reanudando updates.');
    startLiveUpdates(client);
  }
});

function shutdown() {
  console.log('[Bot] Cerrando sesión…');
  stopLiveUpdates();
  stopKaraoke();
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.login(BOT_TOKEN);
