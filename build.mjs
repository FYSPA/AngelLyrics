/**
 * Build script: ESM → CJS bundle (esbuild) → standalone .exe (pkg)
 *
 * Output: dist/AngelLyrics.exe
 * Users only need to double-click the .exe — no Node.js required.
 */

import { build } from 'esbuild';
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

console.log('📦 Bundling with esbuild…');
await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/bundle.cjs',
  // Keep dynamic requires working (express, etc.)
  // No minify — keeps stack traces readable
  external: [],
});
console.log('   ✓ dist/bundle.cjs');

console.log('📦 Packaging with pkg…');
execSync(
  'npx pkg dist/bundle.cjs --targets node18-win-x64 --output dist/AngelLyrics.exe',
  { stdio: 'inherit' }
);
console.log('   ✓ dist/AngelLyrics.exe');
console.log('\n✅ Build hoàn tất! Chạy: dist\\AngelLyrics.exe');
