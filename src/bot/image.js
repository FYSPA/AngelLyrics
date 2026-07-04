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

function wrapText(text, maxLen) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (w.length > maxLen) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(w);
      continue;
    }
    const test = cur ? cur + ' ' + w : w;
    if (test.length > maxLen && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
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

// ── Theme config ───────────────────────────────────────────────────────────
// Each theme defines its visual properties. A single builder uses these.

const THEMES = {
  cyberpunk: {
    titleTrunc: 40, artistTrunc: 40, lyricsWrap: 55,
    defs: '<pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#151530" stroke-width="0.5"/></pattern><filter id="gp"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="gc"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="gs"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    artRx: 12, artBorder: '#00ffff', artGlow: '#glowCyan', artNoBg: '#1a1a2e',
    bg: ['<rect width="' + W + '" height="' + H + '" fill="#0a0a12"/>', '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>'],
    decorations: [
      '<line x1="0" y1="0" x2="' + W + '" y2="0" stroke="#ff00ff" stroke-width="2" filter="url(#gp)"/>',
      '<line x1="0" y1="' + (H - 2) + '" x2="' + W + '" y2="' + (H - 2) + '" stroke="#00ffff" stroke-width="2" filter="url(#gc)"/>',
      '<polygon points="760,380 780,395 740,395" fill="#ff00ff" opacity="0.3"/>',
      '<polygon points="20,20 30,35 10,35" fill="#00ffff" opacity="0.3"/>',
    ],
    title: { x: 260, y: 125, font: 'monospace', size: 24, fill: '#ff00ff', filter: 'url(#gs)' },
    artist: { x: 260, y: 158, font: 'monospace', size: 15, fill: '#00ffff' },
    lyrics: { x: 260, y: 215, font: 'monospace', size: 14, fill: '#c084fc', lineH: 20 },
    bar: { x: 260, y: 300, w: 300, h: 4, fill: '#ff00ff', bg: '#1a1a3a', filter: '#gp' },
    time: { x: 570, y: 305, font: 'monospace', size: 12, fill: '#888' },
    pct: { x: 570, y: 285, font: 'monospace', size: 12, fill: '#888' },
  },
  minimal: {
    titleTrunc: 45, artistTrunc: 45, lyricsWrap: 70,
    defs: '',
    artRx: 8, artBorder: '#ffffff', artGlow: null, artNoBg: '#1a1a2e',
    bg: ['<rect width="' + W + '" height="' + H + '" fill="#121212"/>'],
    decorations: [],
    title: { x: 260, y: 125, font: 'sans-serif', size: 22, fill: '#ffffff' },
    artist: { x: 260, y: 155, font: 'sans-serif', size: 15, fill: '#888888' },
    lyrics: { x: 260, y: 215, font: 'sans-serif', size: 14, fill: '#aaaaaa', lineH: 20 },
    bar: { x: 260, y: 300, w: 300, h: 3, fill: '#ffffff', bg: '#333333', filter: null },
    time: { x: 570, y: 303, font: 'sans-serif', size: 12, fill: '#666666' },
    pct: { x: 570, y: 285, font: 'sans-serif', size: 12, fill: '#666666' },
  },
  retro: {
    titleTrunc: 40, artistTrunc: 40, lyricsWrap: 55,
    defs: '<pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="rgba(0,0,0,0.25)"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    artRx: 0, artBorder: '#00ff41', artGlow: null, artNoBg: '#0a0a0a',
    bg: ['<rect width="' + W + '" height="' + H + '" fill="#0a0a0a"/>', '<rect width="' + W + '" height="' + H + '" fill="url(#scanlines)"/>'],
    decorations: ['<rect x="10" y="10" width="' + (W - 20) + '" height="' + (H - 20) + '" fill="none" stroke="#00ff41" stroke-width="1" opacity="0.3" rx="4"/>'],
    title: { x: 260, y: 125, font: 'monospace', size: 20, fill: '#00ff41', filter: 'url(#glow)' },
    artist: { x: 260, y: 155, font: 'monospace', size: 14, fill: '#00aa41' },
    lyrics: { x: 260, y: 215, font: 'monospace', size: 13, fill: '#00ff41', lineH: 18 },
    bar: { x: 260, y: 300, w: 300, h: 6, fill: '#00ff41', bg: '#003300', filter: null },
    time: { x: 570, y: 305, font: 'monospace', size: 12, fill: '#00ff41' },
    pct: { x: 570, y: 285, font: 'monospace', size: 12, fill: '#00ff41' },
  },
  gradient: {
    titleTrunc: 45, artistTrunc: 45, lyricsWrap: 70,
    defs: '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f0c29"/><stop offset="50%" stop-color="#302b63"/><stop offset="100%" stop-color="#24243e"/></linearGradient>',
    artRx: 12, artBorder: '#ffffff', artGlow: null, artNoBg: '#1a1a2e',
    bg: ['<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>'],
    decorations: [],
    title: { x: 260, y: 125, font: 'sans-serif', size: 22, fill: '#ffffff' },
    artist: { x: 260, y: 155, font: 'sans-serif', size: 15, fill: 'rgba(255,255,255,0.7)' },
    lyrics: { x: 260, y: 215, font: 'sans-serif', size: 14, fill: 'rgba(255,255,255,0.9)', lineH: 20 },
    bar: { x: 260, y: 300, w: 300, h: 4, fill: '#ffffff', bg: 'rgba(255,255,255,0.2)', filter: null },
    time: { x: 570, y: 304, font: 'sans-serif', size: 12, fill: 'rgba(255,255,255,0.6)' },
    pct: { x: 570, y: 285, font: 'sans-serif', size: 12, fill: 'rgba(255,255,255,0.6)' },
  },
};

function textTag(cfg, s) {
  var f = cfg.filter ? ' filter="url(' + cfg.filter + ')"' : '';
  var w = cfg.weight ? ' font-weight="' + cfg.weight + '"' : '';
  return '<text x="' + cfg.x + '" y="' + cfg.y + '" font-family="' + cfg.font + '" font-size="' + cfg.size + '" fill="' + cfg.fill + '"' + w + f + '>' + s + '</text>';
}

function buildThemeSVG(themeName, track, lyricLine, imgBuf) {
  var t = THEMES[themeName];
  if (!t) return null;

  var title = esc(trunc(track.trackName, t.titleTrunc));
  var artist = esc(trunc(track.artistName, t.artistTrunc));
  var lyricsLines = wrapText(trunc(lyricLine || '', 160), t.lyricsWrap);
  var pct = track.durationMs > 0 ? Math.min(100, Math.round((track.progressMs / track.durationMs) * 100)) : 0;
  var tCur = fmt(track.progressMs);
  var tTotal = fmt(track.durationMs);

  var parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">'];

  if (t.defs) {
    parts.push('<defs>');
    parts.push(t.defs);
    parts.push('<clipPath id="artClip"><rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" rx="' + t.artRx + '"/></clipPath>');
    parts.push('</defs>');
  } else {
    parts.push('<clipPath id="artClip"><rect x="' + ART_X + '" y="' + ART_Y + '" width="' + ART_SIZE + '" height="' + ART_SIZE + '" rx="' + t.artRx + '"/></clipPath>');
  }

  for (var i = 0; i < t.bg.length; i++) parts.push(t.bg[i]);
  for (var i = 0; i < t.decorations.length; i++) parts.push(t.decorations[i]);

  parts.push(artTag(imgBuf, t.artBorder, t.artRx, t.artGlow));
  parts.push(textTag(t.title, title));
  parts.push(textTag(t.artist, artist));

  if (lyricsLines.length) {
    for (var i = 0; i < lyricsLines.length; i++) {
      parts.push('<text x="' + t.lyrics.x + '" y="' + (t.lyrics.y + i * t.lyrics.lineH) + '" font-family="' + t.lyrics.font + '" font-size="' + t.lyrics.size + '" fill="' + t.lyrics.fill + '">' + esc(lyricsLines[i]) + '</text>');
    }
  }

  parts.push(progressBarSVG(t.bar.x, t.bar.y, t.bar.w, t.bar.h, pct, t.bar.fill, t.bar.bg, t.bar.filter));
  parts.push(textTag(t.time, tCur + ' / ' + tTotal));
  parts.push(textTag(t.pct, pct + '%'));
  parts.push('</svg>');

  return parts.join('\n');
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

export function buildSVG(track, lyricLine, imgBuf) {
  const theme = getUiTheme();
  if (theme === 'classic' || !THEMES[theme]) return null;
  return buildThemeSVG(theme, track, lyricLine, imgBuf);
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
