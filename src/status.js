import { getToken, clearToken } from './config.js';

const API = 'https://discord.com/api/v9/users/@me/settings';

/** Último texto enviado para evitar duplicados */
let lastText = null;

/** Callback para cuando el token es inválido */
let _onUnauthorized = null;

/**
 * Registra un callback para cuando Discord devuelve 401 (token expirado).
 * @param {() => void} cb
 */
export function onUnauthorized(cb) {
  _onUnauthorized = cb;
}

// ── Cola de actualizaciones ─────────────────────────────────────────────────
// Cada entrada: { body, label, token }
// La worker procesa una a la vez; en 429 espera y reintenta la MISMA entrada.
// Las entradas nuevas siempre van al final — no se pierden líneas.

/** @type {Array<{ token: string, body: object, label: string }>} */
const queue = [];

/** @type {boolean} */
let processing = false;

const SUPER_PROPERTIES = Buffer.from(JSON.stringify({
  os: 'Windows',
  browser: 'Chrome',
  device: '',
  system_locale: 'en-US',
  browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  browser_version: '124.0.0.0',
  os_version: '10',
  referrer: '',
  referring_domain: '',
  referrer_current: '',
  referring_domain_current: '',
  release_channel: 'stable',
  client_build_number: 9999,
  client_event_source: null,
})).toString('base64');

/**
 * Procesa la cola de actualizaciones secuencialmente.
 * Reintenta en rate limit (429) y verifica tokens inválidos (401).
 */
async function processQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const entry = queue[0];
    try {
      const res = await fetch(API, {
        method: 'PATCH',
        headers: {
          Authorization: entry.token,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'X-Super-Properties': SUPER_PROPERTIES,
          'X-Discord-Locale': 'en-US',
          'Origin': 'https://discord.com',
          'Referer': 'https://discord.com/channels/@me',
        },
        body: JSON.stringify(entry.body),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const wait = Math.ceil((data.retry_after ?? 1) * 1000);
        console.warn(`[Estado] Límite de velocidad — esperando ${wait}ms y reintentando…`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (res.status === 401) {
        const check = await fetch('https://discord.com/api/v9/users/@me', {
          headers: { Authorization: entry.token },
        }).catch(() => null);

        if (check?.status === 401) {
          console.error('[Estado] Token expirado. Abriendo configuración…');
          queue.length = 0;
          lastText = null;
          clearToken();
          processing = false;
          _onUnauthorized?.();
          return;
        }

        console.warn('[Estado] PATCH rechazado (401) pero token válido — omitiendo.');
      } else if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[Estado] PATCH ${res.status}: ${text}`);
      } else {
        console.log(`[Estado] ✓ "${entry.label}"`);
      }
    } catch (err) {
      console.error(`[Estado] Error de red: ${err.message}`);
    }

    queue.shift();
  }

  processing = false;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Actualiza el estado personalizado de Discord con el texto dado.
 * @param {string} text - Texto del estado (máx 128 caracteres)
 * @param {string} [emoji='musical_note'] - Nombre del emoji
 */
export function setCustomStatus(text, emoji = 'musical_note') {
  const token = getToken();
  if (!token) return;
  if (text === lastText) return;

  lastText = text;
  queue.push({
    token,
    body: { custom_status: { text: text.slice(0, 128), emoji_name: emoji, expires_at: null } },
    label: text,
  });
  processQueue();
}

/** Limpia el estado personalizado (lo elimina). */
export function clearCustomStatus() {
  const token = getToken();
  if (!token) return;
  if (lastText === null) return;

  lastText = null;
  queue.push({ token, body: { custom_status: null }, label: '(limpiar)' });
  processQueue();
}

/** @returns {boolean} True si hay un token configurado */
export function isStatusEnabled() {
  return !!getToken();
}
