/**
 * @fileoverview Dispatcher: selecciona el backend según plataforma/config.
 *
 * - Linux:    D-Bus / MPRIS  (./linux.js)
 * - Windows:  SMTC (PowerShell)  (./windows.js)
 * - Spotify API (opcional): ./api.js
 */

import { platform } from 'os';
import { getBackend } from '../config.js';
import { getCurrentTrackSpotify, getSpotifyAuthUrl, exchangeSpotifyCode, invalidateSpotifyToken, SPOTIFY_USE_API } from './api.js';
import { getCurrentTrackLinux } from './linux.js';
import { getCurrentTrackWindows } from './windows.js';

/** @typedef {{ isPlaying: boolean, trackId: string, trackName: string, artistName: string, albumName: string, progressMs: number, durationMs: number, albumArtUrl: string }} TrackInfo */

const IS_LINUX = platform() === 'linux';
const IS_WINDOWS = platform() === 'win32';

/**
 * Intenta primero la API de Spotify (si configurada), luego cae al método
 * gratuito según la plataforma (D-Bus en Linux, SMTC en Windows).
 * Respeta la configuración de backend guardada por el control bot.
 * @returns {Promise<TrackInfo|null>}
 */
export async function getCurrentTrack() {
  const backend = getBackend();

  if (backend === 'api' || (backend === 'auto' && SPOTIFY_USE_API)) {
    try {
      const result = await getCurrentTrackSpotify();
      if (result !== null) return result;
    } catch (err) {
      console.warn(`[Spotify] API falló: ${err.message} — usando método gratuito.`);
      invalidateSpotifyToken();
    }
  }

  if (backend === 'api') return null;

  if (IS_LINUX) {
    try {
      return await getCurrentTrackLinux();
    } catch (err) {
      throw new Error(`Error leyendo Spotify (D-Bus/MPRIS): ${err.message}`);
    }
  }

  if (IS_WINDOWS) {
    try {
      return await getCurrentTrackWindows();
    } catch (err) {
      throw new Error(`Error leyendo Spotify (SMTC): ${err.message}`);
    }
  }

  throw new Error(
    `Plataforma no soportada: ${platform()}. ` +
    `Usa Linux (D-Bus/MPRIS) o Windows 10+ (SMTC).`
  );
}

export { getSpotifyAuthUrl, exchangeSpotifyCode };
