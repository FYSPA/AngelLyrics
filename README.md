<div align="center">

#  Discord Lyrics Status (APP)

**Real-time Spotify lyrics displayed as your Discord custom status.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)]()

**Language:** English · [Español](README.es.md)

[Download](#-download) · [How it works](#-how-it-works) · [Run from source](#️-run-from-source) · [Build](#-build-exe)

</div>

---

## Overview

Discord Lyrics Status reads the currently playing track from Spotify — via **D-Bus/MPRIS on Linux** or **SMTC on Windows** — fetches synced lyrics, and updates your Discord custom status line by line in perfect sync with the music.

No Spotify API key. No Spotify Premium. No setup beyond a single Discord token.

---

## ✨ Features

- **Real-time lyrics** — each line fires at the exact timestamp from the LRC file
- **Multi-source lyrics** — LRCLIB (synced) → lyrics.ovh (plain) → AZLyrics (scraped) fallback chain
- **Karaoke mode** — `!lyrics` command shows real-time karaoke lyrics in a live embed
- **Generated images** — `!np` renders a cyberpunk-style image with album art, lyrics and progress (Linux)
- **Customizable themes** — `!ui` switches between classic, cyberpunk, minimal, retro & gradient themes
- **Live channel** — `!np channel #channel` sends automatic now-playing updates with image
- **Per-mode format** — different status format templates for lyrics/info/progress/compact modes
- **Zero config** — first launch opens a browser setup page to enter your token
- **No dropped lines** — a sequential queue retries on rate limits instead of skipping
- **Free lyrics source** — LRCLIB + open fallbacks, no API key required
- **No Spotify API** — reads playback via D-Bus/MPRIS (Linux) or SMTC (Windows), works with free accounts
- **Remote control** — separate Discord bot for DM commands: on/off/restart, mode, format, filters, blacklist, broadcast, and more

---

## 📥 Download

Go to the [**Releases**](../../releases) page and download `AngelLyrics.exe`.

> **Windows:** Requires Windows 10 or 11 (uses SMTC via PowerShell).  
> **Linux:** Requires D-Bus session bus with MPRIS (uses `dbus-send`).

---

## 🚀 Quick Start

1. **Download** `AngelLyrics.exe` from [Releases](../../releases)
2. **Run** the `.exe` — a browser window will open automatically on first launch
3. **Enter your Discord User Token** and click *Save & Start*
4. **Play music** on Spotify — lyrics will appear on your Discord status in real time

Your token is stored locally at `%APPDATA%\AngelLyrics\config.json` and never sent anywhere other than Discord's own API.

---

## 🔑 Getting Your Discord User Token

> **Warning:** Your user token grants full access to your Discord account. Never share it with anyone.

1. Open [discord.com/app](https://discord.com/app) in a **browser** (not the desktop app)
2. Press `F12` to open DevTools → go to the **Network** tab
3. Perform any action (switch a server, send a message, etc.)
4. Click on any request → **Request Headers** → find the `Authorization` header
5. Copy its value — that is your user token

---

## ⚙️ How It Works

```
Spotify (desktop / browser)
      │
      ├── Linux  → D-Bus / MPRIS (album art via Deezer fallback)
      └── Windows → SMTC (PowerShell)
      │
      ▼  track title, artist, album art, playback position
Lyrics API chain     ← LRCLIB (synced) → lyrics.ovh → AZLyrics
      │
      ▼
LyricScheduler        ← fires each line at the correct timestamp via polling
      │
      ├── Discord PATCH API  → updates custom status (queued, retried on 429)
      ├── Broadcast webhook  → pushes lyrics to any Discord webhook
      └── Control bot DM     → commands: !np, !lyrics, !mode, !ui, etc.
```

---

## 🛠️ Run from Source

**Requirements:** Node.js 18+, Spotify desktop app.  
**Linux:** D-Bus session bus with `dbus-send`.  
**Windows:** Windows 10/11 with PowerShell.

```bash
git clone https://github.com/FYSPA/AngelLyrics.git
cd AngelLyrics
npm install
npm start
```

Alternatively, create a `.env` file to skip the browser setup:

```env
DISCORD_USER_TOKEN=your_discord_user_token_here
CONTROL_BOT_TOKEN=your_discord_bot_token_here
OWNER_ID=your_discord_user_id_here
```

---

## 🎮 Control Bot Commands

The control bot (`control-bot.js`) is a separate Discord bot that lets you manage the app via DM.

| Command | Description |
|---|---|
| `!on` / `!off` / `!restart` | Start / stop / restart the lyric process |
| `!mode <mode>` | Switch display mode (lyrics / info / progress / compact) |
| `!ui <theme>` | Switch visual theme (classic / cyberpunk / minimal / retro / gradient) |
| `!np` | Show current track with generated image |
| `!lyrics` | Start/stop real-time karaoke lyrics |
| `!repeat` | Repeat the nowplaying embed |
| `!status` | Show system status |
| `!prefix <text>` | Set text prefix before lyrics |
| `!emoji <name>` | Set status emoji |
| `!format [mode] <template>` | Set status format template |
| `!style blocks\|squares` | Set progress bar style |
| `!cooldown <ms>` | Set polling interval (500–30000ms) |
| `!filter add\|remove <word>` | Filter words from lyrics |
| `!blacklist add\|remove <pattern>` | Skip matching tracks |
| `!broadcast <url>` | Push lyrics to a webhook in real time |
| `!offset <ms>` | Fine-tune lyric sync offset |
| `!recent` | Show recently played tracks |
| `!logs` | Show last PM2 logs |
| `!ping` | Show bot latency |
| `!help` | Show all commands |

### Available themes

| Theme | Image | Description |
|---|---|---|
| `classic` | No | Clean embed with album art thumbnail |
| `cyberpunk` | Yes | Neon grid, pink/cyan glow |
| `minimal` | Yes | Dark flat, white/grey text |
| `retro` | Yes | CRT scanlines, green monospace |
| `gradient` | Yes | Purple/blue gradient background |

---

## 📦 Build `.exe`

Produces a standalone executable with Node.js bundled inside — no runtime required on target machines.

```bash
npm install
npm run build
# Output: dist/AngelLyrics.exe
```

---

## 🗂️ Project Structure

```
src/
├── index.js              — main loop, poll & orchestration
├── core/
│   ├── poll.js           — track polling, scheduler management
│   ├── display.js        — status text formatting, filters, broadcast, progress bar
│   └── scheduler.js      — LyricScheduler class, fires lines at timestamps via interval
├── spotify/
│   ├── index.js          — backend dispatcher (auto/api/native)
│   ├── api.js            — Spotify Web API integration (optional, needs keys)
│   ├── linux.js          — D-Bus / MPRIS reader + Deezer album art fallback
│   ├── windows.js        — SMTC (PowerShell) reader
│   ├── progress.js       — progress estimation with drift compensation
│   └── utils.js          — runCommand, makeTrackId helpers
├── lyrics.js             — multi-source lyrics fetcher (LRCLIB → lyrics.ovh → AZLyrics) with disk cache
├── status.js             — Discord custom status updater (queue + retry)
├── config/
│   ├── index.js          — re-exports
│   ├── paths.js          — config dir, file paths, app name
│   ├── cache.js          — read/write config with in-memory cache
│   ├── crypto.js         — AES-256-GCM token encryption/decryption
│   ├── tokens.js         — Discord + Spotify token management
│   └── settings.js       — all config getters/setters
├── constants.js          — shared constants (poll interval, thresholds, etc.)
├── setup.js              — first-run Express web UI (token entry, Spotify OAuth)
├── logger.js             — file logger (ISO timestamps, log rotation)
└── bot/
    ├── constants.js      — bot colors, mode names, theme definitions
    ├── ui.js             — 50+ Discord.js embed & button builders
    ├── image.js          — SVG image generator via sharp (theme-aware, 4 styles)
    ├── live.js           — live "Now Playing" channel updater with image
    ├── lyrics-live.js    — karaoke real-time lyrics message manager
    └── pm2.js            — pm2 process manager wrapper

control-bot.js            — separate Discord bot for remote control via DM
debug-smtc.ps1            — standalone SMTC diagnostic script (Windows)
build.mjs                 — esbuild + pkg build script
tests/
├── cache.test.js
├── crypto.test.js
├── display.test.js
├── lyrics.test.js
├── settings.test.js
└── tokens.test.js
```

---

## 🧪 Running Tests

```bash
npm test
```

71+ tests covering config, crypto, display formatting, lyrics parsing, and token management.

---

## ❓ FAQ

**Does this work without Spotify Premium?**  
Yes. It reads from D-Bus/MPRIS (Linux) or SMTC (Windows), not the Spotify API.

**Does it work on Linux?**  
Yes. Spotify on Linux exposes playback via D-Bus MPRIS. Album art is fetched via the Deezer API fallback when the player doesn't expose it directly.

**Will this get my account banned?**  
Using a user token is against Discord's ToS. Use at your own risk.

**How do I reset my token?**  
Delete `%APPDATA%\AngelLyrics\config.json` and relaunch the app, or use `--reset` flag.

**Lyrics are not showing / wrong lyrics?**  
LRCLIB may not have the track. The app falls back to lyrics.ovh then AZLyrics. If all fail, the status will show the track name and artist instead.

**How do I generate images on Windows?**  
Image generation currently requires the `sharp` library which works best on Linux. On Windows/macOS, the app falls back to embed-only display.

---

## 📄 License

[MIT](LICENSE) © [FYSPA](https://github.com/FYSPA)
