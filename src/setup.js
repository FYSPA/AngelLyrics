import 'dotenv/config';
import express from 'express';
import { spawn } from 'child_process';
import { saveToken, getToken, getSpotifyRefreshToken } from './config.js';
import { getSpotifyAuthUrl, exchangeSpotifyCode } from './spotify/index.js';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_CONFIGURED = !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);

// ── Setup UI HTML ─────────────────────────────────────────────────────────────

const SETUP_HTML = /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Discord Lyrics Status — Configuración</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1e1f22; color: #dbdee1;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .card {
      background: #2b2d31; border-radius: 16px; padding: 36px 40px;
      width: 100%; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,.4);
    }
    .logo { font-size: 32px; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #949ba4; margin-bottom: 28px; }

    .section-title { font-size: 13px; font-weight: 700; color: #b5bac1; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 12px; padding-top: 20px; border-top: 1px solid #3f4248; }

    .steps {
      background: #1e1f22; border-radius: 10px; padding: 18px 20px;
      margin-bottom: 24px; font-size: 13px; color: #b5bac1; line-height: 2;
    }
    .steps strong { color: #dbdee1; display: block; margin-bottom: 4px; }
    code {
      background: #111214; color: #00b0f4;
      padding: 1px 6px; border-radius: 4px; font-size: 12px;
    }

    label {
      display: block; font-size: 11px; font-weight: 700; letter-spacing: .8px;
      text-transform: uppercase; color: #b5bac1; margin-bottom: 8px;
    }
    .input-wrap { position: relative; }
    input[type=password], input[type=text] {
      width: 100%; padding: 11px 40px 11px 14px;
      background: #1e1f22; border: 1.5px solid #3f4248; border-radius: 8px;
      color: #dbdee1; font-size: 14px; outline: none; transition: border .15s;
    }
    input:focus { border-color: #5865f2; }
    .toggle-vis {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: #949ba4; cursor: pointer; font-size: 16px;
      line-height: 1; padding: 0;
    }
    .toggle-vis:hover { color: #dbdee1; }

    .error { color: #f23f42; font-size: 13px; margin-top: 10px; min-height: 18px; }

    button {
      width: 100%; padding: 13px; border: none; border-radius: 8px;
      color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
      transition: background .15s, opacity .15s;
    }
    button:hover { opacity: .9; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button.save { background: #5865f2; margin-top: 18px; }
    button.save:hover { background: #4752c4; }
    button.spotify { background: #1DB954; margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    button.spotify:hover { background: #1aa34a; }
    button.spotify:disabled { background: #3f4248; }
    button.close-btn { background: #3f4248; margin-top: 12px; font-size: 13px; }
    button.close-btn:hover { background: #4e5158; }

    .note {
      margin-top: 14px; font-size: 12px; color: #6d6f78; text-align: center;
    }
    .info-box {
      background: #1e1f22; border-radius: 10px; padding: 16px 18px;
      margin-bottom: 16px; font-size: 13px; color: #b5bac1; line-height: 1.6;
    }
    .info-box strong { color: #dbdee1; }

    .success {
      display: none;
    }
    .success-icon { font-size: 52px; margin-bottom: 16px; }
    .success h2 { font-size: 20px; margin-bottom: 8px; }
    .success p { font-size: 14px; color: #949ba4; line-height: 1.6; }
    .spotify-connected { color: #1DB954; }
    .spotify-disconnected { color: #949ba4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🎵</div>
    <h1>Discord Lyrics Status</h1>
    <p class="subtitle">Primera configuración — ingresa tu Discord User Token para comenzar.</p>

    <div id="main-form">
      <div class="steps">
        <strong>¿Cómo obtener tu User Token?</strong>
        1. Abre <code>discord.com/app</code> en el navegador (no la app)<br>
        2. Presiona <code>F12</code> → pestaña <strong>Network</strong><br>
        3. Haz cualquier acción (cambiar de servidor, enviar un mensaje)<br>
        4. Haz clic en cualquier request → <strong>Request Headers</strong> → busca <code>Authorization</code>
      </div>

      <label for="token">Discord User Token</label>
      <div class="input-wrap">
        <input id="token" type="password" placeholder="Pega tu token aquí…" autocomplete="off" spellcheck="false">
        <button class="toggle-vis" type="button" onclick="toggleVis()" title="Mostrar/ocultar token">👁</button>
      </div>
      <div class="error" id="error"></div>
      <button class="save" id="save-btn" onclick="save()">Guardar y comenzar</button>
      <p class="note">Tu token se guarda localmente en tu máquina y nunca se envía a ningún servidor externo.</p>
    </div>

    <div class="success" id="success">
      <div class="success-icon">✅</div>
      <h2 style="color:#23a55a">¡Discord configurado!</h2>
      <p>La app está corriendo en segundo plano.</p>

      <div class="section-title">Spotify (opcional)</div>
      <div id="spotify-section">
        <div id="spotify-not-configured" class="info-box" style="display:none">
          <strong>⚠️ Spotify no configurado</strong><br>
          Para conectar Spotify necesitas agregar <code>SPOTIFY_CLIENT_ID</code> y <code>SPOTIFY_CLIENT_SECRET</code> en el archivo <code>.env</code>.
        </div>
        <div id="spotify-ready" style="display:none">
          <div class="info-box">
            <strong>🎧 Conecta tu cuenta de Spotify</strong><br>
            Esto es opcional pero recomendado. Obtendrás información más precisa de la canción actual.
          </div>
          <button class="spotify" id="spotify-btn" onclick="connectSpotify()">
            <span>🎵</span> Conectar con Spotify
          </button>
        </div>
        <div id="spotify-loading" style="display:none">
          <div class="info-box" style="text-align:center">
            <p style="font-size:24px;margin-bottom:8px">⏳</p>
            <p>Conectando con Spotify…</p>
            <p style="font-size:12px;margin-top:6px">Espera mientras te redirigimos.</p>
          </div>
        </div>
        <div id="spotify-success" style="display:none">
          <div class="info-box">
            <p style="font-size:24px;text-align:center;margin-bottom:8px">🎉</p>
            <p style="text-align:center;color:#1DB954;font-weight:700">¡Spotify conectado!</p>
            <p style="text-align:center;font-size:12px;margin-top:6px">Tu cuenta de Spotify está vinculada.</p>
          </div>
        </div>
      </div>

      <button class="close-btn" onclick="window.close()">Cerrar esta ventana</button>
    </div>
  </div>

  <script>
    const tokenInput = document.getElementById('token');
    const errorEl   = document.getElementById('error');
    const saveBtn   = document.getElementById('save-btn');

    const spotifyConfigured = ${SPOTIFY_CONFIGURED};

    function toggleVis() {
      tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
    }

    tokenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
    });

    async function save() {
      errorEl.textContent = '';
      const token = tokenInput.value.trim();
      if (!token) { errorEl.textContent = 'Por favor ingresa tu token.'; return; }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Verificando…';

      try {
        const res  = await fetch('/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (data.ok) {
          document.getElementById('main-form').style.display = 'none';
          document.getElementById('success').style.display   = 'block';
          initSpotifySection();
        } else {
          errorEl.textContent = data.error || 'Error desconocido.';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Guardar y comenzar';
        }
      } catch {
        errorEl.textContent = 'No se pudo conectar al servidor. Intenta de nuevo.';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar y comenzar';
      }
    }

    function initSpotifySection() {
      if (!spotifyConfigured) {
        document.getElementById('spotify-not-configured').style.display = 'block';
        return;
      }
      // Check if already connected
      fetch('/api/spotify-status')
        .then(r => r.json())
        .then(data => {
          if (data.connected) {
            document.getElementById('spotify-success').style.display = 'block';
          } else {
            document.getElementById('spotify-ready').style.display = 'block';
          }
        })
        .catch(() => {
          document.getElementById('spotify-ready').style.display = 'block';
        });
    }

    async function connectSpotify() {
      document.getElementById('spotify-ready').style.display = 'none';
      document.getElementById('spotify-loading').style.display = 'block';
      window.location.href = '/api/spotify-auth';
    }

    // On load, check if Discord is already configured
    (function() {
      fetch('/api/status')
        .then(r => r.json())
        .then(data => {
          if (data.discordConfigured) {
            document.getElementById('main-form').style.display = 'none';
            document.getElementById('success').style.display = 'block';
            if (data.spotifyConnected) {
              document.getElementById('spotify-ready').style.display = 'none';
              document.getElementById('spotify-loading').style.display = 'none';
              document.getElementById('spotify-success').style.display = 'block';
            } else {
              initSpotifySection();
            }
          }
        })
        .catch(() => {});
    })();
  </script>
</body>
</html>`;

const CALLBACK_ERROR_HTML = /* html */ `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Error Spotify</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #1e1f22; color: #dbdee1; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
  .card { background: #2b2d31; border-radius: 16px; padding: 36px 40px; text-align: center; max-width: 400px; }
  .icon { font-size: 52px; margin-bottom: 16px; }
  h2 { color: #DA373C; margin-bottom: 8px; }
  p { color: #949ba4; font-size: 14px; line-height: 1.6; }
</style></head>
<body><div class="card">
  <div class="icon">❌</div>
  <h2>Error al conectar Spotify</h2>
  <p>No se pudo vincular tu cuenta de Spotify. Intenta de nuevo desde la <a href="/">página principal</a>.</p>
</div></body>
</html>`;

const CALLBACK_SUCCESS_HTML = /* html */ `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Spotify Conectado</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #1e1f22; color: #dbdee1; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
  .card { background: #2b2d31; border-radius: 16px; padding: 36px 40px; text-align: center; max-width: 400px; }
  .icon { font-size: 52px; margin-bottom: 16px; }
  h2 { color: #1DB954; margin-bottom: 8px; }
  p { color: #949ba4; font-size: 14px; line-height: 1.6; }
  a { color: #5865f2; text-decoration: none; }
</style></head>
<body><div class="card">
  <div class="icon">🎉</div>
  <h2>Spotify conectado</h2>
  <p>Tu cuenta de Spotify se ha vinculado correctamente.<br>Puedes cerrar esta ventana y volver a la <a href="/">página anterior</a>.</p>
</div></body>
</html>`;

// ── Setup server ──────────────────────────────────────────────────────────────

export function runSetup() {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    app.get('/', (_req, res) => res.send(SETUP_HTML));

    app.post('/setup', async (req, res) => {
      const { token } = req.body ?? {};

      if (!token || typeof token !== 'string' || token.length < 20) {
        return res.json({ ok: false, error: 'El token es demasiado corto o inválido.' });
      }

      try {
        const check = await fetch('https://discord.com/api/v9/users/@me', {
          headers: { Authorization: token },
        });
        if (check.status === 401) {
          return res.json({ ok: false, error: 'Token inválido (Discord lo rechazó). Verifica que lo copiaste bien.' });
        }
        if (!check.ok) {
          return res.json({ ok: false, error: `Discord respondió con error ${check.status}. Intenta más tarde.` });
        }
        const user = await check.json();
        console.log(`[Setup] Token válido — conectado como: ${user.username}`);
      } catch {
        return res.json({ ok: false, error: 'No se pudo conectar a Discord. Revisa tu conexión.' });
      }

      saveToken(token);
      res.json({ ok: true });
    });

    // ── Spotify OAuth endpoints ─────────────────────────────────────────────

    app.get('/api/status', (_req, res) => {
      res.json({ discordConfigured: !!getToken(), spotifyConnected: !!getSpotifyRefreshToken() });
    });

    app.get('/api/spotify-status', (_req, res) => {
      res.json({ connected: !!getSpotifyRefreshToken() });
    });

    app.get('/api/spotify-auth', (_req, res) => {
      if (!SPOTIFY_CONFIGURED) {
        return res.status(400).send('Spotify no está configurado. Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en el archivo .env');
      }
      const redirectUri = `http://127.0.0.1:${port}/spotify-callback`;
      const authUrl = getSpotifyAuthUrl(redirectUri);
      res.redirect(authUrl);
    });

    app.get('/spotify-callback', async (req, res) => {
      const { code, error } = req.query;

      if (error) {
        console.log(`[Setup] Spotify auth cancelado: ${error}`);
        return res.redirect('/?spotify=error');
      }

      if (!code) {
        return res.status(400).send('Falta el código de autorización.');
      }

      const redirectUri = `http://127.0.0.1:${port}/spotify-callback`;
      const result = await exchangeSpotifyCode(code, redirectUri);

      if (!result.ok) {
        console.error(`[Setup] Error Spotify callback: ${result.error}`);
        return res.send(CALLBACK_ERROR_HTML);
      }

      console.log('[Setup] Spotify conectado correctamente.');
      res.redirect('/?spotify=connected');
    });

    let server;
    let port;
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      const url = `http://127.0.0.1:${port}`;
      console.log(`[Setup] Abre el navegador en ${url}`);

      if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
      }

      // Keep server alive for 5 minutes to allow Spotify OAuth
      setTimeout(() => {
        server.close();
        resolve(null);
      }, 300_000);
    });
  });
}
