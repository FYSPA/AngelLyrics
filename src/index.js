import 'dotenv/config';
import { initLogger } from './logger.js';
import { startPolling, stopPolling } from './core/poll.js';
import { runSetup } from './setup.js';
import { getToken, clearToken, getDisplayMode } from './config.js';
import { onUnauthorized, clearCustomStatus } from './status.js';

async function main() {
  initLogger();
  console.log('🎵 Discord Lyrics Status iniciando…');

  if (process.argv.includes('--reset')) {
    console.log('[Config] --reset: borrando token y reabriendo configuración…');
    clearToken();
  }

  onUnauthorized(async () => {
    stopPolling();
    console.log('\n[Config] Token expirado. Abriendo navegador para ingresar uno nuevo…');
    await runSetup();
    console.log('[Config] ✓ Nuevo token guardado. Reanudando seguimiento de música.\n');
    await startPolling();
  });

  if (!getToken()) {
    console.log('[Config] Sin token guardado. Abriendo navegador para configurar…');
    await runSetup();
    console.log('[Config] ✓ Configuración lista. Comenzando a escuchar música.\n');
  } else {
    console.log(`   Token: OK  |  Modo: ${getDisplayMode()}  |  Presiona Ctrl+C para detener.\n`);
  }

  await startPolling();
}

process.on('SIGINT', async () => {
  console.log('\n[Principal] Cerrando…');
  stopPolling();
  clearCustomStatus();
  process.exit(0);
});

main();
