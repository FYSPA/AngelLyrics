import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from './config.js';

const IPC_FILE = join(CONFIG_DIR, 'ipc.json');

/**
 * Lee y elimina el archivo de comandos IPC.
 * El proceso principal llama esto en cada ciclo de poll.
 * @returns {{ command: string, args?: any[], timestamp: number }|null}
 */
export function readIpcCommand() {
  try {
    if (!existsSync(IPC_FILE)) return null;
    const raw = readFileSync(IPC_FILE, 'utf8');
    const data = JSON.parse(raw);
    unlinkSync(IPC_FILE);
    return data;
  } catch {
    try { unlinkSync(IPC_FILE); } catch {}
    return null;
  }
}

/**
 * El bot de control escribe un comando para el proceso principal.
 * @param {string} command
 * @param {any[]} [args]
 * @returns {boolean}
 */
export function writeIpcCommand(command, args = []) {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(IPC_FILE, JSON.stringify({ command, args, timestamp: Date.now() }), 'utf8');
    return true;
  } catch {
    return false;
  }
}
