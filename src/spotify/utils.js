import { spawn } from 'child_process';

export function makeTrackId(title, artist) {
  return `${title}::${artist}`.toLowerCase().replace(/\s+/g, '-');
}

export function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (d) => (stdout += d));
    proc.on('close', (code) => resolve(code === 0 ? stdout : null));
    proc.on('error', () => resolve(null));
  });
}
