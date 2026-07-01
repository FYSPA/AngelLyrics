<div align="center">

#  Discord Lyrics Status (APP)

**Real-time Spotify lyrics displayed as your Discord custom status.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)]()

**Language:** English · [Español](README.es.md)

[Download](#-download) · [How it works](#-how-it-works) · [Run from source](#-run-from-source) · [Build](#-build-exe)

</div>

---

## Overview

Discord Lyrics Status reads the currently playing track from Spotify — via **D-Bus/MPRIS on Linux** or **SMTC on Windows** — fetches synced lyrics from [LRCLIB](https://lrclib.net), and updates your Discord custom status line by line — in perfect sync with the music.

No Spotify API key. No Spotify Premium. No setup beyond a single Discord token.

---

## ✨ Features

- **Real-time lyrics** — each line fires at the exact timestamp from the LRC file
- **Zero config** — first launch opens a browser setup page to enter your token
- **No dropped lines** — a sequential queue retries on rate limits instead of skipping
- **No dependencies to install** — distributed as a single standalone `.exe`
- **Free lyrics source** — [LRCLIB](https://lrclib.net), no API key required
- **No Spotify API** — reads playback via D-Bus/MPRIS (Linux) or SMTC (Windows), works with free accounts

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
      ├── Linux  → D-Bus / MPRIS
      └── Windows → SMTC (PowerShell)
      │
      ▼  track title, artist, playback position
LRCLIB API            ← fetches synced LRC lyrics (free, no key)
      │
      ▼
LyricScheduler        ← fires each line at the correct timestamp via setTimeout
      │
      ▼
Discord PATCH API     ← updates custom status, queued & retried on rate limit
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
```

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
├── index.js          — main loop, poll & orchestration
├── spotify.js        — reads playback (Windows SMTC / Linux D-Bus / optional Spotify API)
├── lyrics.js         — fetches & caches synced lyrics from LRCLIB
├── scheduler.js      — LyricScheduler class, fires lines at correct timestamps
├── status.js         — updates Discord custom status (queue + retry)
├── config.js         — reads/writes config (token, display mode, etc.)
├── constants.js      — shared constants (poll interval, thresholds, etc.)
├── setup.js          — first-run Express web UI (token entry, Spotify OAuth)
└── bot/
    ├── constants.js  — bot-specific constants (colors, mode names, platform)
    ├── pm2.js        — pm2 process manager wrapper (start/stop/restart/reset)
    ├── ui.js         — Discord.js embed & button builders
    └── live.js       — live "Now Playing" channel updater

control-bot.js        — separate Discord bot for remote control via DM
debug-smtc.ps1        — standalone SMTC diagnostic script (Windows)
build.mjs             — esbuild + pkg build script
```

---

## ❓ FAQ

**Does this work without Spotify Premium?**
Yes. It reads from D-Bus/MPRIS (Linux) or SMTC (Windows), not the Spotify API.

**Does it work on Linux?**
Yes. Spotify on Linux exposes playback via D-Bus MPRIS, which the app reads directly.

**Will this get my account banned?**
Using a user token is against Discord's ToS. Use at your own risk.

**How do I reset my token?**
Delete `%APPDATA%\AngelLyrics\config.json` and relaunch the app.

**Lyrics are not showing / wrong lyrics?**
LRCLIB may not have the track. The status will fall back to showing the track name and artist.

---

## 📄 License

[MIT](LICENSE) © [FYSPA](https://github.com/FYSPA)

