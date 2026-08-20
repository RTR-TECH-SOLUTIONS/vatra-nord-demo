/**
 * MapLibre își încarcă workerul deducând calea din `import.meta.url`, adică se
 * așteaptă ca `maplibre-gl-worker.mjs` să stea lângă `maplibre-gl.mjs`. Vite
 * mută modulul (în dev în .vite/deps, la build într-un chunk cu hash), deci
 * calea dedusă nu mai există și sursele GeoJSON rămân goale, tăcut.
 *
 * Copiem cele două fișiere în public/ și îi spunem explicit unde e workerul
 * prin setWorkerUrl. Funcționează la fel în dev, la build și pe hosting static.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AICI = dirname(fileURLToPath(import.meta.url));
const DEST = join(AICI, '..', 'public', 'maplibre');

const sursa = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
const fisiere = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

mkdirSync(DEST, { recursive: true });
for (const f of fisiere) {
  copyFileSync(join(sursa, f), join(DEST, f));
}
console.log(`Worker MapLibre copiat în public/maplibre/ (${fisiere.join(', ')})`);
