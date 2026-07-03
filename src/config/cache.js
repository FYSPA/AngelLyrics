import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { CONFIG_FILE } from './paths.js';

let _cache = null;

export function readConfig() {
  if (_cache) return _cache;
  try {
    if (existsSync(CONFIG_FILE)) {
      _cache = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
      return _cache;
    }
  } catch {}
  return {};
}

export function writeConfig(updated) {
  mkdirSync(dirname(CONFIG_FILE), { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  _cache = updated;
}

export function refreshConfig() {
  _cache = null;
}
