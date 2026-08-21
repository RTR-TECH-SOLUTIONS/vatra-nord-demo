/**
 * Ajutor de reglaj, nu parte din build.
 *
 * Caută pe ce deplasare de-a lungul drumului iese cea mai curată fâșie: toate
 * loturile patrulatere, cu deschidere apropiată de cea nominală. O clădire sau
 * un acces care taie fâșia se vede imediat ca lot cu șase laturi și front de
 * nouă metri, iar aia nu se vinde nimănui.
 *
 * Rulează cu `node scripts/cauta-felie.mjs <slug>`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genereazaParcelare } from '../src/lib/parcelare.js';
import { PARCELARI } from './situri.mjs';
import { felieLaDrum } from './felie.mjs';

const AICI = dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
const cfg = PARCELARI.find((p) => p.slug === slug);
if (!cfg) throw new Error(`Nu găsesc parcelarea ${slug}`);

const obstacole = JSON.parse(
  readFileSync(join(AICI, '..', '_research', 'obstacole', `${slug}.geojson`), 'utf8'),
).features;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (let d = -120; d <= 120; d += 10) {
  const proba = { ...cfg, felie: { ...cfg.felie, deplasare: d } };
  let r;
  try {
    const felie = felieLaDrum(proba, obstacole);
    r = genereazaParcelare({
      teren: felie.inel,
      obstacole,
      azimut: felie.azimut,
      front: cfg.front,
      adancime: cfg.adancime,
      maxBenzi: 1,
      drumInterior: 0,
      pasTransversal: 0,
      drumTransversal: 0,
      retragere: cfg.retragere ?? 2,
      minSuprafata: Math.round(cfg.front * cfg.adancime * 0.62),
      marjaObstacol: 3,
      rnd: mulberry32(cfg.seed),
    });
  } catch (e) {
    console.log(String(d).padStart(5), 'eroare:', e.message);
    continue;
  }
  const fronturi = r.loturi.map((l) => l.front);
  const laturi = Math.max(...r.loturi.map((l) => l.laturi));
  console.log(
    String(d).padStart(5),
    `${r.loturi.length} loturi`,
    `front min ${Math.min(...fronturi).toFixed(1)}`,
    `laturi max ${laturi}`,
    `neregulate ${r.loturi.filter((l) => l.laturi > 4).length}`,
  );
}
