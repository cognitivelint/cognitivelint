import * as esbuild from 'esbuild';

// Bundle extension
await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  minify: true,
});

// Bundle server - mark ESLint internals as external (loaded at runtime)
await esbuild.build({
  entryPoints: ['../a11y-server/src/index.ts'],
  bundle: true,
  outfile: 'server/index.js',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  minify: true,
  external: ['jiti', 'jiti/package.json'],
});

console.log('Extension and server bundled successfully');
