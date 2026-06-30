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

AngelLyrics lee la canción que estás reproduciendo en Spotify — mediante **D-Bus/MPRIS en Linux** o **SMTC en Windows** — busca y descarga letras sincronizadas con timestamp desde [LRCLIB](https://lrclib.net), y actualiza tu estado personalizado de Discord línea por línea — justo al ritmo de la música.

Sin API de Spotify. Sin Spotify Premium. Solo necesitas un Discord User Token.

---

## ✨ Funcionalidades

- **Letras en tiempo real** — cada línea aparece en el momento exacto según el archivo LRC
- **Sin configuración** — al iniciar por primera vez abre un navegador para ingresar tu token
- **Sin saltos de línea** — usa una cola secuencial que reintenta automáticamente cuando hay rate limit
- **Sin dependencias extra** — se distribuye como un solo archivo `.exe` standalone
- **Letras gratuitas** — [LRCLIB](https://lrclib.net), no requiere API key
- **Sin API de Spotify** — lee la reproducción mediante D-Bus/MPRIS (Linux) o SMTC (Windows), funciona con cuentas gratuitas

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
      ├── Linux   → D-Bus / MPRIS
      └── Windows → SMTC (PowerShell)
      │
      ▼  título, artista, posición de reproducción
LRCLIB API            ← obtiene letras LRC sincronizadas (gratis, sin key)
      │
      ▼
LyricScheduler        ← dispara cada línea en el timestamp correcto mediante setTimeout
      │
      ▼
Discord PATCH API     ← actualiza el estado personalizado, con cola y reintento en rate limit
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
```

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
├── index.js          — bucle principal, polling y orquestación
├── spotify.js        — detecta reproducción (Windows SMTC / Linux D-Bus / Spotify API opcional)
├── lyrics.js         — obtiene y cachea letras sincronizadas desde LRCLIB
├── scheduler.js      — clase LyricScheduler, dispara líneas en el timestamp exacto
├── status.js         — actualiza el estado personalizado de Discord (cola + reintento)
├── config.js         — lee/escribe configuración (token, modo de visualización, etc.)
├── constants.js      — constantes compartidas (intervalo de polling, umbrales, etc.)
├── ipc.js            — IPC basado en archivos entre el proceso principal y el bot de control
├── setup.js          — UI web Express para la primera ejecución (ingreso de token, OAuth Spotify)
└── bot/
    ├── constants.js  — constantes del bot de control (colores, nombres de modo, plataforma)
    ├── pm2.js        — wrapper de pm2 para gestión del proceso (iniciar/detener/reiniciar)
    ├── ui.js         — constructores de embeds y botones de Discord.js
    └── live.js       — actualizador del canal "Now Playing" en vivo

control-bot.js        — bot de Discord separado para control remoto por MD
debug-smtc.ps1        — script de diagnóstico SMTC independiente (Windows)
build.mjs             — script de compilación con esbuild + pkg
```

---

## ❓ FAQ

**¿Se necesita Spotify Premium?**
No. La app lee desde D-Bus/MPRIS (Linux) o SMTC (Windows), no usa la API de Spotify.

**¿Funciona en Linux?**
Sí. Spotify en Linux expone la reproducción mediante D-Bus MPRIS, la app lo lee directamente.

**¿Pueden banear mi cuenta de Discord por esto?**
Usar un user token viola los Términos de Servicio de Discord. Úsalo bajo tu propio riesgo.

**¿Cómo cambio mi token?**
Elimina el archivo `%APPDATA%\AngelLyrics\config.json` y vuelve a ejecutar la app.

**¿No se ven las letras o son incorrectas?**
Puede que LRCLIB no tenga esa canción. El estado mostrará el nombre de la canción y el artista como alternativa.

---

## 📄 Licencia

[MIT](LICENSE) © [FYSPA](https://github.com/FYSPA)
