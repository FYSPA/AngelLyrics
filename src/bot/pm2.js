import { exec } from 'child_process';
import { promisify } from 'util';
import { PM2_NAME } from './constants.js';

const execAsync = promisify(exec);

export async function pm2Start() {
  try {
    await execAsync(`pm2 start ${PM2_NAME}`);
    return null;
  } catch {
    try {
      await execAsync(`pm2 start src/index.js --name ${PM2_NAME}`);
      return null;
    } catch (err2) {
      return err2.message;
    }
  }
}

export async function pm2Stop() {
  try {
    await execAsync(`pm2 stop ${PM2_NAME}`);
    return null;
  } catch (err) {
    return err.message;
  }
}

export async function pm2Restart() {
  try {
    await execAsync(`pm2 restart ${PM2_NAME}`);
    return null;
  } catch (err) {
    return err.message;
  }
}

export async function pm2Reset() {
  try {
    await execAsync(`pm2 delete ${PM2_NAME} 2>/dev/null || true`);
    await execAsync(`pm2 start src/index.js --name "${PM2_NAME}" -- --reset`);
    return null;
  } catch (err) {
    return err.message;
  }
}

export async function getPm2Status() {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const list = JSON.parse(stdout);
    return list.find((p) => p.name === PM2_NAME) || null;
  } catch {
    return null;
  }
}

export async function getPm2Logs(lines = 30) {
  try {
    const { stdout } = await execAsync(`pm2 logs ${PM2_NAME} --nostream --lines ${lines} --raw`);
    return stdout || 'No hay logs disponibles.';
  } catch {
    return 'No hay logs disponibles.';
  }
}
