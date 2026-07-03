import { join } from 'path';
import { homedir } from 'os';
import { existsSync, copyFileSync, mkdirSync } from 'fs';

export const APP_NAME = 'AngelLyrics';

export const CONFIG_DIR = join(
  process.env.APPDATA || join(homedir(), '.config'),
  APP_NAME
);

const OLD_CONFIG_DIR = join(
  process.env.APPDATA || join(homedir(), '.config'),
  'discord-lyrics-status'
);

export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const OLD_CONFIG_FILE = join(OLD_CONFIG_DIR, 'config.json');

export function migrateOldConfig() {
  try {
    if (existsSync(OLD_CONFIG_FILE) && !existsSync(CONFIG_FILE)) {
      console.log(`[Config] Migrando configuración desde ${OLD_CONFIG_DIR}…`);
      mkdirSync(CONFIG_DIR, { recursive: true });
      copyFileSync(OLD_CONFIG_FILE, CONFIG_FILE);
      console.log('[Config] Migración completada.');
    }
  } catch (err) {
    console.error('[Config] Error en migración:', err.message);
  }
}

migrateOldConfig();
