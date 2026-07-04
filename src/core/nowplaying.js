import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from '../config/paths.js';

const NOWPLAYING_FILE = join(CONFIG_DIR, 'nowplaying.json');

export function readNowplaying() {
  try {
    if (!existsSync(NOWPLAYING_FILE)) return null;
    return JSON.parse(readFileSync(NOWPLAYING_FILE, 'utf8'));
  } catch (err) {
    console.error('[Nowplaying] Error leyendo:', err.message);
    return null;
  }
}
