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

> **Windows + Browser users:** SMTC reports `position=0` when listening via the Spotify web player or browser.  
> **Fix:** Pause/resume restores position tracking, or set up the [Spotify API](#-spotify-api-optional) for accurate position.

---

## ✨ Features

- **Real-time lyrics** — each line fires at the exact timestamp from the LRC file
- **Multi-source lyrics** — LRCLIB (synced) → lyrics.ovh (plain) → AZLyrics (scraped) fallback chain
- **Karaoke mode** — `!lyrics` / `/lyrics` shows real-time karaoke lyrics in a live embed
- **Live + Karaoke merge** — if a live channel is set, activating karaoke transforms it into a real-time lyric display with 1.5s updates
- **Generated images** — `!np` renders a theme-aware image with album art, lyrics and progress (Linux)
- **Customizable themes** — `!ui` switches between classic, cyberpunk, minimal, retro & gradient themes
- **Live channel** — `!np channel #channel` sends automatic now-playing updates with image
- **Per-mode format** — different status format templates for lyrics/info/progress/compact modes
- **Format overrides** — per-artist, per-album or per-track format templates via `!format override`
- **Listening stats** — `!stats` shows total plays, listening time and top tracks
- **Slash commands** — all `!` commands also available as `/` commands (English + Spanish)
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
      └── Control bot DM     → commands: !np, !lyrics, !mode, !ui, etc. (+ slash commands)
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
# Optional: enable slash commands
CLIENT_ID=your_discord_application_id
DEV_GUILD_ID=your_guild_id_for_instant_registration
```

---

## 🎮 Control Bot Commands

The control bot (`control-bot.js`) is a separate Discord bot that lets you manage the app via DM.  
**All commands also work as slash commands** — both English and Spanish versions are registered.

| Command | Description |
|---|---|
| `!on` / `!off` / `!restart` | Start / stop / restart the lyric process |
| `!mode <mode>` | Switch display mode (lyrics / info / progress / compact) |
| `!ui <theme>` | Switch visual theme (classic / cyberpunk / minimal / retro / gradient) |
| `!np` | Show current track with generated image |
| `!lyrics` | Start/stop real-time karaoke lyrics (merges into live channel if set) |
| `!repeat` | Repeat the nowplaying embed |
| `!status` | Show system status |
| `!debug` / `!diag` | Show SMTC technical analysis and sync diagnosis |
| `!diagnostico` / `!diagnostic` | Full diagnostic embed with drift analysis |
| `!prefix <text>` | Set text prefix before lyrics |
| `!emoji <name>` | Set status emoji |
| `!format [mode] <template>` | Set status format template |
| `!format override add\|remove\|list` | Per-artist/album/track format overrides |
| `!style blocks\|squares` | Set progress bar style |
| `!cooldown <ms>` | Set polling interval (500–30000ms) |
| `!filter add\|remove <word>` | Filter words from lyrics |
| `!blacklist add\|remove <pattern>` | Skip matching tracks |
| `!broadcast <url>` | Push lyrics to a webhook in real time |
| `!offset <ms>` | Fine-tune lyric sync offset |
| `!resync [seconds]` | Force-resync the scheduler to a given position (or backend estimate) |
| `!recent` | Show recently played tracks |
| `!stats` | Show listening statistics (total plays, time, top 5) |
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

## 🔄 Spotify API (Optional)

The bot can use the **Spotify Web API** as a fallback for accurate playback position — essential when SMTC reports `position=0` (common with browser-based Spotify on Windows).

### Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app
2. Copy the **Client ID** and **Client Secret**
3. Add a Redirect URI: `http://localhost:3120/callback`
4. Set these environment variables:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

5. Start the bot — it will show a Spotify auth link. Follow it to authorize.
6. Once authenticated, the bot will use the API for accurate playback position.

Without the API, the bot falls back to SMTC (Windows) or D-Bus (Linux). On Windows with browser playback, SMTC cannot report position — the API is the only way to get correct sync.

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
    ├── ui.js             — 55+ Discord.js embed & button builders
    ├── image.js          — SVG image generator via sharp (theme-aware, 5 themes)
    ├── commands.js       — slash command definitions & dispatcher (57 commands, EN + ES)
    ├── live.js           — live "Now Playing" channel updater with karaoke merge
    ├── lyrics-live.js    — karaoke real-time lyrics message manager
    └── pm2.js            — pm2 process manager wrapper

control-bot.js            — separate Discord bot for remote control via DM
debug-smtc.ps1            — standalone SMTC diagnostic script (Windows)
build.mjs                 — esbuild + pkg build script
tests/
├── cache.test.js         — 4 tests
├── crypto.test.js        — 6 tests
├── deezer.test.js        — 5 tests
├── display.test.js       — 10 tests
├── image.test.js         — 9 tests
├── live.test.js          — 4 tests
├── linux.test.js         — 15 tests
├── lyrics.test.js        — 5 tests
├── lyrics-live.test.js   — 5 tests
├── progress.test.js      — 8 tests
├── scheduler.test.js     — 12 tests
├── settings.test.js      — 26 tests
├── spotify.test.js       — 5 tests
├── status.test.js        — 5 tests
└── tokens.test.js        — 9 tests
```

---

## 🧪 Running Tests

```bash
npm test
```

146 tests across 15 files covering config, crypto, display formatting, lyrics parsing, image generation, scheduler, live updates, karaoke, Deezer fallback, progress estimation, Linux D-Bus parsing, and token management.

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

**Lyrics are out of sync / position shows 0:00?**  
On Windows, SMTC cannot report playback position when listening via **browser** (Spotify web player, Chrome, Edge, etc.). Position only updates on pause/resume.  
**Solutions:** Use `!debug` to check SMTC state, use `!resync <seconds>` to manually set position, or set up the [Spotify API](#-spotify-api-optional) for automatic position tracking.

**How do I generate images on Windows?**  
Image generation currently requires the `sharp` library which works best on Linux. On Windows/macOS, the app falls back to embed-only display.

**How can I check if SMTC is working?**  
Use `!debug` or `!diag` to get a plaintext technical analysis showing SMTC state (MUERTO/VIVO/LENTO), scheduler position, drift, and recommendations. Use `!diagnostico` for the full embed version.

**Does the Spotify API require Premium?**  
No. The Spotify Web API's `currently-playing` endpoint works with free accounts. It only needs a Spotify Developer app (free) and OAuth authorization.

---

## 📄 License

[MIT](LICENSE) © [FYSPA](https://github.com/FYSPA)
