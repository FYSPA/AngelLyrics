import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { COLORS, MODE_NAMES, VALID_MODES, SO_ACTUAL, VALID_UI_THEMES, THEME_COLORS } from './constants.js';
import { getDisplayMode, getBackend, VALID_FORMAT_VARS, DEFAULT_FORMATS, getStatusFormat, getUiTheme } from '../config.js';
import { LIVE_UPDATE_INTERVAL_MS } from '../constants.js';

const FOOTER = 'AngelLyrics \u00B7 !help para comandos';

function embed(color, title, desc) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc || null)
    .setTimestamp()
    .setFooter({ text: FOOTER });
}

export function modoDescription(mode) {
  const map = {
    lyrics: 'Letra sincronizada l\u00EDnea por l\u00EDnea',
    info: 'Solo nombre de canci\u00F3n y artista',
    progress: 'Barra de progreso con tiempo',
    compact: 'Barra + tiempo + nombre de canci\u00F3n',
  };
  return map[mode] || '';
}

// ── Botones ──────────────────────────────────────────────────────────────────

export function controlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_on').setLabel('Encender').setStyle(ButtonStyle.Success).setEmoji('\u25B6\uFE0F'),
    new ButtonBuilder().setCustomId('cmd_off').setLabel('Apagar').setStyle(ButtonStyle.Danger).setEmoji('\u23F9\uFE0F'),
    new ButtonBuilder().setCustomId('cmd_restart').setLabel('Reiniciar').setStyle(ButtonStyle.Primary).setEmoji('\uD83D\uDD04'),
    new ButtonBuilder().setCustomId('cmd_status').setLabel('Estado').setStyle(ButtonStyle.Secondary).setEmoji('\uD83D\uDCCA'),
  );
}

export function modeRow() {
  const current = getDisplayMode();
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cmd_mode_lyrics').setLabel('Letras').setStyle(current === 'lyrics' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('\uD83C\uDFB5'),
    new ButtonBuilder().setCustomId('cmd_mode_info').setLabel('Info').setStyle(current === 'info' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('\u2139\uFE0F'),
    new ButtonBuilder().setCustomId('cmd_mode_progress').setLabel('Progreso').setStyle(current === 'progress' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('\uD83D\uDCC8'),
    new ButtonBuilder().setCustomId('cmd_mode_compact').setLabel('Compacto').setStyle(current === 'compact' ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji('\uD83D\uDCF1'),
  );
}

// ── Tema visual ───────────────────────────────────────────────────────────────

export function themeRow() {
  const current = getUiTheme();
  const EMOJI = { classic: '\uD83C\uDFA8', cyberpunk: '\uD83D\uDCA0', minimal: '\u26AA', retro: '\uD83D\uDCFA', gradient: '\uD83C\uDF08' };
  const LABELS = { classic: 'Classic', cyberpunk: 'Cyberpunk', minimal: 'Minimal', retro: 'Retro', gradient: 'Gradient' };
  return new ActionRowBuilder().addComponents(
    ...VALID_UI_THEMES.map(function (t) {
      return new ButtonBuilder()
        .setCustomId('cmd_theme_' + t)
        .setLabel(LABELS[t] || t)
        .setStyle(current === t ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(EMOJI[t] || '');
    })
  );
}

// ── Sistema: encender / apagar / reiniciar / reset ───────────────────────────

export function onEmbed() {
  return embed(COLORS.GREEN, 'Sistema encendido', 'Las letras ya se est\u00E1n mostrando en tu estado de Discord.')
    .addFields(
      { name: 'Plataforma', value: SO_ACTUAL, inline: true },
      { name: 'Modo', value: '**' + (MODE_NAMES[getDisplayMode()] || getDisplayMode()) + '**', inline: true },
    );
}

export function offEmbed() {
  return embed(COLORS.RED, 'Sistema apagado', 'Las letras ya no se muestran en tu estado de Discord.')
    .addFields({ name: 'Plataforma', value: SO_ACTUAL, inline: true });
}

export function restartEmbed() {
  return embed(COLORS.ORANGE, 'Proceso reiniciado', 'El sistema se ha reiniciado correctamente.');
}

export function resetEmbed() {
  return embed(COLORS.RED, 'Token eliminado', 'El token se ha borrado. Se abrir\u00E1 la p\u00E1gina de configuraci\u00F3n en tu navegador para que ingreses uno nuevo.');
}

export function errorEmbed(err) {
  return embed(COLORS.RED, 'Error', '```' + err + '```');
}

// ── Modo de visualizaci├│n ────────────────────────────────────────────────────

export function buildModeEmbed(mode) {
  return embed(COLORS.PURPLE, 'Modo de visualizaci\u00F3n', 'Modo actual: **' + MODE_NAMES[mode] + '**')
    .addFields({
      name: 'Modos disponibles',
      value: [
        '- `lyrics` \u2014 Letra sincronizada l\u00EDnea por l\u00EDnea',
        '- `info` \u2014 Solo nombre de canci\u00F3n y artista',
        '- `progress` \u2014 Barra de progreso con tiempo',
        '- `compact` \u2014 Barra + tiempo + nombre de canci\u00F3n',
      ].join('\n'),
    });
}

export function modeChangedEmbed(mode) {
  return embed(COLORS.PURPLE, 'Modo cambiado', 'Nuevo modo: **' + MODE_NAMES[mode] + '**')
    .addFields(
      { name: 'Descripci\u00F3n', value: modoDescription(mode) },
      { name: 'Aplicaci\u00F3n', value: 'El cambio se aplicar\u00E1 en el pr\u00F3ximo ciclo (~1.5s).' },
    );
}

// ── Reproducci├│n ─────────────────────────────────────────────────────────────

export function noMusicEmbed() {
  return embed(COLORS.GREY, 'No hay m\u00FAsica', 'No se est\u00E1 reproduciendo ninguna canci\u00F3n en este momento.');
}

export function nowplayingEmbed(np) {
  const theme = getUiTheme();
  const themeColor = (THEME_COLORS[theme] || THEME_COLORS.classic).embed;
  const pct = np.durationMs > 0 ? Math.round((np.progressMs / np.durationMs) * 100) : 0;
  const barWidth = 12;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = '\u25B0'.repeat(filled) + '\u25B1'.repeat(barWidth - filled);

  const e = embed(themeColor, 'Now Playing', '**' + np.trackName + '** \u2014 ' + np.artistName)
    .addFields(
      { name: '\u00C1lbum', value: np.albumName || 'Desconocido', inline: true },
      { name: 'Modo', value: '**' + (MODE_NAMES[np.mode] || np.mode) + '**', inline: true },
      { name: 'Tema', value: '**' + theme + '**', inline: true },
      { name: 'Progreso', value: '`' + bar + '` **' + pct + '%**' },
    );

  if (np.albumArtUrl) {
    e.setThumbnail(np.albumArtUrl);
  }
  return e;
}

// ── Live channel ─────────────────────────────────────────────────────────────

export function liveChannelEmbed(channelMention) {
  return embed(COLORS.GREEN, 'Live channel configurado', 'Ahora se enviar\u00E1n actualizaciones autom\u00E1ticas a ' + channelMention + '.')
    .addFields(
      { name: 'Intervalo', value: 'Cada ' + (LIVE_UPDATE_INTERVAL_MS / 1000) + 's', inline: true },
      { name: 'Detener', value: '`!np channel remove`', inline: true },
    );
}

export function liveChannelRemovedEmbed() {
  return embed(COLORS.RED, 'Live channel eliminado', 'Ya no se enviar\u00E1n actualizaciones autom\u00E1ticas.');
}

export function channelNotFoundEmbed() {
  return embed(COLORS.RED, 'Canal no encontrado', 'No encontr\u00E9 ese canal. Aseg\u00FArate de que el bot tenga acceso.');
}

// ── Estado del sistema ───────────────────────────────────────────────────────

export function statusEmbed(proc) {
  if (!proc) {
    return embed(COLORS.GREY, 'Estado del sistema', 'El proceso no est\u00E1 registrado en pm2 todav\u00EDa.')
      .addFields(
        { name: 'Plataforma', value: SO_ACTUAL, inline: true },
        { name: 'Backend', value: '**' + getBackend() + '**', inline: true },
        { name: 'Modo', value: '**' + MODE_NAMES[getDisplayMode()] + '**', inline: true },
      );
  }

  const isOnline = proc.pm2_env.status === 'online';
  const emoji = isOnline ? '\uD83D\uDFE2' : '\uD83D\uDD34';
  const color = isOnline ? COLORS.GREEN : COLORS.RED;

  return embed(color, 'Estado del sistema')
    .addFields(
      { name: emoji + ' Estado', value: '**' + proc.pm2_env.status + '**', inline: true },
      { name: 'SO', value: SO_ACTUAL, inline: true },
      { name: 'Backend', value: '**' + getBackend() + '**', inline: true },
      { name: 'Modo', value: '**' + MODE_NAMES[getDisplayMode()] + '**', inline: true },
      { name: 'PM2 ID', value: '`' + proc.pm_id + '`', inline: true },
      { name: 'Tiempo activo', value: proc.pm2_env.created_at ? '<t:' + Math.floor(proc.pm2_env.created_at / 1000) + ':R>' : 'Desconocido', inline: true },
      { name: 'Restarts', value: '`' + (proc.pm2_env.restart_time || 0) + '`', inline: true },
    );
}

// ── Ayuda ────────────────────────────────────────────────────────────────────

export function helpEmbed() {
  return embed(COLORS.DISCORD_BLURPLE, 'Comandos disponibles', 'Enviame estos comandos por **mensaje directo** para controlar el sistema.')
    .addFields(
      {
        name: 'Reproducci\u00F3n',
        value: '`!on` \u2014 Iniciar letras\n`!off` \u2014 Detener letras\n`!restart` \u2014 Reiniciar\n`!reset` \u2014 Resetear token',
        inline: true,
      },
      {
        name: 'Informaci\u00F3n',
        value: '`!status` \u2014 Estado\n`!np` \u2014 Canci\u00F3n actual\n`!lyrics` \u2014 Karaoke en tiempo real\n`!logs` \u2014 \u00DAltimos logs\n`!repeat` \u2014 Repetir nowplaying\n`!recent` \u2014 Historial\n`!ping` \u2014 Latencia',
        inline: true,
      },
      {
        name: 'Configuraci\u00F3n',
        value: '`!mode` / `!backend` / `!ui` / `!prefix` / `!emoji` / `!style` / `!cooldown` / `!filter` / `!blacklist` / `!format` / `!offset` / `!broadcast` / `!np channel`',
        inline: false,
      },
      {
        name: 'Modos de visualizaci\u00F3n',
        value: '- `lyrics` \u2014 Letra sincronizada\n- `info` \u2014 Info de canci\u00F3n\n- `progress` \u2014 Barra de progreso\n- `compact` \u2014 Barra + tiempo + canci\u00F3n',
      },
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMBEDS DE CONFIGURACI├ôN ÔÇö Info (p├║rpura) / ├ëxito (verde) / Error (rojo)
// ══════════════════════════════════════════════════════════════════════════════

// ── Backend ──────────────────────────────────────────────────────────────────

export function backendInfoEmbed(current) {
  const options = VALID_MODES.map(function (b) {
    return '- `' + b + '`' + (b === current ? ' \u2190 actual' : '');
  }).join('\n');
  return embed(COLORS.PURPLE, 'Backend de detecci\u00F3n', 'Actual: **' + current + '**\n\n' + options + '\n\nUsa `!backend <nombre>` para cambiar.');
}

export function backendChangedEmbed(value) {
  return embed(COLORS.GREEN, 'Backend cambiado', 'Nuevo backend: **' + value + '**\nSe aplicar\u00E1 en el pr\u00F3ximo ciclo (~1.5s).');
}

// ── Emoji ────────────────────────────────────────────────────────────────────

export function emojiInfoEmbed(current) {
  const EMOJI_MAP = {
    musical_note: '\uD83C\uDFB5', musical_score: '\uD83C\uDFBC', microphone: '\uD83C\uDFA4',
    guitar: '\uD83C\uDFB8', headphones: '\uD83C\uDFA7', radio: '\uD83D\uDCFB', star: '\u2B50', none: '(ninguno)',
  };
  const options = Object.keys(EMOJI_MAP).map(function (k) {
    return '- `' + k + '` ' + EMOJI_MAP[k] + (k === current ? ' \u2190 actual' : '');
  }).join('\n');
  const icon = EMOJI_MAP[current] || '';
  return embed(COLORS.PURPLE, 'Emoji del estado', 'Actual: **' + current + '** ' + icon + '\n\n' + options + '\n\nUsa `!emoji <nombre>` para cambiar.');
}

export function emojiChangedEmbed(value) {
  const EMOJI_MAP = {
    musical_note: '\uD83C\uDFB5', musical_score: '\uD83C\uDFBC', microphone: '\uD83C\uDFA4',
    guitar: '\uD83C\uDFB8', headphones: '\uD83C\uDFA7', radio: '\uD83D\uDCFB', star: '\u2B50', none: '',
  };
  const icon = EMOJI_MAP[value] || '';
  return embed(COLORS.GREEN, 'Emoji cambiado', icon + ' Nuevo emoji: **' + value + '**\nSe aplicar\u00E1 en el pr\u00F3ximo ciclo (~1.5s).');
}

// ── Prefijo ──────────────────────────────────────────────────────────────────

export function prefixInfoEmbed(current) {
  const display = current ? '"' + current + '"' : 'Sin prefijo';
  return embed(COLORS.PURPLE, 'Prefijo del texto', 'Actual: **' + display + '**\n\nSe muestra antes de la letra en el estado.\n\nUsa `!prefix <texto>` para cambiar.\nUsa `!prefix remove` para eliminar el prefijo.');
}

export function prefixChangedEmbed(value, preview) {
  var desc;
  if (value) {
    desc = 'Nuevo prefijo: **"' + value + '"**';
    if (preview) {
      desc = desc + '\n\nVista previa: `' + preview + '`';
    }
  } else {
    desc = 'Prefijo eliminado. El status ya no mostrar\u00E1 prefijo.';
  }
  return embed(COLORS.GREEN, 'Prefijo cambiado', desc);
}

// ── Estilo de barra ──────────────────────────────────────────────────────────

export function styleInfoEmbed(current) {
  return embed(COLORS.PURPLE, 'Estilo de barra de progreso', 'Actual: **' + current + '**\n\n- `blocks`  \u25B0\u25B0\u25B0\u25B0\u25B0\u25B1\u25B1\u25B1\u25B1\u25B1\n- `squares` \uD83D\uDFE9\uD83D\uDFE9\uD83D\uDFE9\uD83D\uDFE9\uD83D\uDFE9\u2B1B\u2B1B\u2B1B\u2B1B\u2B1B\n\nUsa `!style <nombre>` para cambiar.');
}

export function styleChangedEmbed(value) {
  const preview = value === 'blocks' ? '\u25B0\u25B0\u25B0\u25B0\u25B0\u25B1\u25B1\u25B1\u25B1\u25B1' : '\uD83D\uDFE9\uD83D\uDFE9\uD83D\uDFE9\uD83D\uDFE9\uD83D\uDFE9\u2B1B\u2B1B\u2B1B\u2B1B\u2B1B';
  return embed(COLORS.GREEN, 'Estilo cambiado', 'Nuevo estilo: **' + value + '**\n`' + preview + '`\nSe aplicar\u00E1 en el pr\u00F3ximo ciclo (~1.5s).');
}

// ── Cooldown ─────────────────────────────────────────────────────────────────

export function cooldownInfoEmbed(current) {
  const pct = Math.round(((current - 500) / (30000 - 500)) * 100);
  const filled = Math.round(pct / 10);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
  return embed(COLORS.PURPLE, 'Intervalo de actualizaci\u00F3n', 'Actual: **' + current + 'ms**\n`' + bar + '`\n\nRango: 500ms \u2014 30000ms\nUsa `!cooldown <ms>` para cambiar.');
}

export function cooldownChangedEmbed(value) {
  return embed(COLORS.GREEN, 'Cooldown cambiado', 'Nuevo intervalo: **' + value + 'ms**\nSe aplicar\u00E1 al reiniciar el proceso.');
}

export function cooldownErrorEmbed() {
  return embed(COLORS.RED, 'Cooldown inv\u00E1lido', 'Debe ser un n\u00FAmero entre **500** y **30000**.\n\nEjemplo: `!cooldown 2000`');
}

// ── Filter ───────────────────────────────────────────────────────────────────

export function filterListEmbed(list) {
  var desc;
  if (list.length) {
    desc = list.map(function (w) { return '- `' + w + '`'; }).join('\n');
  } else {
    desc = 'No hay palabras filtradas.';
  }
  return embed(COLORS.PURPLE, 'Palabras filtradas', desc + '\n\nUsa `!filter add <palabra>` o `!filter remove <palabra>`');
}

export function filterAddedEmbed(word) {
  return embed(COLORS.GREEN, 'Palabra filtrada', '"**' + word + '**" ser\u00E1 reemplazada por `***` en las letras.');
}

export function filterRemovedEmbed(word) {
  return embed(COLORS.GREEN, 'Filtro eliminado', '"**' + word + '**" ya no ser\u00E1 filtrada.');
}

export function filterUsageEmbed() {
  return embed(COLORS.RED, 'Uso incorrecto', '`!filter add <palabra>`\n`!filter remove <palabra>`');
}

// ── Blacklist ────────────────────────────────────────────────────────────────

export function blacklistInfoEmbed(list) {
  var desc;
  if (list.length) {
    desc = list.map(function (p) { return '- `' + p + '`'; }).join('\n');
  } else {
    desc = 'No hay elementos en blacklist.';
  }
  return embed(COLORS.PURPLE, 'Blacklist', desc + '\n\nUsa `!blacklist add <patr\u00F3n>` o `!blacklist remove <patr\u00F3n>`');
}

export function blacklistAddedEmbed(pattern) {
  return embed(COLORS.GREEN, 'A\u00F1adido a blacklist', '"**' + pattern + '**" ser\u00E1 ignorado.');
}

export function blacklistRemovedEmbed(pattern) {
  return embed(COLORS.GREEN, 'Eliminado de blacklist', '"**' + pattern + '**" ya no ser\u00E1 ignorado.');
}

export function blacklistUsageEmbed() {
  return embed(COLORS.RED, 'Uso incorrecto', '`!blacklist add <artista o canci\u00F3n>`\n`!blacklist remove <patr\u00F3n>`');
}

// ── Broadcast ────────────────────────────────────────────────────────────────

export function broadcastInfoEmbed(url) {
  var desc;
  if (url) {
    var short = url.length > 60 ? url.slice(0, 60) + '...' : url;
    desc = 'Webhook: `' + short + '`\n\nUsa `!broadcast remove` para eliminarlo.';
  } else {
    desc = 'No hay webhook configurado.\n\nUsa `!broadcast <url_del_webhook>` para configurarlo.';
  }
  return embed(COLORS.PURPLE, 'Broadcast', desc);
}

export function broadcastSetEmbed() {
  return embed(COLORS.GREEN, 'Broadcast configurado', 'Las letras se enviar\u00E1n a ese webhook en tiempo real.');
}

export function broadcastRemovedEmbed() {
  return embed(COLORS.GREEN, 'Broadcast eliminado', 'Ya no se enviar\u00E1n letras a ning\u00FAn webhook.');
}

// ── Formato ──────────────────────────────────────────────────────────────────

export function formatInfoEmbed(mode, allFormats) {
  const current = getStatusFormat(mode);
  var fmtLines = VALID_MODES.map(function (m) {
    var fmt = allFormats[m];
    return '- **' + m + '**: ' + (fmt ? '`' + fmt + '`' : 'por defecto');
  }).join('\n');

  var desc = 'Modo actual: **' + mode + '**\n';
  desc += current ? 'Formato: `' + current + '`' : 'Usando formato por defecto.';
  desc += '\n\n' + fmtLines + '\n\n';
  desc += '**Variables:**\n`' + VALID_FORMAT_VARS.join(' ') + '`\n\n';
  desc += '**Uso:**\n- `!format <template>` \u2014 global\n- `!format <modo> <template>` \u2014 por modo\n- `!format reset` \u2014 restablecer';

  return embed(COLORS.PURPLE, 'Formato de estado', desc);
}

export function formatChangedEmbed(format, mode) {
  var label = mode ? 'para **' + mode + '**' : 'global';
  return embed(COLORS.GREEN, 'Formato cambiado', 'Nuevo formato ' + label + ': `' + format + '`');
}

export function formatResetEmbed(mode) {
  var label = mode ? 'para **' + mode + '**' : 'global';
  return embed(COLORS.GREEN, 'Formato restablecido', 'Formato ' + label + ' vuelto al predeterminado.');
}

// ── Offset ───────────────────────────────────────────────────────────────────

export function offsetInfoEmbed(current) {
  var desc = 'Actual: **' + current + 'ms**\n\n';
  desc += 'Ajusta la sincron\u00EDa de letras en milisegundos.\n';
  desc += '- **Positivo** \u2192 retrasa la letra\n- **Negativo** \u2192 adelanta la letra\n';
  desc += 'Rango: -10000 a 10000\n\n';
  desc += 'Usa `!offset <ms>` o `!offset reset`.';
  return embed(COLORS.PURPLE, 'Offset de letras', desc);
}

export function offsetChangedEmbed(value) {
  return embed(COLORS.GREEN, 'Offset cambiado', 'Nuevo offset: **' + value + 'ms**\nSe aplicar\u00E1 en la pr\u00F3xima canci\u00F3n.');
}

export function offsetErrorEmbed() {
  return embed(COLORS.RED, 'Offset inv\u00E1lido', 'Debe ser un n\u00FAmero entre **-10000** y **10000**.\n\nEjemplo: `!offset -500`');
}

// ── Recientes ────────────────────────────────────────────────────────────────

export function recentEmptyEmbed() {
  return embed(COLORS.GREY, 'Recientes', 'No hay canciones en el historial.');
}

export function recentListEmbed(tracks) {
  var desc = tracks.map(function (t, i) {
    var d = new Date(t.at);
    var time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    return '`' + (i + 1) + '.` **' + t.trackName + '** \u2014 ' + t.artistName + ' (' + time + ')';
  }).join('\n');

  return new EmbedBuilder()
    .setColor(COLORS.GREY)
    .setTitle('\u00DAltimas canciones')
    .setDescription(desc)
    .setTimestamp()
    .setFooter({ text: 'Total: ' + tracks.length + '/20 \u00B7 ' + FOOTER });
}

// ── Karaoke ──────────────────────────────────────────────────────────────────

const KARAOKE_AROUND = 2;

export function karaokeEmbed(np) {
  const theme = getUiTheme();
  const themeColor = (THEME_COLORS[theme] || THEME_COLORS.classic).embed;
  const lines = np.lyricLines || [];
  const idx = np.lyricIndex != null ? np.lyricIndex : -1;

  if (!lines.length || idx < 0) {
    return embed(themeColor, '\uD83C\uDFA4 ' + np.trackName + ' \u2014 ' + np.artistName, 'Esperando letras\u2026');
  }

  const start = Math.max(0, idx - KARAOKE_AROUND);
  const end = Math.min(lines.length, idx + KARAOKE_AROUND + 1);
  const parts = [];

  for (let i = start; i < end; i++) {
    const text = lines[i].text || '';
    if (i < idx) {
      parts.push('~~' + escDiscord(text) + '~~');
    } else if (i === idx) {
      parts.push('\u25B6 **' + escDiscord(text) + '**');
    } else {
      parts.push('   ' + escDiscord(text));
    }
  }

  const desc = parts.join('\n');
  const pct = np.durationMs > 0 ? Math.round((np.progressMs / np.durationMs) * 100) : 0;
  const barWidth = 10;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = '\u25B0'.repeat(filled) + '\u25B1'.repeat(barWidth - filled);
  const tCur = formatTime(np.progressMs);
  const tTotal = formatTime(np.durationMs);
  const footerText = bar + '  ' + tCur + ' / ' + tTotal + '  ' + pct + '%';

  return new EmbedBuilder()
    .setColor(themeColor)
    .setTitle('\uD83C\uDFA4 ' + np.trackName + ' \u2014 ' + np.artistName)
    .setDescription(desc)
    .setFooter({ text: footerText + ' \u00B7 ' + FOOTER })
    .setTimestamp();
}

function escDiscord(str) {
  return String(str).replace(/[\\`*_~|]/g, '\\$&');
}

function formatTime(ms) {
  if (!ms || ms <= 0) return '0:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// ── UI Theme ──────────────────────────────────────────────────────────────────

const THEME_DESC = {
  classic: 'Sin imagen generada, embed cl\u00E1sico con thumbnail',
  cyberpunk: 'Neon grid, glow pink/cyan, estilo cyberpunk',
  minimal: 'Fondo oscuro liso, texto blanco/gris, sin decoraciones',
  retro: 'Estilo CRT, scan lines, texto verde monospace',
  gradient: 'Fondo degradado p\u00FArpura/azul, texto blanco',
};

export function themeInfoEmbed(current) {
  const options = VALID_UI_THEMES.map(function (t) {
    return '- `' + t + '` \u2014 ' + (THEME_DESC[t] || '') + (t === current ? ' \u2190 actual' : '');
  }).join('\n');
  return embed(COLORS.PURPLE, 'Tema visual', 'Actual: **' + current + '**\n\n' + options + '\n\nUsa `!ui <tema>` para cambiar.');
}

export function themeChangedEmbed(value) {
  return embed(COLORS.GREEN, 'Tema cambiado', 'Nuevo tema: **' + value + '**\n' + (THEME_DESC[value] || ''));
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export function logsEmbed(text, source) {
  if (!text) {
    return embed(COLORS.GREY, '\u00DAltimos logs', 'No hay logs.');
  }
  return embed(COLORS.GREY, '\u00DAltimos logs', '```' + text + '```')
    .setFooter({ text: (source || 'pm2') + ' \u00B7 ' + FOOTER });
}

// ── Ping ─────────────────────────────────────────────────────────────────────

export function pingEmbed() {
  return embed(COLORS.GREY, 'Pong...', 'Calculando latencia...');
}

export function pingResultEmbed(latency, wsPing) {
  return embed(COLORS.GREEN, 'Pong!', '**' + latency + 'ms**')
    .setFooter({ text: 'WebSocket: ' + wsPing + 'ms \u00B7 ' + FOOTER });
}
