import * as esbuild from 'esbuild';
import { chmodSync } from 'node:fs';

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});

await esbuild.build({
  entryPoints: ['../a11y-server/src/index.ts'],
  bundle: true,
  outfile: 'server/index.js',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  minify: false,
  // Launched via `node server/index.js` — do not inject a shebang (breaks CJS parse)
  external: ['jiti', 'jiti/package.json'],
  logLevel: 'info',
});

chmodSync('server/index.js', 0o755);
console.log('Bundled dist/extension.js and server/index.js');
