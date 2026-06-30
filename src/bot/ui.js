import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { COLORS, MODE_NAMES, VALID_MODES, SO_ACTUAL } from './constants.js';
import { getDisplayMode, setDisplayMode } from '../config.js';
import { LIVE_UPDATE_INTERVAL_MS } from '../constants.js';

export function modoDescription(mode) {
  const map = { lyrics: 'Letra sincronizada línea por línea', info: 'Solo nombre de canción y artista', progress: 'Barra de progreso con porcentaje' };
  return map[mode] || '';
}

export function controlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_on').setLabel('Encender').setStyle(ButtonStyle.Success).setEmoji('▶️'),
    new ButtonBuilder().setCustomId('cmd_off').setLabel('Apagar').setStyle(ButtonStyle.Danger).setEmoji('⏹️'),
    new ButtonBuilder().setCustomId('cmd_restart').setLabel('Reiniciar').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
    new ButtonBuilder().setCustomId('cmd_status').setLabel('Estado').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
  );
}

export function modeRow() {
  const current = getDisplayMode();
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_mode_lyrics').setLabel('Letras').setStyle(current === 'lyrics' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('🎵'),
    new ButtonBuilder().setCustomId('cmd_mode_info').setLabel('Info').setStyle(current === 'info' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('ℹ️'),
    new ButtonBuilder().setCustomId('cmd_mode_progress').setLabel('Progreso').setStyle(current === 'progress' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('📈'),
  );
}

export function buildModeEmbed(mode) {
  return new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle('🎯 Modo de visualización')
    .setDescription(`Modo actual: **${MODE_NAMES[mode]}**`)
    .addFields(
      { name: '📋 Modos disponibles', value:
        '▸ `lyrics` — Letra sincronizada línea por línea\n' +
        '▸ `info` — Solo nombre de canción y artista\n' +
        '▸ `progress` — Barra de progreso con porcentaje' },
    )
    .setFooter({ text: 'Usa !mode <modo> o los botones de abajo' });
}

// ── Embeds para comandos ─────────────────────────────────────────────────────

export function onEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.GREEN)
    .setTitle('✅ Sistema encendido')
    .setDescription('Las letras ya se están mostrando en tu estado de Discord.')
    .addFields(
      { name: '💻 Plataforma', value: SO_ACTUAL, inline: true },
      { name: '🎯 Modo', value: `**${MODE_NAMES[getDisplayMode()] || getDisplayMode()}**`, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function offEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.RED)
    .setTitle('🛑 Sistema apagado')
    .setDescription('Las letras ya no se muestran en tu estado de Discord.')
    .addFields({ name: '💻 Plataforma', value: SO_ACTUAL, inline: true })
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function restartEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.ORANGE)
    .setTitle('🔄 Proceso reiniciado')
    .setDescription('El sistema se ha reiniciado correctamente.')
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function resetEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.RED)
    .setTitle('🔄 Token eliminado')
    .setDescription('El token se ha borrado. Se abrirá la página de configuración en tu navegador para que ingreses uno nuevo.')
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function modeChangedEmbed(mode) {
  return new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle('🎯 Modo cambiado')
    .setDescription(`Nuevo modo: **${MODE_NAMES[mode]}**`)
    .addFields(
      { name: 'Descripción', value: modoDescription(mode) },
      { name: '⏱ Aplicación', value: 'El cambio se aplicará en el próximo ciclo (~1.5s).' },
    )
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function noMusicEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.GREY)
    .setTitle('🎵 No hay música')
    .setDescription('No se está reproduciendo ninguna canción en este momento.')
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function errorEmbed(err) {
  return new EmbedBuilder()
    .setColor(COLORS.RED)
    .setTitle('❌ Error')
    .setDescription(`\`\`\`${err}\`\`\``);
}

export function nowplayingEmbed(np) {
  const pct = np.durationMs > 0 ? Math.round((np.progressMs / np.durationMs) * 100) : 0;
  const barWidth = 12;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = '▰'.repeat(filled) + '▱'.repeat(barWidth - filled);

  return new EmbedBuilder()
    .setColor(COLORS.SPOTIFY_GREEN)
    .setTitle('🎵 Now Playing')
    .setDescription(`**${np.trackName}** — ${np.artistName}`)
    .addFields(
      { name: '💿 Álbum', value: np.albumName || 'Desconocido', inline: true },
      { name: '🎯 Modo', value: `**${MODE_NAMES[np.mode] || np.mode}**`, inline: true },
      { name: '📊 Progreso', value: `\`${bar}\` **${pct}%**` },
    )
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function liveChannelEmbed(channelMention) {
  return new EmbedBuilder()
    .setColor(COLORS.GREEN)
    .setTitle('📢 Live channel configurado')
    .setDescription(`Ahora se enviarán actualizaciones automáticas a ${channelMention}.`)
    .addFields(
      { name: '📡 Intervalo', value: `Cada ${LIVE_UPDATE_INTERVAL_MS / 1000}s`, inline: true },
      { name: '⏹ Detener', value: '`!np channel remove`', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function liveChannelRemovedEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.RED)
    .setTitle('📢 Live channel eliminado')
    .setDescription('Ya no se enviarán actualizaciones automáticas.')
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function channelNotFoundEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.RED)
    .setTitle('❌ Canal no encontrado')
    .setDescription('No encontré ese canal. Asegúrate de que el bot tenga acceso.')
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function statusEmbed(proc) {
  if (!proc) {
    return new EmbedBuilder()
      .setColor(COLORS.GREY)
      .setTitle('📊 Estado del sistema')
      .setDescription('⚪ El proceso no está registrado en pm2 todavía.')
      .addFields(
        { name: '💻 Plataforma', value: SO_ACTUAL, inline: true },
        { name: '🎯 Modo', value: `**${MODE_NAMES[getDisplayMode()]}**`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Discord Lyrics Status' });
  }

  const isOnline = proc.pm2_env.status === 'online';
  const emoji = isOnline ? '🟢' : '🔴';
  const color = isOnline ? COLORS.GREEN : COLORS.RED;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle('📊 Estado del sistema')
    .addFields(
      { name: `${emoji} Estado`, value: `**${proc.pm2_env.status}**`, inline: true },
      { name: '💻 Plataforma', value: SO_ACTUAL, inline: true },
      { name: '🎯 Modo', value: `**${MODE_NAMES[getDisplayMode()]}**`, inline: true },
      { name: '🆔 PM2 ID', value: `\`${proc.pm_id}\``, inline: true },
      { name: '⏱ Tiempo activo', value: proc.pm2_env.created_at ? `<t:${Math.floor(proc.pm2_env.created_at / 1000)}:R>` : 'Desconocido', inline: true },
      { name: '🔄 Restarts', value: `\`${proc.pm2_env.restart_time || 0}\``, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Discord Lyrics Status' });
}

export function helpEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.DISCORD_BLURPLE)
    .setTitle('📖 Comandos disponibles')
    .setDescription('Envíame estos comandos por **mensaje directo** para controlar el sistema.')
    .addFields(
      { name: '🎵 Reproducción', value:
        '`!on` — Iniciar letras\n' +
        '`!off` — Detener letras\n' +
        '`!restart` — Reiniciar proceso\n' +
        '`!reset` — Resetear token', inline: true },
      { name: '📊 Información', value:
        '`!status` — Estado del sistema\n' +
        '`!np` — Canción actual\n' +
        '`!ping` — Latencia del bot', inline: true },
      { name: '⚙️ Configuración', value:
        '`!mode` — Ver/cambiar modo\n' +
        '`!np channel #canal` — Live channel\n' +
        '`!help` — Mostrar esta ayuda', inline: true },
    )
    .addFields(
      { name: '🎯 Modos de visualización', value:
        '▸ `lyrics` — Letra sincronizada\n' +
        '▸ `info` — Info de canción\n' +
        '▸ `progress` — Barra de progreso' },
    )
    .setFooter({ text: `SO: ${SO_ACTUAL}` })
    .setTimestamp();
}
