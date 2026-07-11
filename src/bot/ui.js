import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { COLORS, MODE_NAMES, VALID_MODES, SO_ACTUAL, VALID_UI_THEMES, THEME_COLORS } from './constants.js';
import { getDisplayMode, getBackend, VALID_FORMAT_VARS, DEFAULT_FORMATS, getStatusFormat, getUiTheme } from '../config.js';
import { LIVE_UPDATE_INTERVAL_MS, PROGRESS_BAR_WIDTH_EMBED, PROGRESS_BAR_WIDTH_KARAOKE } from '../constants.js';

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
    new ButtonBuilder().setCustomId('cmd_repeat').setLabel('Repetir').setStyle(ButtonStyle.Secondary).setEmoji('\uD83D\uDD01'),
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
  const pct = np.durationMs > 0 ? Math.min(100, Math.round((np.progressMs / np.durationMs) * 100)) : 0;
  const barWidth = PROGRESS_BAR_WIDTH_EMBED;
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
        value: '`!status` \u2014 Estado\n`!np` \u2014 Canci\u00F3n actual\n`!lyrics` \u2014 Karaoke en tiempo real\n`!logs` \u2014 \u00DAltimos logs\n`!repeat` \u2014 Repetir nowplaying\n`!recent` \u2014 Historial\n`!ping` \u2014 Latencia\n`!debug` / `!diag` \u2014 Diagn\u00F3stico SMTC\n`!diagnostico` \u2014 Embed completo',
        inline: true,
      },
      {
        name: 'Configuraci\u00F3n',
        value: '`!mode` / `!backend` / `!ui` / `!prefix` / `!emoji` / `!style` / `!cooldown` / `!filter` / `!blacklist` / `!format` / `!format override` / `!offset` / `!resync` / `!nudge` / `!broadcast` / `!np channel`',
        inline: false,
      },
      {
        name: 'Estad\u00EDsticas',
        value: '`!stats` \u2014 Ver estad\u00EDsticas de escucha\n`!stats reset` \u2014 Reiniciar datos',
        inline: false,
      },
      {
        name: 'Modos de visualizaci\u00F3n',
        value: '- `lyrics` \u2014 Letra sincronizada\n- `info` \u2014 Info de canci\u00F3n\n- `progress` \u2014 Barra de progreso\n- `compact` \u2014 Barra + tiempo + canci\u00F3n',
      },
      {
        name: 'Generaci\u00F3n de im\u00E1genes',
        value: '`!np` genera una imagen con car\u00E1tula y letra en **Linux** con tema visual no-cl\u00E1sico. Cambia con `!ui`.',
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

export function formatOverrideAddedEmbed(type, name, template) {
  var preview = template.replace(/{(\w+)}/g, '`{$1}`');
  return embed(COLORS.GREEN, 'Override a\u00F1adido', 'Para **' + type + ': ' + name + '**\nFormato: `' + template + '`\n\nPreview: ' + preview);
}

export function formatOverrideRemovedEmbed(type, name) {
  return embed(COLORS.GREEN, 'Override eliminado', 'Para **' + type + ': ' + name + '**');
}

export function formatOverrideListEmbed(overrides) {
  var keys = Object.keys(overrides);
  if (!keys.length) {
    return embed(COLORS.PURPLE, 'Format overrides', 'No hay overrides configurados.\n\nUsa `!format override add <artist|album|track> <nombre> <template>`');
  }
  var desc = keys.map(function (k) { return '- `' + k + '`: ' + overrides[k]; }).join('\n');
  return embed(COLORS.PURPLE, 'Format overrides (' + keys.length + ')', desc);
}

// ── Statistics ───────────────────────────────────────────────────────────────

export function statsEmbed(stats) {
  if (!stats || !stats.totalTracks) {
    return embed(COLORS.GREY, 'Estad\u00EDsticas', 'No hay datos de escucha todav\u00EDa.');
  }
  var tracks = Object.values(stats.tracks).sort(function (a, b) { return b.count - a.count; });
  var top5 = tracks.slice(0, 5).map(function (t, i) {
    var plays = t.count + 'x';
    return '`' + (i + 1) + '.` **' + t.name + '** \u2014 ' + t.artist + ' (' + plays + ')';
  }).join('\n') || '(sin datos)';

  var totalHours = Math.round(stats.totalTimeMs / 3600000);
  var desc = '**Canciones reproducidas:** ' + stats.totalTracks + '\n';
  desc += '**Tiempo total:** ~' + totalHours + 'h\n';
  desc += '**Canciones \u00FAnicas:** ' + Object.keys(stats.tracks).length + '\n\n';
  desc += '**M\u00E1s escuchadas:**\n' + top5;

  return embed(COLORS.SPOTIFY_GREEN, 'Estad\u00EDsticas de escucha', desc);
}

export function statsResetEmbed() {
  return embed(COLORS.RED, 'Estad\u00EDsticas reiniciadas', 'Todos los datos de escucha han sido borrados.');
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
  const pct = np.durationMs > 0 ? Math.min(100, Math.round((np.progressMs / np.durationMs) * 100)) : 0;
  const barWidth = PROGRESS_BAR_WIDTH_KARAOKE;
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

// ── Diagnóstico ─────────────────────────────────────────────────────────────

function findLineAt(lyrics, positionMs) {
  if (!lyrics || !lyrics.length || positionMs == null) return null;
  let lo = 0, hi = lyrics.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lyrics[mid].timeMs <= positionMs) { idx = mid; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  return idx >= 0 ? { line: lyrics[idx], index: idx } : null;
}

function bar(filled, total, width, char) {
  const f = Math.round((filled / Math.max(1, total)) * width);
  return char.repeat(Math.min(f, width)) + '\u25B1'.repeat(Math.max(0, width - Math.min(f, width)));
}

export function diagnosticEmbed(np) {
  const theme = getUiTheme();
  const themeColor = (THEME_COLORS[theme] || THEME_COLORS.classic).embed;

  // ── datos básicos ──
  const schedMs = np.progressMs || 0;
  const rawMs = np.lastRawProgressMs != null ? np.lastRawProgressMs : -1;
  const durMs = np.durationMs || 1;
  const durFmt = formatTime(durMs);

  const now = Date.now();
  const elapsedSincePoll = np.lastPollTime ? (now - np.lastPollTime) : 0;

  // ── scheduler ──
  const schedPct = Math.min(100, Math.round((schedMs / durMs) * 100));
  const schedBarW = 14;
  const schedBar = bar(schedMs, durMs, schedBarW, '\u25B0');
  const schedStr = formatTime(schedMs) + ' / ' + durFmt;

  // ── SMTC ──
  const smtcActive = rawMs > 0;
  const smtcStalled = elapsedSincePoll > 2000 && rawMs >= 0 && rawMs < 2000;
  let smtcStatus, smtcIcon;
  if (!smtcActive && smtcStalled) {
    smtcStatus = '\u274C estancada';
    smtcIcon = '\u274C';
  } else if (smtcActive && elapsedSincePoll < 5000) {
    smtcStatus = '\u2705 activa';
    smtcIcon = '\u2705';
  } else if (rawMs >= 0) {
    smtcStatus = '\u26A0\uFE0F lenta';
    smtcIcon = '\u26A0\uFE0F';
  } else {
    smtcStatus = 'N/A';
    smtcIcon = '\u2753';
  }
  const smtcStr = rawMs >= 0 ? formatTime(rawMs) : 'N/A';

  // ── drift ──
  const driftMs = rawMs >= 0 ? (schedMs - rawMs) : 0;
  const driftSec = (driftMs / 1000).toFixed(1);
  let driftType;
  if (rawMs < 0) {
    driftType = 'SIN DATOS';
  } else if (Math.abs(driftMs) < 2000) {
    driftType = '\u2705 SINCRONIZADO';
  } else if (driftMs > 0) {
    driftType = '\u23ED\uFE0F ADELANTADO (scheduler > SMTC)';
  } else {
    driftType = '\u23EE\uFE0F ATRASADO (scheduler < SMTC)';
  }

  // ── gap bars ──
  const gapW = 30;
  const outerW = gapW + 16;
  const rawBar = bar(rawMs >= 0 ? rawMs : 0, durMs, gapW, '\u25A0');
  const schedGapBar = bar(schedMs, durMs, gapW, '\u25A0');
  const driftDir = driftMs >= 0 ? '+' : '';
  const diffBarW = 10;
  const diffFilled = Math.min(diffBarW, Math.round((Math.abs(driftMs) / durMs) * diffBarW));
  const diffBar = '\u25A0'.repeat(diffFilled) + '\u25B1'.repeat(diffBarW - diffFilled);

  // ── letras ──
  const lines = np.lyricLines || [];
  const totalL = lines.length;
  const idx = np.lyricIndex != null ? np.lyricIndex : -1;

  // línea del scheduler
  let schedLineText = 'N/A';
  let schedNextText = 'N/A';
  if (idx >= 0 && idx < lines.length) {
    schedLineText = 'L' + (idx + 1) + '/' + totalL + ' \u2014 ' + escDiscord(lines[idx].text || '');
    if (idx + 1 < lines.length) {
      const rem = Math.max(0, (lines[idx + 1].timeMs - schedMs) / 1000);
      schedNextText = 'L' + (idx + 2) + ' en ' + rem.toFixed(1) + 's \u2014 ' + escDiscord(lines[idx + 1].text || '');
    } else {
      schedNextText = '(final de la canci\u00F3n)';
    }
  } else if (totalL > 0) {
    schedLineText = 'Esperando letra\u2026';
    schedNextText = '\u2014';
  }

  // línea real estimada (corregida con desfase)
  const realPosMs = rawMs >= 0 ? rawMs : schedMs;
  const realResult = findLineAt(lines, realPosMs);
  let realLineText = 'N/A (sin letras)';
  let realNextText = '';
  if (realResult && totalL > 0) {
    const rIdx = realResult.index;
    realLineText = 'L' + (rIdx + 1) + '/' + totalL + ' \u2014 ' + escDiscord(realResult.line.text || '');
    if (rIdx + 1 < lines.length) {
      const rem = Math.max(0, (lines[rIdx + 1].timeMs - realPosMs) / 1000);
      realNextText = 'L' + (rIdx + 2) + ' en ' + rem.toFixed(1) + 's \u2014 ' + escDiscord(lines[rIdx + 1].text || '');
    } else {
      realNextText = '(final de la canci\u00F3n)';
    }
  }

  // ── gap de líneas ──
  const schedLineIdx = idx >= 0 ? idx + 1 : '?';
  const realLineIdx = realResult ? realResult.index + 1 : '?';
  const schedLineShort = idx >= 0 && idx < lines.length ? escDiscord((lines[idx].text || '').slice(0, 40)) : 'N/A';
  const realLineShort = realResult ? escDiscord((realResult.line.text || '').slice(0, 40)) : 'N/A';

  // ── precisión ──
  const rawForPrecision = rawMs >= 0 ? rawMs : schedMs;
  const precDrift = Math.abs(schedMs - rawForPrecision);
  const precVal = Math.max(0, Math.min(100, Math.round(100 - (precDrift / 1000) * 4)));
  const precBar = '\u25A0'.repeat(Math.round(precVal / 10)) + '\u25B1'.repeat(Math.max(0, 10 - Math.round(precVal / 10)));

  // ── recomendación ──
  let reco;
  const absDriftSec = Math.abs(driftMs) / 1000;
  if (rawMs < 0) {
    reco = 'No hay datos de SMTC. Revisa que Spotify est\u00E9 reproduciendo.';
  } else if (rawMs < 2000 && schedMs > 5000) {
    reco = 'SMTC estancado en 0. Usa `!resync <segundos>` con la posici\u00F3n aproximada para forzar.';
  } else if (absDriftSec < 2) {
    reco = 'Todo OK, leve drift normal.';
  } else if (absDriftSec < 5) {
    reco = 'Desfase leve. Usa `!offset ' + (driftMs > 0 ? '-' : '+') + Math.round(absDriftSec * 1000) + 'ms` para ajustar.';
  } else {
    reco = 'Desfase grande. Usa `!resync ' + Math.round(schedMs / 1000) + '` o `!restart` para recalibrar.';
  }

  // ── construir embed ──
  const desc = [
    '═══════════════════════════════════════',
    '\uD83D\uDD27 DIAGN\u00D3STICO DE SINCRONIZACI\u00D3N',
    '═══════════════════════════════════════',
    '',
    '\uD83D\uDCC0 CANCI\u00D3N:',
    np.artistName + ' \u2014 **' + np.trackName + '**',
    'Duraci\u00F3n: ' + durFmt,
    '',
    '\u2500' .repeat(45),
    '',
    '\u23F1\uFE0F TIEMPOS CRUDOS (fuentes reales):',
    '',
    '  Fuente          | Posici\u00F3n     | Estado',
    '  ' + '\u2500'.repeat(16) + '\u253C' + '\u2500'.repeat(14) + '\u253C' + '\u2500'.repeat(7),
    '  Scheduler       | ' + schedStr.padEnd(13) + '| ' + bar(schedMs, durMs, 8, '\u25B0'),
    '  SMTC (Spotify)  | ' + smtcStr.padEnd(13) + '| ' + smtcStatus,
    '  ' + '\u2500'.repeat(16) + '\u2534' + '\u2500'.repeat(14) + '\u2534' + '\u2500'.repeat(7),
    '',
    '\u2500' .repeat(45),
    '',
    '\uD83D\uDCD0 DESFASE ANALIZADO:',
    '',
    '  Tipo: ' + driftType,
    '',
    '  Scheduler vs SMTC: ' + (driftMs >= 0 ? '+' : '') + driftSec + 's',
    '',
    '  \u250C' + '\u2500'.repeat(outerW) + '\u2510',
    '  \u2502 SMTC real:    ' + rawBar + ' \u2502',
    '  \u2502 Scheduler:     ' + schedGapBar + ' \u2502  \u2190 gap',
    '  \u2502' + ' '.repeat(outerW) + '\u2502',
    '  \u2502 Diferencia:   ' + diffBar.padEnd(gapW) + ' \u2502  = ' + (driftMs >= 0 ? '+' : '') + driftSec + 's',
    '  \u2514' + '\u2500'.repeat(outerW) + '\u2518',
    '',
    '\u2500' .repeat(45),
    '',
    '\uD83C\uDFA4 LETRA SEG\u00DAN SCHEDULER (lo que \u00E9L cree):',
    '',
    '  L\u00EDnea actual:  ' + schedLineText,
    '  Siguiente:     ' + schedNextText,
    '',
    (rawMs < 2000 && schedMs > 5000 ? '  \u26A0\uFE0F ADVERTENCIA: SMTC estancado, la letra "real" abajo NO es precisa.\n' : ''),
    '\uD83C\uDFAF LETRA REAL ESTIMADA (corregida con desfase):',
    '',
    '  Si aplicamos el desfase de ' + driftSec + 's:',
    '',
    '  L\u00EDnea real ahora:     ' + realLineText,
    '  Siguiente real:       ' + realNextText,
    '',
    '  \uD83D\uDCCD El scheduler va por L' + schedLineIdx + ', pero SMTC marca L' + realLineIdx,
    '',
    '\u2500' .repeat(45),
    '',
    '\uD83D\uDCCA RESUMEN DEL GAP:',
    '',
    '  \u250C' + '\u2500'.repeat(outerW) + '\u2510',
    '  \u2502 Scheduler dice:  "' + (schedLineShort.length > outerW - 23 ? schedLineShort.slice(0, outerW - 26) + '...' : schedLineShort).padEnd(outerW - 3) + ' \u2502',
    '  \u2502     \u2191' + ' '.repeat(outerW - 9) + '\u2502',
    '  \u2502     \u2502  desfase de ' + (driftMs >= 0 ? '+' : '') + driftSec + 's' + ' '.repeat(outerW - 21 - driftSec.length) + ' \u2502',
    '  \u2502     \u2193' + ' '.repeat(outerW - 9) + '\u2502',
    '  \u2502 SMTC dice:     "' + (realLineShort.length > outerW - 23 ? realLineShort.slice(0, outerW - 26) + '...' : realLineShort).padEnd(outerW - 3) + ' \u2502',
    '  \u2514' + '\u2500'.repeat(outerW) + '\u2518',
    '',
    '  Precisi\u00F3n: ' + precBar + ' ' + precVal + '%' + (precVal >= 80 ? ' \u2705' : precVal >= 50 ? ' \u26A0\uFE0F' : ' \u274C'),
    '',
    '\u2500' .repeat(45),
    '',
    '\uD83D\uDCA1 ACCI\u00D3N RECOMENDADA:',
    '',
    '  ' + reco,
    '',
    '═══════════════════════════════════════',
  ];

  return new EmbedBuilder()
    .setColor(themeColor)
    .setTitle('\uD83C\uDFB5 DIAGN\u00D3STICO DE SINCRONIZACI\u00D3N')
    .setDescription(desc.join('\n'))
    .setTimestamp()
    .setFooter({ text: FOOTER });
}

// ── Debug con análisis ───────────────────────────────────────────────────────

export function debugReport(np) {
  const schedMs = np.progressMs || 0;
  const rawMs = np.lastRawProgressMs != null ? np.lastRawProgressMs : -1;
  const durMs = np.durationMs || 1;
  const now = Date.now();
  const elapsedSincePoll = np.lastPollTime ? (now - np.lastPollTime) : 99999;

  const lines = np.lyricLines || [];
  const idx = np.lyricIndex != null ? np.lyricIndex : -1;
  const totalL = lines.length;

  const schedFmt = formatTime(schedMs);
  const rawFmt = rawMs >= 0 ? formatTime(rawMs) : '--:--';
  const durFmt2 = formatTime(durMs);

  // scheduler current & next line
  let schedLineText = '???';
  let schedLineTime = 0;
  if (idx >= 0 && idx < lines.length) {
    schedLineText = lines[idx].text || '';
    schedLineTime = lines[idx].timeMs;
  }

  let nextSec = null;
  let nextLineText = '';
  if (idx >= 0 && idx + 1 < lines.length) {
    nextSec = Math.max(0, (lines[idx + 1].timeMs - schedMs) / 1000);
    nextLineText = lines[idx + 1].text || '';
  }

  // real line by SMTC
  let realResult = null;
  if (rawMs > 0) realResult = findLineAt(lines, rawMs);

  const driftMs = rawMs >= 0 ? (schedMs - rawMs) : null;
  const absDrift = driftMs != null ? Math.abs(driftMs) / 1000 : null;

  // smtc state
  const smtcMuerto = rawMs >= 0 && rawMs < 500 && schedMs > 5000;
  const smtcVivo = rawMs > 2000 && elapsedSincePoll < 5000;
  const smtcLento = rawMs > 0 && !smtcMuerto && !smtcVivo;

  const out = [];

  function L(t) { out.push(t); }
  function esc(t) { return escDiscord(String(t || '')); }

  // ═══════════ header ═══════════
  L('```');
  L('\u2550'.repeat(47));
  L(esc(np.trackName) + ' \u2014 ' + esc(np.artistName));
  L('\u2550'.repeat(47));
  L('');

  // ═══════════ sources ═══════════
  L('FUENTES DE TIEMPO:');
  L('  Scheduler: ' + schedFmt + ' \u2014 reloj interno del bot');
  L('  SMTC (Spotify): ' + rawFmt + ' \u2014 ' + (rawMs >= 0 ? 'lo que Windows lee de Spotify' : 'no disponible'));
  if (np.sourceApp) {
    L('  App: ' + np.sourceApp + (np.sourceApp.toLowerCase().includes('spotify') ? '' : ' (navegador/otro)'));
  }
  L('');

  // ═══════════ SMTC analysis ═══════════
  L('AN\u00C1LISIS DEL SMTC:');
  L('');

  if (smtcMuerto) {
    L('  El SMTC est\u00E1 **MUERTO**. Windows no est\u00E1 reportando posici\u00F3n de');
    L('  Spotify. Estancado en 0:00 desde hace ' + Math.round(elapsedSincePoll / 1000) + ' segundos.');
    L('');
    L('  Esto pasa cuando:');
    L('  \u2022 Spotify est\u00E1 minimizado a bandeja sin ventana visible');
    L('  \u2022 Windows decidi\u00F3 no exponer los metadatos de sesi\u00F3n');
    L('  \u2022 Hay otra app de audio peleando el control del SMTC');
    L('');
    L('  **CONSECUENCIA:** El bot no tiene referencia. El scheduler');
    L('  sigue corriendo con su propio reloj, pero no sabe si va');
    L('  adelantado o atrasado respecto a la realidad.');
    L('');
    L('  El desfase que muestra el coso ese es **FICTICIO** porque');
    L('  compara el scheduler contra 0, no contra la posici\u00F3n real.');
    L('  Con SMTC en 0, todo desfase es mentira.');
  } else if (smtcVivo) {
    L('  El SMTC est\u00E1 **VIVO**. Reportando posici\u00F3n normalmente.');
    L('  Windows lee Spotify correctamente.');
    L('');

    if (absDrift != null && absDrift < 2) {
      L('  Desfase scheduler vs Spotify: ' + (driftMs >= 0 ? '+' : '') + absDrift.toFixed(1) + 's.');
      L('  Dentro de margen aceptable. Drift normal por latencia de polling.');
    } else if (absDrift != null && absDrift <= 5) {
      L('  Desfase scheduler vs Spotify: ' + (driftMs >= 0 ? '+' : '') + absDrift.toFixed(1) + 's.');
      L('  El scheduler va ' + (driftMs > 0 ? 'adelantado' : 'atrasado') + '. Hay desfase pero');
      L('  no es cr\u00EDtico. Posible seek no detectado o drift acumulado.');
    } else if (absDrift != null) {
      L('  Desfase scheduler vs Spotify: ' + (driftMs >= 0 ? '+' : '') + absDrift.toFixed(1) + 's.');
      L('  **Desfase cr\u00EDtico.** El scheduler va ' + (driftMs > 0 ? 'adelantado' : 'atrasado'));
      L('  por m\u00E1s de 5 segundos. Probable seek no detectado o error de');
      L('  sincronizaci\u00F3n inicial.');
    }
  } else if (smtcLento) {
    L('  El SMTC est\u00E1 **VIVO pero LENTO**. Windows actualiza la posici\u00F3n');
    L('  pero no en tiempo real. El scheduler se desv\u00EDa progresivamente');
    L('  porque conf\u00EDa en su propio reloj mientras el SMTC va atrasado.');
    L('');
    if (absDrift != null) {
      L('  DRIFT ACUMULADO: ' + absDrift.toFixed(1) + ' segundos. Cada segundo que');
      L('  pasa, el scheduler se adelanta m\u00E1s respecto a la realidad.');
    }
  } else {
    L('  No se puede determinar el estado del SMTC. Datos insuficientes.');
  }

  L('');

  // ═══════════ scheduler lyric ═══════════
  L('LETRA QUE EL SCHEDULER CREE:');
  if (idx >= 0 && idx < lines.length) {
    L('  L\u00EDnea ' + (idx + 1) + ': "' + esc(schedLineText) + '" @ ' + formatTime(schedLineTime));
  } else {
    L('  (sin letras cargadas o esperando)');
  }
  if (nextSec != null) {
    L('  Pr\u00F3xima en ' + nextSec.toFixed(1) + 's \u2014 "' + esc(nextLineText) + '"');
  }
  L('');

  // ═══════════ real lyric ═══════════
  L('LETRA REAL (solo si SMTC vivo):');
  if (smtcMuerto || rawMs <= 0) {
    L('  **DESCONOCIDA.** Sin referencia no se puede saber. El scheduler');
    L('  puede estar mostrando una l\u00EDnea que no corresponde a la realidad.');
  } else if (realResult) {
    L('  L\u00EDnea ' + (realResult.index + 1) + ': "' + esc(realResult.line.text || '') + '" @ ' + formatTime(realResult.line.timeMs));
  } else {
    L('  No hay letras cargadas para esta posici\u00F3n.');
  }
  L('');

  // ═══════════ final diagnosis ═══════════
  L('DIAGN\u00D3STICO FINAL:');
  if (smtcMuerto || rawMs <= 0) {
    L('  El scheduler va por ' + schedFmt + '. Spotify reporta ' + rawFmt + ' (inv\u00E1lido).');
    L('  El gap es **INCALCULABLE** porque Spotify no reporta posici\u00F3n.');
    L('  Cualquier n\u00FAmero de desfase que hayas visto antes era ficticio:');
    L('  comparaba el scheduler contra 0, no contra la realidad.');
  } else if (driftMs != null) {
    L('  El scheduler va por ' + schedFmt + '. Spotify va por ' + rawFmt + '.');
    L('  Gap: ' + (driftMs >= 0 ? '+' : '') + absDrift.toFixed(1) + ' segundos ' + (driftMs > 0 ? 'adelantado.' : 'atrasado.'));
  }
  L('');

  // ═══════════ recommendation ═══════════
  L('RECOMENDACI\u00D3N:');
  if (smtcMuerto) {
    L('  Reproducir/pausar en Spotify para despertar el SMTC.');
    L('  Si persiste, cerrar Spotify y abrirlo con ventana visible,');
    L('  no minimizado a la bandeja. El SMTC necesita una sesi\u00F3n');
    L('  activa en Windows para reportar posici\u00F3n.');
    L('');
    L('  Mientras tanto, pod\u00E9s usar `!resync <segundos>` para forzar');
    L('  una posici\u00F3n aproximada, pero sin SMTC vivo va a ser');
    L('  siempre a ciegas.');
  } else if (smtcLento || (absDrift != null && absDrift > 5)) {
    L('  Usar `!restart` para recalibrar el scheduler. Si el SMTC');
    L('  est\u00E1 lento pero responde, `!offset +/-' + Math.round(absDrift != null ? absDrift * 1000 : 0) + 'ms`');
    L('  puede ajustar el desfase manualmente.');
  } else if (absDrift != null && absDrift >= 2) {
    L('  Usar `!offset ' + (driftMs > 0 ? '-' : '+') + Math.round(absDrift * 1000) + 'ms` para ajuste fino.');
    L('  Si el desfase vuelve a aparecer, considerar `!restart`.');
  } else {
    L('  Dentro de margen. No requiere acci\u00F3n.');
  }

  L('');
  L('\u2550'.repeat(47));
  L('```');

  return out.join('\n');
}

// ── Ping ─────────────────────────────────────────────────────────────────────

export function pingEmbed() {
  return embed(COLORS.GREY, 'Pong...', 'Calculando latencia...');
}

export function pingResultEmbed(latency, wsPing) {
  return embed(COLORS.GREEN, 'Pong!', '**' + latency + 'ms**')
    .setFooter({ text: 'WebSocket: ' + wsPing + 'ms \u00B7 ' + FOOTER });
}
