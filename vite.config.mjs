import { cp } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '::1',
    port: 5174,
    strictPort: true,
    headers: { 'Cache-Control': 'no-cache' },
  },
  build: {
    rolldownOptions: {
      input: {
        portfolio: fileURLToPath(new URL('./index.html', import.meta.url)),
        ripple: fileURLToPath(new URL('./ripple-test/index.html', import.meta.url)),
        sideViewWater: fileURLToPath(new URL('./side-view-water-test.html', import.meta.url)),
        waterStreamTest: fileURLToPath(new URL('./water-stream-test.html', import.meta.url)),
      },
    },
  },
  plugins: [
    {
      name: 'existing-script-entries',
      // Let Vite bundle the existing entries without editing the source HTML.
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replace(
          /<script src="((?:script|home-typography)\.js(?:\?[^"\s]*)?)"><\/script>/g,
          '<script type="module" src="$1"></script>',
        ),
      },
    },
    {
      name: 'copy-portfolio-media',
      apply: 'build',
      // These runtime string paths are not part of Vite's import graph.
      async writeBundle(options) {
        for (const directory of ['assets', 'images', 'sounds']) {
          await cp(
            new URL(`./${directory}`, import.meta.url),
            resolve(options.dir, directory),
            { recursive: true, filter: (source) => basename(source) !== '.DS_Store' },
          );
        }
      },
    },
  ],
});
