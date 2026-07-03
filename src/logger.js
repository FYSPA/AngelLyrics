import { appendFileSync, mkdirSync, readFileSync, readdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from './config.js';

const LOG_DIR = join(CONFIG_DIR, 'logs');
const MAX_LOG_DAYS = 30;
const MAX_READ_LINES = 200;

function getDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getLogPath() {
  return join(LOG_DIR, `${getDateStr()}.log`);
}

function timestamp() {
  const d = new Date();
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function writeLog(level, args) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    const line = `[${timestamp()}] [${level}] ${msg}\n`;
    appendFileSync(getLogPath(), line, 'utf8');
  } catch {}
}

function cleanupOldLogs() {
  try {
    if (!existsSync(LOG_DIR)) return;
    const cutoff = getDateStr(new Date(Date.now() - MAX_LOG_DAYS * 86400000));
    const files = readdirSync(LOG_DIR);
    for (const f of files) {
      if (!f.endsWith('.log')) continue;
      const fileDate = f.slice(0, 10);
      if (fileDate < cutoff) {
        try { unlinkSync(join(LOG_DIR, f)); } catch {}
      }
    }
  } catch {}
}

export function readRecentLogs(lines = 50) {
  try {
    const logPath = getLogPath();
    if (!existsSync(logPath)) return 'No hay logs para hoy.';
    const content = readFileSync(logPath, 'utf8');
    const allLines = content.trim().split('\n');
    const last = allLines.slice(-Math.min(lines, MAX_READ_LINES));
    return last.join('\n');
  } catch {
    return 'Error leyendo logs.';
  }
}

export function initLogger() {
  mkdirSync(LOG_DIR, { recursive: true });
  cleanupOldLogs();

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function (...args) {
    writeLog('INFO', args);
    origLog.apply(console, args);
  };

  console.warn = function (...args) {
    writeLog('WARN', args);
    origWarn.apply(console, args);
  };

  console.error = function (...args) {
    writeLog('ERROR', args);
    origError.apply(console, args);
  };
}
