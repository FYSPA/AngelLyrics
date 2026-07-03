<div align="center">

# 🎵 AngelLyrics

**Muestra las letras de Spotify en tiempo real en tu estado personalizado de Discord.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)]()

**Idioma:** [English](README.md) · Español

[Descargar](#-descargar) · [Cómo funciona](#️-cómo-funciona) · [Ejecutar desde código](#️-ejecutar-desde-código) · [Compilar](#-compilar-exe)

</div>

---

## Introducción

AngelLyrics lee la canción que estás reproduciendo en Spotify — mediante **D-Bus/MPRIS en Linux** o **SMTC en Windows** — obtiene letras sincronizadas, y actualiza tu estado personalizado de Discord línea por línea al ritmo de la música.

Sin API de Spotify. Sin Spotify Premium. Solo necesitas un Discord User Token.

---

## ✨ Funcionalidades

- **Letras en tiempo real** — cada línea aparece en el timestamp exacto del archivo LRC
- **Múltiples fuentes de letras** — cadena de respaldo: LRCLIB → lyrics.ovh → AZLyrics
- **Modo karaoke** — comando `!lyrics` muestra letras karaoke en tiempo real en un embed vivo
- **Imágenes generadas** — `!np` renderiza una imagen cyberpunk con carátula, letras y progreso (solo Linux)
- **Temas visuales** — `!ui` cambia entre classic, cyberpunk, minimal, retro y gradient
- **Canal en vivo** — `!np channel #canal` envía actualizaciones automáticas con imagen
- **Formato por modo** — plantillas de formato distintas para lyrics/info/progress/compact
- **Sin configuración** — al iniciar por primera vez abre un navegador para ingresar tu token
- **Sin saltos de línea** — cola secuencial que reintenta automáticamente en rate limit
- **Letras gratuitas** — LRCLIB + respaldos abiertos, sin API key
- **Sin API de Spotify** — lee la reproducción mediante D-Bus/MPRIS (Linux) o SMTC (Windows)
- **Control remoto** — bot de Discord separado para comandos por MD

---

## 📥 Descargar

Ve a la página de [**Releases**](../../releases) y descarga `AngelLyrics.exe`.

> **Windows:** Requiere Windows 10 u 11 (usa SMTC mediante PowerShell).  
> **Linux:** Requiere D-Bus session bus con MPRIS (usa `dbus-send`).

---

## 🚀 Inicio rápido

1. **Descarga** `AngelLyrics.exe` desde [Releases](../../releases)
2. **Ejecuta** el `.exe` — la primera vez se abrirá el navegador automáticamente
3. **Ingresa tu Discord User Token** y haz clic en *Guardar e iniciar*
4. **Reproduce música** en Spotify — las letras aparecerán en tu estado de Discord en tiempo real

Tu token se guarda localmente en `%APPDATA%\AngelLyrics\config.json` y nunca se envía a ningún lado que no sea la API de Discord.

---

## 🔑 Cómo obtener tu Discord User Token

> **Advertencia:** Tu user token otorga acceso completo a tu cuenta de Discord. No lo compartas con nadie.

1. Abre [discord.com/app](https://discord.com/app) en un **navegador** (no en la app de escritorio)
2. Presiona `F12` para abrir DevTools → ve a la pestaña **Network**
3. Realiza cualquier acción (cambia de servidor, envía un mensaje, etc.)
4. Haz clic en cualquier solicitud → **Request Headers** → busca el encabezado `Authorization`
5. Copia su valor — ese es tu user token

---

## ⚙️ Cómo funciona

```
Spotify (escritorio / navegador)
      │
      ├── Linux   → D-Bus / MPRIS (carátula vía Deezer como respaldo)
      └── Windows → SMTC (PowerShell)
      │
      ▼  título, artista, carátula, posición
Cadena de letras     ← LRCLIB (sincronizadas) → lyrics.ovh → AZLyrics
      │
      ▼
LyricScheduler        ← dispara cada línea en el timestamp correcto
      │
      ├── Discord PATCH API  → actualiza el estado personalizado
      ├── Webhook broadcast  → envía letras a cualquier webhook
      └── Bot de control DM  → comandos: !np, !lyrics, !mode, !ui, etc.
```

---

## 🛠️ Ejecutar desde código

**Requisitos:** Node.js 18+, app de Spotify de escritorio.  
**Linux:** D-Bus session bus con `dbus-send`.  
**Windows:** Windows 10/11 con PowerShell.

```bash
git clone https://github.com/FYSPA/AngelLyrics.git
cd AngelLyrics
npm install
npm start
```

O crea un archivo `.env` para saltar la configuración del navegador:

```env
DISCORD_USER_TOKEN=your_discord_user_token_here
CONTROL_BOT_TOKEN=your_discord_bot_token_here
OWNER_ID=your_discord_user_id_here
```

---

## 🎮 Comandos del Bot de Control

El bot de control (`control-bot.js`) es un bot de Discord separado para administrar la app por MD.

| Comando | Descripción |
|---|---|
| `!on` / `!off` / `!restart` | Iniciar / detener / reiniciar el proceso de letras |
| `!mode <modo>` | Cambiar modo (lyrics / info / progress / compact) |
| `!ui <tema>` | Cambiar tema visual (classic / cyberpunk / minimal / retro / gradient) |
| `!np` | Mostrar canción actual con imagen generada |
| `!lyrics` | Iniciar/detener karaoke en tiempo real |
| `!repeat` | Repetir el embed de nowplaying |
| `!status` | Mostrar estado del sistema |
| `!prefix <texto>` | Establecer prefijo antes de las letras |
| `!emoji <nombre>` | Establecer emoji del estado |
| `!format [modo] <plantilla>` | Establecer plantilla de formato |
| `!style blocks\|squares` | Estilo de la barra de progreso |
| `!cooldown <ms>` | Intervalo de polling (500–30000ms) |
| `!filter add\|remove <palabra>` | Filtrar palabras de las letras |
| `!blacklist add\|remove <patrón>` | Ignorar canciones que coincidan |
| `!broadcast <url>` | Enviar letras a un webhook en tiempo real |
| `!offset <ms>` | Ajustar sincronía de letras |
| `!recent` | Mostrar canciones recientes |
| `!logs` | Mostrar últimos logs de PM2 |
| `!ping` | Latencia del bot |
| `!help` | Mostrar todos los comandos |

### Temas disponibles

| Tema | Imagen | Descripción |
|---|---|---|
| `classic` | No | Embed limpio con miniatura de carátula |
| `cyberpunk` | Sí | Neon grid, glow pink/cyan |
| `minimal` | Sí | Fondo oscuro liso, texto blanco/gris |
| `retro` | Sí | Scanlines CRT, texto verde monospace |
| `gradient` | Sí | Fondo degradado púrpura/azul |

---

## 📦 Compilar `.exe`

Genera un ejecutable standalone con Node.js incluido — no se requiere runtime en la máquina de destino.

```bash
npm install
npm run build
# Output: dist/AngelLyrics.exe
```

---

## 🗂️ Estructura del proyecto

```
src/
├── index.js              — bucle principal, polling y orquestación
├── core/
│   ├── poll.js           — polling de canciones, gestión del scheduler
│   ├── display.js        — formato de texto, filtros, broadcast, barra de progreso
│   └── scheduler.js      — clase LyricScheduler, dispara líneas por intervalo
├── spotify/
│   ├── index.js          — dispatcher de backend (auto/api/native)
│   ├── api.js            — integración con Spotify Web API (opcional, necesita keys)
│   ├── linux.js          — lector D-Bus / MPRIS + respaldo Deezer para carátula
│   ├── windows.js        — lector SMTC (PowerShell)
│   ├── progress.js       — estimación de progreso con compensación de deriva
│   └── utils.js          — helpers runCommand, makeTrackId
├── lyrics.js             — buscador multi-fuente (LRCLIB → lyrics.ovh → AZLyrics) con caché
├── status.js             — actualizador de estado de Discord (cola + reintento)
├── config/
│   ├── index.js          — re-exportaciones
│   ├── paths.js          — directorio de configuración, rutas, nombre de la app
│   ├── cache.js          — lectura/escritura de config con caché en memoria
│   ├── crypto.js         — cifrado AES-256-GCM de tokens
│   ├── tokens.js         — gestión de tokens de Discord y Spotify
│   └── settings.js       — getters y setters de configuración
├── constants.js          — constantes compartidas (intervalo, umbrales, etc.)
├── setup.js              — UI web Express para primera ejecución (token, OAuth Spotify)
├── logger.js             — logger a archivo con marcas de tiempo ISO
└── bot/
    ├── constants.js      — colores del bot, nombres de modo, definiciones de temas
    ├── ui.js             — 50+ constructores de embeds y botones de Discord.js
    ├── image.js          — generador de imágenes SVG via sharp (5 temas)
    ├── live.js           — actualizador del canal "Now Playing" en vivo con imagen
    ├── lyrics-live.js    — gestor de mensajes karaoke en tiempo real
    └── pm2.js            — wrapper de pm2 para gestión del proceso

control-bot.js            — bot de Discord separado para control remoto por MD
debug-smtc.ps1            — script de diagnóstico SMTC (Windows)
build.mjs                 — script de compilación con esbuild + pkg
tests/
├── cache.test.js
├── crypto.test.js
├── display.test.js
├── lyrics.test.js
├── settings.test.js
└── tokens.test.js
```

---

## 🧪 Ejecutar Tests

```bash
npm test
```

71+ tests que cubren configuración, cifrado, formato de texto, parseo de letras y gestión de tokens.

---

## ❓ FAQ

**¿Se necesita Spotify Premium?**  
No. La app lee desde D-Bus/MPRIS (Linux) o SMTC (Windows), no usa la API de Spotify.

**¿Funciona en Linux?**  
Sí. Spotify en Linux expone la reproducción mediante D-Bus MPRIS. La carátula se obtiene vía Deezer como respaldo cuando el reproductor no la expone directamente.

**¿Pueden banear mi cuenta de Discord por esto?**  
Usar un user token viola los Términos de Servicio de Discord. Úsalo bajo tu propio riesgo.

**¿Cómo cambio mi token?**  
Elimina el archivo `%APPDATA%\AngelLyrics\config.json` y vuelve a ejecutar la app, o usa el flag `--reset`.

**¿No se ven las letras o son incorrectas?**  
Puede que LRCLIB no tenga esa canción. La app prueba con lyrics.ovh y luego AZLyrics. Si todas fallan, se muestra el nombre y artista.

**¿Cómo genero imágenes en Windows?**  
La generación de imágenes usa la librería `sharp` que funciona mejor en Linux. En Windows/Mac la app usa solo el embed sin imagen.

---

## 📄 Licencia

[MIT](LICENSE) © [FYSPA](https://github.com/FYSPA)
