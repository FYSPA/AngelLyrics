import { platform } from 'os';
import { getUiTheme } from '../config/settings.js';

const IS_LINUX = platform() === 'linux';
const W = 800;
const H = 400;
const ART_SIZE = 200;
const ART_X = 30;
const ART_Y = 80;

function fmt(ms) {
  if (!ms || ms <= 0) return '0:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

let _sharp = undefined;
async function getSharp() {
  if (_sharp === undefined) {
    try {
      _sharp = (await import('sharp')).default;
    } catch {
      _sharp = null;
    }
  }
  return _sharp;
}

export function canGenerate() {
  return IS_LINUX;
}

export async function fetchImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
  } catch {
    return null;
  }
}

function artTag(imgBuf, borderColor, rx, glowFilter) {
  if (imgBuf && imgBuf.length > 0) {
    const mime = imgBuf[0] === 0x89 ? 'image/png' : 'image/jpeg';
    const b64 = imgBuf.toString('base64');
    return '<image x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" clip-path="url(#artClip)" href="data:' + mime + ';base64,' + b64 + '"/>\n<rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" rx="' + rx + '" fill="none" stroke="' + borderColor + '" stroke-width="2"' + (glowFilter ? ' filter="url(' + glowFilter + ')"' : '') + '/>';
  }
  return '<rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" rx="' + rx + '" fill="#1a1a2e" stroke="' + borderColor + '" stroke-width="1"/>\n<text x="' + (ART_X + ART_SIZE / 2) + '" y="' + (ART_Y + ART_SIZE / 2) + '" font-family="' + (rx === '0' ? 'monospace' : 'sans-serif') + '" font-size="14" fill="#555" text-anchor="middle" dominant-baseline="middle">NO ART</text>';
}

function progressBarSVG(x, y, w, h, pct, fill, bg, filter) {
  const filled = Math.round((pct / 100) * w);
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (h / 2) + '" fill="' + bg + '"/>\n<rect x="' + x + '" y="' + y + '" width="' + filled + '" height="' + h + '" rx="' + (h / 2) + '" fill="' + fill + '"' + (filter ? ' filter="url(' + filter + ')"' : '') + '/>';
}

// ── Theme builders ──────────────────────────────────────────────────────────

function buildClassicSVG() {
  return null;
}

function buildCyberpunkSVG(track, lyricLine, imgBuf) {
  const title = trunc(track.trackName, 40);
  const artist = trunc(track.artistName, 40);
  const lyrics = trunc(lyricLine || '', 80);
  const pct = track.durationMs > 0 ? Math.min(100, Math.round((track.progressMs / track.durationMs) * 100)) : 0;
  const barW = 300;
  const tCur = fmt(track.progressMs);
  const tTotal = fmt(track.durationMs);
  const img = artTag(imgBuf, '#00ffff', '12', '#glowCyan');
  const lyricsTag = lyrics ? '<text x="260" y="215" font-family="monospace" font-size="14" fill="#c084fc">' + esc(lyrics) + '</text>' : '';

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">',
    '<defs>',
    '<pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#151530" stroke-width="0.5"/></pattern>',
    '<filter id="gp"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    '<filter id="gc"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    '<filter id="gs"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    '<clipPath id="artClip"><rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" rx="12"/></clipPath>',
    '</defs>',
    '<rect width="' + W + '" height="' + H + '" fill="#0a0a12"/>',
    '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>',
    '<line x1="0" y1="0" x2="' + W + '" y2="0" stroke="#ff00ff" stroke-width="2" filter="url(#gp)"/>',
    '<line x1="0" y1="' + (H - 2) + '" x2="' + W + '" y2="' + (H - 2) + '" stroke="#00ffff" stroke-width="2" filter="url(#gc)"/>',
    img,
    '<text x="260" y="125" font-family="monospace" font-size="24" font-weight="bold" fill="#ff00ff" filter="url(#gs)">' + esc(title) + '</text>',
    '<text x="260" y="158" font-family="monospace" font-size="15" fill="#00ffff">' + esc(artist) + '</text>',
    lyricsTag,
    progressBarSVG(260, 300, barW, 4, pct, '#ff00ff', '#1a1a3a', '#gp'),
    '<text x="570" y="305" font-family="monospace" font-size="12" fill="#888">' + tCur + ' / ' + tTotal + '</text>',
    '<text x="570" y="285" font-family="monospace" font-size="12" fill="#888">' + pct + '%</text>',
    '<polygon points="760,380 780,395 740,395" fill="#ff00ff" opacity="0.3"/>',
    '<polygon points="20,20 30,35 10,35" fill="#00ffff" opacity="0.3"/>',
    '</svg>',
  ].join('\n');
}

function buildMinimalSVG(track, lyricLine, imgBuf) {
  const title = trunc(track.trackName, 45);
  const artist = trunc(track.artistName, 45);
  const lyrics = trunc(lyricLine || '', 85);
  const pct = track.durationMs > 0 ? Math.min(100, Math.round((track.progressMs / track.durationMs) * 100)) : 0;
  const barW = 300;
  const tCur = fmt(track.progressMs);
  const tTotal = fmt(track.durationMs);
  const img = artTag(imgBuf, '#ffffff', '8', null);
  const lyricsTag = lyrics ? '<text x="260" y="215" font-family="sans-serif" font-size="14" fill="#aaaaaa">' + esc(lyrics) + '</text>' : '';

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">',
    '<clipPath id="artClip"><rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" rx="8"/></clipPath>',
    '<rect width="' + W + '" height="' + H + '" fill="#121212"/>',
    img,
    '<text x="260" y="125" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff">' + esc(title) + '</text>',
    '<text x="260" y="155" font-family="sans-serif" font-size="15" fill="#888888">' + esc(artist) + '</text>',
    lyricsTag,
    progressBarSVG(260, 300, barW, 3, pct, '#ffffff', '#333333', null),
    '<text x="570" y="303" font-family="sans-serif" font-size="12" fill="#666666">' + tCur + ' / ' + tTotal + '</text>',
    '<text x="570" y="285" font-family="sans-serif" font-size="12" fill="#666666">' + pct + '%</text>',
    '</svg>',
  ].join('\n');
}

function buildRetroSVG(track, lyricLine, imgBuf) {
  const title = trunc(track.trackName, 40);
  const artist = trunc(track.artistName, 40);
  const lyrics = trunc(lyricLine || '', 80);
  const pct = track.durationMs > 0 ? Math.min(100, Math.round((track.progressMs / track.durationMs) * 100)) : 0;
  const barW = 300;
  const tCur = fmt(track.progressMs);
  const tTotal = fmt(track.durationMs);
  const img = artTag(imgBuf, '#00ff41', '0', null);
  const lyricsTag = lyrics ? '<text x="260" y="215" font-family="monospace" font-size="13" fill="#00ff41">' + esc(lyrics) + '</text>' : '';

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">',
    '<defs>',
    '<pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="rgba(0,0,0,0.25)"/></pattern>',
    '<filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    '<clipPath id="artClip"><rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '"/></clipPath>',
    '</defs>',
    '<rect width="' + W + '" height="' + H + '" fill="#0a0a0a"/>',
    '<rect width="' + W + '" height="' + H + '" fill="url(#scanlines)"/>',
    '<rect x="10" y="10" width="' + (W - 20) + '" height="' + (H - 20) + '" fill="none" stroke="#00ff41" stroke-width="1" opacity="0.3" rx="4"/>',
    img,
    '<text x="260" y="125" font-family="monospace" font-size="20" font-weight="bold" fill="#00ff41" filter="url(#glow)">' + esc(title) + '</text>',
    '<text x="260" y="155" font-family="monospace" font-size="14" fill="#00aa41">' + esc(artist) + '</text>',
    lyricsTag,
    progressBarSVG(260, 300, barW, 6, pct, '#00ff41', '#003300', null),
    '<text x="570" y="305" font-family="monospace" font-size="12" fill="#00ff41">' + tCur + ' / ' + tTotal + '</text>',
    '<text x="570" y="285" font-family="monospace" font-size="12" fill="#00ff41">' + pct + '%</text>',
    '</svg>',
  ].join('\n');
}

function buildGradientSVG(track, lyricLine, imgBuf) {
  const title = trunc(track.trackName, 45);
  const artist = trunc(track.artistName, 45);
  const lyrics = trunc(lyricLine || '', 85);
  const pct = track.durationMs > 0 ? Math.min(100, Math.round((track.progressMs / track.durationMs) * 100)) : 0;
  const barW = 300;
  const tCur = fmt(track.progressMs);
  const tTotal = fmt(track.durationMs);
  const img = artTag(imgBuf, '#ffffff', '12', null);
  const lyricsTag = lyrics ? '<text x="260" y="215" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.9)">' + esc(lyrics) + '</text>' : '';

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">',
    '<defs>',
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f0c29"/><stop offset="50%" stop-color="#302b63"/><stop offset="100%" stop-color="#24243e"/></linearGradient>',
    '<clipPath id="artClip"><rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" rx="12"/></clipPath>',
    '</defs>',
    '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>',
    img,
    '<text x="260" y="125" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff">' + esc(title) + '</text>',
    '<text x="260" y="155" font-family="sans-serif" font-size="15" fill="rgba(255,255,255,0.7)">' + esc(artist) + '</text>',
    lyricsTag,
    progressBarSVG(260, 300, barW, 4, pct, '#ffffff', 'rgba(255,255,255,0.2)', null),
    '<text x="570" y="304" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.6)">' + tCur + ' / ' + tTotal + '</text>',
    '<text x="570" y="285" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.6)">' + pct + '%</text>',
    '</svg>',
  ].join('\n');
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

export function buildSVG(track, lyricLine, imgBuf) {
  switch (getUiTheme()) {
    case 'cyberpunk': return buildCyberpunkSVG(track, lyricLine, imgBuf);
    case 'minimal':   return buildMinimalSVG(track, lyricLine, imgBuf);
    case 'retro':     return buildRetroSVG(track, lyricLine, imgBuf);
    case 'gradient':  return buildGradientSVG(track, lyricLine, imgBuf);
    default:          return null;
  }
}

export async function generateImage(track, lyricLine, imgBuf) {
  if (!IS_LINUX) return null;
  const s = await getSharp();
  if (!s) return null;
  try {
    const svg = buildSVG(track, lyricLine, imgBuf);
    if (!svg) return null;
    return await s(Buffer.from(svg)).png().toBuffer();
  } catch (err) {
    console.error('[Image] Error:', err.message);
    return null;
  }
}
