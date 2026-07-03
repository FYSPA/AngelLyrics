import { platform } from 'os';

export const SO_ACTUAL = platform() === 'win32' ? 'Windows' : platform() === 'linux' ? 'Linux' : platform();
export const PM2_NAME = 'discord-lyrics';

export const COLORS = {
  DISCORD_BLURPLE: 0x5865F2,
  SPOTIFY_GREEN: 0x1DB954,
  GREEN: 0x23A55A,
  RED: 0xDA373C,
  ORANGE: 0xF57C00,
  PURPLE: 0x9B59B6,
  GREY: 0x95A5A6,
};

export const VALID_MODES = ['lyrics', 'info', 'progress', 'compact'];
export const MODE_NAMES = { lyrics: 'Letras', info: 'Información', progress: 'Progreso', compact: 'Compacto' };

export const VALID_UI_THEMES = ['classic', 'cyberpunk', 'minimal', 'retro', 'gradient'];

export const THEME_COLORS = {
  classic:   { embed: 0x1DB954, primary: '#1DB954', secondary: '#14833B' },
  cyberpunk: { embed: 0xFF00FF, primary: '#ff00ff', secondary: '#00ffff' },
  minimal:   { embed: 0xFFFFFF, primary: '#ffffff', secondary: '#888888' },
  retro:     { embed: 0x00FF41, primary: '#00ff41', secondary: '#003300' },
  gradient:  { embed: 0x6C5CE7, primary: '#6C5CE7', secondary: '#A29BFE' },
};
