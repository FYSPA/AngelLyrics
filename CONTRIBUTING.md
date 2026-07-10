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
CONTROL_BOT_TOKEN=your_discord_bot_token_here
OWNER_ID=your_discord_user_id_here
CLIENT_ID=your_discord_application_id
DEV_GUILD_ID=your_guild_id_for_instant_registration
```

Run in dev mode (auto-restart on file changes):

```bash
npm run dev
```

## Project Structure

```
src/
├── core/
│   ├── poll.js           — track polling, scheduler management
│   ├── display.js        — status text formatting, filters, broadcast, progress bar
│   └── scheduler.js      — LyricScheduler class
├── spotify/
│   ├── index.js          — backend dispatcher (auto/api/native)
│   ├── api.js            — Spotify Web API integration
│   ├── linux.js          — D-Bus / MPRIS reader + Deezer album art fallback
│   ├── windows.js        — SMTC (PowerShell) reader
│   ├── progress.js       — progress estimation with drift compensation
│   └── utils.js          — runCommand, makeTrackId helpers
├── lyrics.js             — multi-source lyrics fetcher (LRCLIB → lyrics.ovh → AZLyrics)
├── status.js             — Discord custom status updater (queue + retry)
├── config/
│   ├── index.js          — re-exports
│   ├── paths.js          — config dir, file paths, app name
│   ├── cache.js          — read/write config with in-memory cache
│   ├── crypto.js         — AES-256-GCM token encryption/decryption
│   ├── tokens.js         — Discord + Spotify token management
│   └── settings.js       — all config getters/setters
├── constants.js          — shared constants
├── setup.js              — first-run Express web UI
├── logger.js             — file logger
└── bot/
    ├── constants.js      — bot colors, mode names, theme definitions
    ├── ui.js             — 55+ Discord.js embed & button builders
    ├── image.js          — SVG image generator via sharp (5 themes)
    ├── commands.js       — slash command definitions & dispatcher (57 commands, EN + ES)
    ├── live.js           — live "Now Playing" channel updater with karaoke merge
    ├── lyrics-live.js    — karaoke real-time lyrics message manager
    └── pm2.js            — pm2 process manager wrapper

control-bot.js            — separate Discord bot for remote control via DM
debug-smtc.ps1            — standalone SMTC diagnostic script (Windows)
build.mjs                 — esbuild + pkg build script
```

## Running Tests

```bash
npm test
```

146 tests across 15 files covering config, crypto, display formatting, lyrics parsing, image generation, scheduler, live updates, karaoke, Deezer fallback, progress estimation, Linux D-Bus parsing, and token management.

## Slash Commands

The bot registers 57 slash commands (English + Spanish) via the REST API on startup.  
For instant registration during development, set `DEV_GUILD_ID` in `.env` — commands will appear immediately in that guild.  
Without `DEV_GUILD_ID`, commands are registered globally and can take up to 1 hour to propagate.

The bot needs the `applications.commands` OAuth2 scope. Generate an invite URL with:

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=0&scope=bot+applications.commands
```

## Guidelines

- Keep PRs focused — one feature or fix per PR
- Follow the existing code style (ESM, no TypeScript, no bundler for source)
- Run `npm test` before submitting — 146 tests must pass
- Test on both Linux and Windows if possible
- Do not commit `.env` or any real tokens
- When adding new slash commands, add both English and Spanish versions using the pattern in `src/bot/commands.js`
- New config keys must be exported from both `src/config/settings.js` and `src/config.js`
- **SMTC/Windows changes:** The SMTC diagnostic system spans `src/core/poll.js` (deferred scheduler, `_smtcWasDead` auto-resync), `src/bot/ui.js` (`debugReport`, `diagnosticEmbed`), and `control-bot.js` (`!debug`, `!resync`). The `resync.json` file in `CONFIG_DIR` is a communication channel between control-bot and the main poll loop — ensure both sides handle it atomically (write → read → unlink).
- **Position sources:** When adding new position-tracking backends, respect the `rawProgressMs`/`progressMs` convention in `src/spotify/windows.js` and the `estimateProgress` drift compensation in `src/spotify/progress.js`.

## Reporting Issues

Please include:
- OS version (Linux distro / Windows 10/11)
- Whether Spotify is playing when the issue occurs
- Console output (run `npm start` and copy the logs)
- Whether you're using `!` commands, `/` commands, or both

## Building

```bash
npm run build
# → dist/AngelLyrics.exe
```
