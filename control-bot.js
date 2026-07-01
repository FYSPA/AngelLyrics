import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import { COLORS, MODE_NAMES, SO_ACTUAL, PM2_NAME } from './src/bot/constants.js';
import { pm2Start, pm2Stop, pm2Restart, pm2Reset, getPm2Status, getPm2Logs } from './src/bot/pm2.js';
import { controlRow, modeRow, buildModeEmbed, onEmbed, offEmbed, restartEmbed, resetEmbed, modeChangedEmbed, noMusicEmbed, errorEmbed, nowplayingEmbed, liveChannelEmbed, liveChannelRemovedEmbed, channelNotFoundEmbed, statusEmbed, helpEmbed, modoDescription } from './src/bot/ui.js';
import { startLiveUpdates, stopLiveUpdates } from './src/bot/live.js';
import { getDisplayMode, setDisplayMode, getLiveChannelId, setLiveChannelId, setLiveMessageId, getBackend, setBackend, VALID_BACKENDS, VALID_MODES, getStatusEmoji, setStatusEmoji, VALID_EMOJIS, getPrefix, setPrefix, getFilteredWords, addFilteredWord, removeFilteredWord, getCooldownMs, setCooldownMs, getBlacklist, addToBlacklist, removeFromBlacklist, getProgressStyle, setProgressStyle, VALID_PROGRESS_STYLES, getBroadcastWebhook, setBroadcastWebhook, clearBroadcastWebhook, CONFIG_DIR } from './src/config.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

function readNowplaying() {
  try {
    const file = join(CONFIG_DIR, 'nowplaying.json');
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
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
    msg.reply({ embeds: [nowplayingEmbed(np)], components: [controlRow(), modeRow()] });
  }

  else if (command === '!ping') {
    const sent = await msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.GREY).setDescription('🏓 Pong...')] });
    const latency = sent.createdTimestamp - msg.createdTimestamp;
    await sent.edit({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setDescription(`🏓 Pong! **${latency}ms**`)
        .setTimestamp()
        .setFooter({ text: `WebSocket: ${client.ws.ping}ms` }),
      ],
    });
  }

  else if (command === '!backend' || command === '!plataforma') {
    const newBackend = args[1];
    if (!newBackend || !VALID_BACKENDS.includes(newBackend)) {
      const current = getBackend();
      const desc = VALID_BACKENDS.map(b => `▸ \`${b}\`${b === current ? ' ← actual' : ''}`).join('\n');
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.PURPLE)
          .setTitle('🎛️ Backend de detección')
          .setDescription(`Actual: **${current}**\n\n${desc}\n\nUsa \`!backend <nombre>\` para cambiar.`),
        ],
      });
    }
    setBackend(newBackend);
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setTitle('🎛️ Backend cambiado')
        .setDescription(`Nuevo backend: **${newBackend}**\nSe aplicará en el próximo ciclo (~1.5s).`),
      ],
    });
  }

  else if (command === '!status' || command === '!estado') {
    const proc = await getPm2Status();
    msg.reply({ embeds: [statusEmbed(proc)], components: [controlRow(), modeRow()] });
  }

  else if (command === '!emoji') {
    const newEmoji = args[1];
    if (!newEmoji || !VALID_EMOJIS.includes(newEmoji)) {
      const current = getStatusEmoji();
      const desc = VALID_EMOJIS.map(e => `▸ \`${e}\`${e === current ? ' ← actual' : ''}`).join('\n');
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.PURPLE)
          .setTitle('😊 Emoji del status')
          .setDescription(`Actual: **${current}**\n\n${desc}\n\nUsa \`!emoji <nombre>\` para cambiar.`),
        ],
      });
    }
    setStatusEmoji(newEmoji);
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setTitle('😊 Emoji cambiado')
        .setDescription(`Nuevo emoji: **${newEmoji}**\nSe aplicará en el próximo ciclo (~1.5s).`),
      ],
    });
  }

  else if (command === '!prefix') {
    const newPrefix = content.slice(args[0].length + 1);
    if (!newPrefix || newPrefix === 'remove') {
      setPrefix('');
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('✏️ Prefijo eliminado')
          .setDescription('El status ya no mostrará prefijo.'),
        ],
      });
    }
    setPrefix(newPrefix);
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setTitle('✏️ Prefijo cambiado')
        .setDescription(`Nuevo prefijo: **${newPrefix}**\nSe aplicará en el próximo ciclo (~1.5s).`),
      ],
    });
  }

  else if (command === '!style') {
    const newStyle = args[1];
    if (!newStyle || !VALID_PROGRESS_STYLES.includes(newStyle)) {
      const current = getProgressStyle();
      const desc = VALID_PROGRESS_STYLES.map(s => `▸ \`${s}\`${s === current ? ' ← actual' : ''}`).join('\n');
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.PURPLE)
          .setTitle('🎨 Estilo de barra de progreso')
          .setDescription(`Actual: **${current}**\n\n${desc}\n\nUsa \`!style <nombre>\` para cambiar.`),
        ],
      });
    }
    setProgressStyle(newStyle);
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setTitle('🎨 Estilo cambiado')
        .setDescription(`Nuevo estilo: **${newStyle}**\nSe aplicará en el próximo ciclo (~1.5s).`),
      ],
    });
  }

  else if (command === '!cooldown') {
    const newMs = args[1];
    if (!newMs) {
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.PURPLE)
          .setTitle('⏱ Cooldown')
          .setDescription(`Actual: **${getCooldownMs()}ms**\n\nMín: 500ms, Máx: 30000ms\n\nUsa \`!cooldown <ms>\` para cambiar.`),
        ],
      });
    }
    const ms = parseInt(newMs, 10);
    if (isNaN(ms) || ms < 500 || ms > 30000) {
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.RED)
          .setTitle('⏱ Cooldown inválido')
          .setDescription('Debe ser un número entre 500 y 30000.'),
        ],
      });
    }
    setCooldownMs(ms);
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.GREEN)
        .setTitle('⏱ Cooldown cambiado')
        .setDescription(`Nuevo intervalo: **${ms}ms**\nSe aplicará al reiniciar el proceso.`),
      ],
    });
  }

  else if (command === '!filter') {
    const sub = args[1];
    if (sub === 'add') {
      const word = content.slice(args[0].length + args[1].length + 2);
      if (!word) return msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.RED).setTitle('❌ Uso').setDescription('`!filter add <palabra>`')] });
      addFilteredWord(word);
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('🔇 Palabra filtrada')
          .setDescription(`"**${word}**" será reemplazada por \`***\` en las letras.`),
        ],
      });
    }
    if (sub === 'remove') {
      const word = content.slice(args[0].length + args[1].length + 2);
      if (!word) return msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.RED).setTitle('❌ Uso').setDescription('`!filter remove <palabra>`')] });
      removeFilteredWord(word);
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('🔇 Filtro eliminado')
          .setDescription(`"**${word}**" ya no será filtrada.`),
        ],
      });
    }
    const list = getFilteredWords();
    const desc = list.length ? list.map(w => `▸ \`${w}\``).join('\n') : '*No hay palabras filtradas.*';
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.PURPLE)
        .setTitle('🔇 Palabras filtradas')
        .setDescription(`${desc}\n\nUsa \`!filter add <palabra>\` o \`!filter remove <palabra>\``),
      ],
    });
  }

  else if (command === '!blacklist') {
    const sub = args[1];
    if (sub === 'add') {
      const pattern = content.slice(args[0].length + args[1].length + 2);
      if (!pattern) return msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.RED).setTitle('❌ Uso').setDescription('`!blacklist add <artista o canción>`')] });
      addToBlacklist(pattern);
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('⛔ Añadido a blacklist')
          .setDescription(`"**${pattern}**" será ignorado.`),
        ],
      });
    }
    if (sub === 'remove') {
      const pattern = content.slice(args[0].length + args[1].length + 2);
      if (!pattern) return msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.RED).setTitle('❌ Uso').setDescription('`!blacklist remove <patrón>`')] });
      removeFromBlacklist(pattern);
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('⛔ Eliminado de blacklist')
          .setDescription(`"**${pattern}**" ya no será ignorado.`),
        ],
      });
    }
    const list = getBlacklist();
    const desc = list.length ? list.map(p => `▸ \`${p}\``).join('\n') : '*No hay elementos en blacklist.*';
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.PURPLE)
        .setTitle('⛔ Blacklist')
        .setDescription(`${desc}\n\nUsa \`!blacklist add <patrón>\` o \`!blacklist remove <patrón>\``),
      ],
    });
  }

  else if (command === '!broadcast') {
    const sub = args[1];
    if (sub === 'remove') {
      clearBroadcastWebhook();
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('📢 Broadcast eliminado')
          .setDescription('Ya no se enviarán letras a ningún webhook.'),
        ],
      });
    }
    if (sub && sub.startsWith('http')) {
      setBroadcastWebhook(sub);
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('📢 Broadcast configurado')
          .setDescription('Las letras se enviarán a ese webhook en tiempo real.'),
        ],
      });
    }
    const current = getBroadcastWebhook();
    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.PURPLE)
        .setTitle('📢 Broadcast')
        .setDescription(current
          ? `Webhook actual: \`${current}\`\n\nUsa \`!broadcast remove\` para eliminarlo.`
          : '*No hay webhook configurado.*\n\nUsa \`!broadcast <url_del_webhook>\` para configurarlo.'),
      ],
    });
  }

  else if (command === '!repeat') {
    const np = readNowplaying();
    if (!np || !np.trackName) return msg.reply({ embeds: [noMusicEmbed()] });
    msg.reply({ embeds: [nowplayingEmbed(np)], components: [controlRow(), modeRow()] });
  }

  else if (command === '!logs') {
    const logOutput = await getPm2Logs();
    const logLines = logOutput.split('\n').filter(l => l.trim());
    const formatted = logLines.map(l => {
      const cleaned = l.replace(/\x1B\[[0-9;]*m/g, '').trim();
      return cleaned.length > 150 ? cleaned.slice(0, 150) + '…' : cleaned;
    }).join('\n').slice(0, 4000);

    msg.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.GREY)
        .setTitle('📋 Últimos logs')
        .setDescription(formatted ? `\`\`\`${formatted}\`\`\`` : '*No hay logs.*')
        .setFooter({ text: `pm2 logs ${PM2_NAME} --lines 30` })
        .setTimestamp(),
      ],
    });
  }

  else if (command === '!help' || command === '!ayuda') {
    msg.reply({ embeds: [helpEmbed()] });
  }
});

client.on('interactionCreate', async (interaction) => {
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
  }
});

client.once('ready', () => {
  console.log(`[Bot] Conectado como ${client.user.tag}`);
  console.log(`[Bot] SO detectado: ${SO_ACTUAL}`);
  console.log(`[Bot] Esperando comandos por DM de tu usuario (${OWNER_ID})…`);

  const savedChannel = getLiveChannelId();
  if (savedChannel) {
    console.log('[Bot] Live channel configurado, reanudando updates.');
    startLiveUpdates(client);
  }
});

client.login(BOT_TOKEN);
