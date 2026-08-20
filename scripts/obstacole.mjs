/**
 * Descarcă din OSM drumurile, clădirile și apele din jurul fiecărei tarlale.
 * Motorul de parcelare le scade din teren, ca niciun lot să nu cadă peste o
 * stradă sau peste o casă.
 *
 * Rulează cu `npm run obstacole` (`--force` ca să reia descărcarea). Rezultatul
 * e versionat în `_research/obstacole/`, ca build-ul să nu depindă de rețea.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AICI = dirname(fileURLToPath(import.meta.url));
const RADACINA = join(AICI, '..');
const DEST = join(RADACINA, '_research', 'obstacole');

const OVERPASS = 'https://overpass-api.de/api/interpreter';

/** Clasele OSM traduse în clasele pe care le înțelege motorul de parcelare. */
const CLASA = {
  motorway: 'motorway', motorway_link: 'motorway',
  trunk: 'trunk', trunk_link: 'trunk',
  primary: 'primary', primary_link: 'primary',
  secondary: 'secondary', secondary_link: 'secondary',
  tertiary: 'tertiary', tertiary_link: 'tertiary',
  residential: 'residential', unclassified: 'unclassified', living_street: 'residential',
  service: 'service', track: 'track', path: 'path', footway: 'footway', cycleway: 'path',
};

async function overpass(query) {
  for (let i = 0; i < 5; i += 1) {
    try {
      const r = await fetch(OVERPASS, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        headers: { 'User-Agent': 'rtr-terenuri-demo/1.0' },
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return await r.json();
    } catch (e) {
      console.error(`  reîncerc (${e.message})`);
      await new Promise((res) => setTimeout(res, 7000));
    }
  }
  throw new Error('Overpass nu răspunde');
}

function bboxCu(inel, margineGrade = 0.004) {
  let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
  for (const [lon, lat] of inel) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  return [
    (minLat - margineGrade).toFixed(5),
    (minLon - margineGrade).toFixed(5),
    (maxLat + margineGrade).toFixed(5),
    (maxLon + margineGrade).toFixed(5),
  ].join(',');
}

export async function descarcaObstacole(slug, inel, forteaza = false) {
  mkdirSync(DEST, { recursive: true });
  const fisier = join(DEST, `${slug}.geojson`);
  if (existsSync(fisier) && !forteaza) {
    return JSON.parse(readFileSync(fisier, 'utf8'));
  }

  const bbox = bboxCu(inel);
  const q = `
[out:json][timeout:120];
(
  way["highway"](${bbox});
  way["building"](${bbox});
  way["natural"="water"](${bbox});
  way["waterway"~"^(river|stream|ditch|canal)$"](${bbox});
  way["landuse"~"^(cemetery|industrial|quarry)$"](${bbox});
);
out geom;`;

  const d = await overpass(q);
  const features = [];
  for (const e of d.elements) {
    const g = e.geometry;
    if (!g || g.length < 2) continue;
    const t = e.tags ?? {};
    const coords = g.map((p) => [+p.lon.toFixed(6), +p.lat.toFixed(6)]);
    const inchis = coords.length > 3 && coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1];

    if (t.highway) {
      const clasa = CLASA[t.highway];
      if (!clasa) continue;
      features.push({
        type: 'Feature',
        properties: { tip: 'drum', clasa, nume: t.name ?? null },
        geometry: { type: 'LineString', coordinates: coords },
      });
    } else if (inchis) {
      const tip = t.building ? 'cladire' : t.natural === 'water' ? 'apa' : t.landuse ? 'folosinta' : 'altul';
      features.push({
        type: 'Feature',
        properties: { tip, clasa: tip },
        geometry: { type: 'Polygon', coordinates: [coords] },
      });
    } else if (t.waterway) {
      features.push({
        type: 'Feature',
        properties: { tip: 'apa', clasa: 'path' },
        geometry: { type: 'LineString', coordinates: coords },
      });
    }
  }

  const colectie = { type: 'FeatureCollection', features };
  writeFileSync(fisier, JSON.stringify(colectie));
  const nr = features.reduce((acc, f) => {
    acc[f.properties.tip] = (acc[f.properties.tip] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`${slug}: ${features.length} obstacole`, nr);
  return colectie;
}

/** Rulare directă: reia descărcarea pentru toate parcelările definite. */
// Calea proiectului conține spații, iar import.meta.url le codează ca %20,
// deci comparația directă cu argv[1] ar da mereu fals.
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const { PARCELARI } = await import('./situri.mjs');
  const forteaza = process.argv.includes('--force');
  for (const p of PARCELARI) {
    await descarcaObstacole(p.slug, p.teren, forteaza);
    await new Promise((r) => setTimeout(r, 1500));
  }
}
