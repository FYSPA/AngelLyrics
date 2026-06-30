# Contributing to Discord Lyrics Status

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/FYSPA/AngelLyrics.git
cd AngelLyrics
npm install
```

Create a `.env` file:

```env
DISCORD_USER_TOKEN=your_discord_user_token_here
```

Run in dev mode (auto-restart on file changes):

```bash
npm run dev
```

## Project Structure

```
src/
├── index.js          — main loop, poll & orchestration
├── spotify.js        — reads playback (Windows SMTC / Linux D-Bus / optional Spotify API)
├── lyrics.js         — fetches & caches synced lyrics from LRCLIB
├── scheduler.js      — LyricScheduler class, fires lines at correct timestamps
├── status.js         — updates Discord custom status (queue + retry)
├── config.js         — reads/writes config (token, display mode, etc.)
├── constants.js      — shared constants (poll interval, thresholds, etc.)
├── ipc.js            — file-based IPC between main process and control bot
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

## Guidelines

- Keep PRs focused — one feature or fix per PR
- Follow the existing code style (ESM, no TypeScript, no bundler for source)
- Test on Windows 10/11 with Spotify desktop running
- Do not commit `.env` or any real tokens

## Reporting Issues

Please include:
- Windows version
- Whether Spotify is playing when the issue occurs
- Console output (run `npm start` and copy the logs)

## Building

```bash
npm run build
# → dist/AngelLyrics.exe
```
