// Standalone Linye build: `npx vite build -c vite.linye.config.ts` -> dist-linye/ (self-contained: own index.html + assets/).
import { defineConfig } from 'vite';
import { renameSync, existsSync } from 'fs';

// build id (shown on the title card + debug overlay) and cache-busting: no-cache meta on index.html + ?v=<build> on the entry assets
const BUILD = new Date(Date.now() + 7 * 3600e3).toISOString().slice(2, 16).replace(/[-T:]/g, '');
const bust = { name: 'cache-bust', generateBundle(this: any) { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) }); }, transformIndexHtml: { order: 'post' as const, handler: (html: string) => html
  .replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n  <meta http-equiv="Pragma" content="no-cache" />\n  <meta http-equiv="Expires" content="0" />')
  .replace(/((?:src|href)="\.\/assets\/[^"?]+\.(?:js|css))"/g, `$1?v=${BUILD}"`) } };
export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  base: './',
  build: { outDir: 'dist-linye', emptyOutDir: true, chunkSizeWarningLimit: 2000, target: ['es2018', 'safari13'], rollupOptions: { input: 'linye.html' } },
  plugins: [bust, { name: 'linye-index', closeBundle() { if (existsSync('dist-linye/linye.html')) renameSync('dist-linye/linye.html', 'dist-linye/index.html'); } }],
});
