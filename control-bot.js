import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import { COLORS, MODE_NAMES, SO_ACTUAL } from './src/bot/constants.js';
import { pm2Start, pm2Stop, pm2Restart, pm2Reset, getPm2Status } from './src/bot/pm2.js';
import { controlRow, modeRow, buildModeEmbed, onEmbed, offEmbed, restartEmbed, resetEmbed, modeChangedEmbed, noMusicEmbed, errorEmbed, nowplayingEmbed, liveChannelEmbed, liveChannelRemovedEmbed, channelNotFoundEmbed, statusEmbed, helpEmbed, modoDescription } from './src/bot/ui.js';
import { startLiveUpdates, stopLiveUpdates } from './src/bot/live.js';
import { getDisplayMode, setDisplayMode, getLiveChannelId, setLiveChannelId, setLiveMessageId, CONFIG_DIR } from './src/config.js';
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

const VALID_MODES = ['lyrics', 'info', 'progress'];

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

  else if (command === '!status' || command === '!estado') {
    const proc = await getPm2Status();
    msg.reply({ embeds: [statusEmbed(proc)], components: [controlRow(), modeRow()] });
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
    case 'cmd_mode_progress': {
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
