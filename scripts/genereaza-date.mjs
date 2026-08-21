/**
 * Generează datele demo: geometria loturilor, drumurile interioare, fișele de
 * parcelare și punctele de interes. Rulează cu `npm run date`.
 *
 * Împărțirea propriu-zisă o face `src/lib/parcelare.js`, același motor pe care
 * îl folosește și panoul de administrare. Aici se stabilesc doar amplasamentele,
 * codurile, statusurile și prețurile.
 *
 * Statusurile NU sunt aleatorii: se distribuie pornind de la intrarea în
 * parcelare, pentru că așa se vinde în realitate, bandă cu bandă. O distribuție
 * uniformă s-ar vedea imediat că e generată.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { genereazaParcelare, proiectieLocala } from '../src/lib/parcelare.js';
import { PARCELARI } from './situri.mjs';
import { PROPRIETATI } from './proprietati.mjs';
import { TESTIMONIALE } from './testimoniale.mjs';
import { descarcaObstacole } from './obstacole.mjs';
import { felieLaDrum } from './felie.mjs';

const AICI = dirname(fileURLToPath(import.meta.url));
const RADACINA = join(AICI, '..');
const DEST = join(RADACINA, 'src', 'data');
const DEST_PUBLIC = join(RADACINA, 'public', 'date');

const ACTUALIZAT = '2026-08-12';
const LITERE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** PRNG determinist: aceleași date la fiecare rulare. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POI = [
  { nume: 'Aeroportul Henri Coandă', categorie: 'transport', lon: 26.1026, lat: 44.5683 },
  { nume: 'Therme București', categorie: 'agrement', lon: 26.0854, lat: 44.6054 },
  { nume: 'EdenLand Park', categorie: 'agrement', lon: 26.1027, lat: 44.6532 },
  { nume: 'Lacul Snagov', categorie: 'agrement', lon: 26.1629, lat: 44.7066 },
  { nume: 'Pădurea Băneasa', categorie: 'agrement', lon: 26.0923, lat: 44.5252 },
  { nume: 'Băneasa Shopping City', categorie: 'comerț', lon: 26.0895, lat: 44.5073 },
  { nume: 'Spitalul Agrippa Ionescu', categorie: 'sănătate', lon: 26.1197, lat: 44.6461 },
  { nume: 'Piața Victoriei', categorie: 'acces', lon: 26.0876, lat: 44.4517 },
  { nume: 'Kaufland Balotești', categorie: 'comerț', lon: 26.073255, lat: 44.602511 },
  { nume: 'Carrefour Balotești', categorie: 'comerț', lon: 26.066873, lat: 44.604629 },
  { nume: 'Lidl Corbeanca', categorie: 'comerț', lon: 26.032287, lat: 44.593293 },
  { nume: 'Școala Gimnazială nr. 1 Balotești', categorie: 'școală', lon: 26.074018, lat: 44.610736 },
  { nume: 'Școala nr. 1 Corbeanca', categorie: 'școală', lon: 26.039755, lat: 44.593305 },
  { nume: 'Școala Gimnazială nr. 2 Balotești', categorie: 'școală', lon: 26.110972, lat: 44.623792 },
];

function normalizeaza(valori) {
  const min = Math.min(...valori);
  const interval = Math.max(...valori) - min || 1;
  return valori.map((v) => (v - min) / interval);
}

async function proceseaza(cfg) {
  const obstacole = await descarcaObstacole(cfg.slug, cfg.teren);
  const felie = felieLaDrum(cfg, obstacole.features);

  const rezultat = genereazaParcelare({
    teren: felie.inel,
    obstacole: obstacole.features,
    azimut: felie.azimut,
    front: cfg.front,
    adancime: cfg.adancime,
    // Un singur șir de loturi, cu fața la drumul existent: la cinci-șapte
    // loturi, un drum interior ar fi o alee care nu duce nicăieri.
    maxBenzi: 1,
    drumInterior: 0,
    pasTransversal: 0,
    drumTransversal: 0,
    retragere: cfg.retragere ?? 2,
    // Sub 62% din lotul nominal, fâșia rămasă la hotar nu se vinde ca lot.
    minSuprafata: cfg.minSuprafata ?? Math.round(cfg.front * cfg.adancime * 0.62),
    marjaObstacol: cfg.marjaObstacol ?? 3,
    rnd: mulberry32(cfg.seed),
  });

  const loturi = rezultat.loturi;
  if (!loturi.length) throw new Error(`Parcelarea ${cfg.slug} nu a produs niciun lot`);

  const rnd = mulberry32(cfg.seed + 7);
  const nrBenzi = Math.max(...loturi.map((l) => l.banda)) + 1;

  // Numerotare ca la adrese reale: impare pe o parte a străzii, pare pe cealaltă.
  const peSir = new Map();
  for (const l of loturi) {
    const cheie = `${l.banda}-${l.sir}`;
    if (!peSir.has(cheie)) peSir.set(cheie, []);
    peSir.get(cheie).push(l);
  }
  // Numerotare ca la adrese reale. Cu două șiruri, impare pe o parte și pare pe
  // cealaltă; cu un singur șir, consecutiv, pentru că „Lotul 3” se ține minte,
  // iar „Lotul A5” dintr-o parcelare de șase loturi e birocrație inventată.
  const dublu = loturi.some((l) => l.sir === 1);
  for (const [, lista] of peSir) {
    lista.sort((a, b) => a.u - b.u);
    lista.forEach((l, i) => {
      l.colt = i === 0 || i === lista.length - 1;
      const numar = dublu ? (l.sir === 0 ? i * 2 + 1 : i * 2 + 2) : i + 1;
      l.cod = dublu || nrBenzi > 1 ? `${LITERE[l.banda] ?? 'Z'}${numar}` : String(numar);
    });
  }

  // Frontul de dezvoltare: se construiește dinspre intrare, bandă cu bandă.
  const uN = normalizeaza(loturi.map((l) => l.u));
  loturi.forEach((l, i) => {
    l.bandaNorm = nrBenzi > 1 ? l.banda / (nrBenzi - 1) : 0;
    l.scor = 0.34 * uN[i] + 0.54 * l.bandaNorm + 0.22 * rnd();
  });

  const dupaScor = [...loturi].sort((a, b) => a.scor - b.scor);
  const total = dupaScor.length;
  const nVandut = Math.round(total * cfg.mix.vandut);
  const nPregatire = Math.round(total * cfg.mix.in_pregatire);
  const nRezervat = Math.round(total * cfg.mix.rezervat);

  for (const l of dupaScor) l.status = 'disponibil';
  dupaScor.slice(0, nVandut).forEach((l) => { l.status = 'vandut'; });
  dupaScor.slice(total - nPregatire).forEach((l) => { l.status = 'in_pregatire'; });

  const candidati = dupaScor.slice(nVandut, total - nPregatire);
  const fereastra = candidati.slice(0, Math.max(nRezervat, Math.ceil(candidati.length * 0.34)));
  [...fereastra].sort(() => rnd() - 0.5).slice(0, nRezervat).forEach((l) => { l.status = 'rezervat'; });

  // Preț: frontul mare și apropierea de intrare trag în sus, colțurile au spor.
  const [pMin, pMax] = cfg.pretMp;
  const fronturi = normalizeaza(loturi.map((l) => l.front));
  loturi.forEach((l, i) => {
    const amestec = 0.42 * fronturi[i] + 0.34 * (1 - l.bandaNorm) + 0.24 * rnd();
    l.pretMp = Math.min(Math.round(pMin + (pMax - pMin) * amestec) + (l.colt ? 3 : 0), pMax + 3);
    l.pretTotal = l.suprafata * l.pretMp;

    const note = [];
    if (l.colt) note.push('lot de capăt, deschidere pe două laturi');
    if (l.laturi > 4) note.push('formă neregulată, urmează hotarul terenului');
    l.observatii = note.length ? note.join(', ') : null;
  });

  const features = loturi
    .slice()
    .sort((a, b) => a.banda - b.banda || a.sir - b.sir || a.pozitie - b.pozitie)
    .map((l) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [l.inel] },
      properties: {
        id: `${cfg.slug}-${l.cod.toLowerCase()}`,
        cod: l.cod,
        proiect: cfg.slug,
        sir: l.sir,
        status: l.status,
        suprafata: l.suprafata,
        front: l.front,
        laturi: l.laturi,
        pret_total: l.pretTotal,
        pret_mp: l.pretMp,
        tva_inclus: false,
        observatii: l.observatii,
        actualizat: ACTUALIZAT,
      },
    }));

  const disponibile = loturi.filter((l) => l.status === 'disponibil');
  const vandabile = loturi.filter((l) => l.status !== 'in_pregatire');
  const statistici = {
    total: loturi.length,
    disponibile: disponibile.length,
    rezervate: loturi.filter((l) => l.status === 'rezervat').length,
    vandute: loturi.filter((l) => l.status === 'vandut').length,
    in_pregatire: loturi.filter((l) => l.status === 'in_pregatire').length,
    benzi: nrBenzi,
    suprafata_min: Math.min(...loturi.map((l) => l.suprafata)),
    suprafata_max: Math.max(...loturi.map((l) => l.suprafata)),
    suprafata_totala_ha: +(loturi.reduce((s, l) => s + l.suprafata, 0) / 10000).toFixed(1),
    front_min: Math.min(...loturi.map((l) => l.front)),
    pret_mp_min: Math.min(...vandabile.map((l) => l.pretMp)),
    pret_mp_max: Math.max(...vandabile.map((l) => l.pretMp)),
    pret_total_min: disponibile.length ? Math.min(...disponibile.map((l) => l.pretTotal)) : null,
    loturi_neregulate: rezultat.statistici.neregulate,
    laturi_max: rezultat.statistici.laturi_max,
    randament: rezultat.statistici.randament,
  };

  const bbox = features.reduce(
    (b, f) => {
      for (const [x, y] of f.geometry.coordinates[0]) {
        b[0] = Math.min(b[0], x);
        b[1] = Math.min(b[1], y);
        b[2] = Math.max(b[2], x);
        b[3] = Math.max(b[3], y);
      }
      return b;
    },
    [180, 90, -180, -90],
  );

  const { seed, mix, teren, ancora, felie: _felie, front, adancime, drumInterior, retragere,
          minSuprafata, marjaObstacol, benzi, ...rest } = cfg;

  return {
    features,
    drumuri: rezultat.drumuri.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: d.inel },
      properties: { proiect: cfg.slug, banda: d.banda },
    })),
    proiect: {
      ...rest,
      lotTipic: { front, adancime, drumInterior: 0 },
      azimut: +felie.azimut.toFixed(1),
      azimutNormala: +felie.azimutNormala.toFixed(1),
      hotar: felie.inel,
      tarlaHa: rezultat.statistici.teren_ha,
      camera: {
        center: [+((bbox[0] + bbox[2]) / 2).toFixed(6), +((bbox[1] + bbox[3]) / 2).toFixed(6)],
        zoom: 17.4,
        // Camera stă în spatele loturilor și privește peste ele spre drum.
        bearing: +(((felie.azimutNormala + 180 + 540) % 360) - 180).toFixed(1),
        pitch: 46,
      },
      bbox: bbox.map((n) => +n.toFixed(5)),
      statistici,
      actualizat: ACTUALIZAT,
    },
  };
}

/* --------------------------------------------------------------------- scriere */

const rezultate = [];
for (const cfg of PARCELARI) {
  rezultate.push(await proceseaza(cfg));
}

mkdirSync(DEST, { recursive: true });
mkdirSync(DEST_PUBLIC, { recursive: true });

const colectieLoturi = JSON.stringify({
  type: 'FeatureCollection',
  features: rezultate.flatMap((r) => r.features),
});
// src/data pentru randarea la build (tabele, pagini de lot),
// public/date pentru fetch-ul din browser al hărții.
writeFileSync(join(DEST, 'loturi.json'), colectieLoturi);
writeFileSync(join(DEST_PUBLIC, 'loturi.geojson'), colectieLoturi);

const colectieDrumuri = JSON.stringify({
  type: 'FeatureCollection',
  features: rezultate.flatMap((r) => r.drumuri),
});
writeFileSync(join(DEST_PUBLIC, 'drumuri.geojson'), colectieDrumuri);

writeFileSync(join(DEST, 'proiecte.json'), JSON.stringify(rezultate.map((r) => r.proiect), null, 2));

const colectiePoi = JSON.stringify(
  {
    type: 'FeatureCollection',
    features: POI.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { nume: p.nume, categorie: p.categorie },
    })),
  },
  null,
  1,
);
writeFileSync(join(DEST_PUBLIC, 'poi.geojson'), colectiePoi);
writeFileSync(join(DEST, 'poi.json'), colectiePoi);

// Pinurile de proprietate. Nu trec prin motorul de parcelare, sunt puncte cu
// nume și stare, deci se scriu direct. Panoul le poate rescrie pe toate.
const colectiePinuri = JSON.stringify(PROPRIETATI, null, 1);
writeFileSync(join(DEST_PUBLIC, 'pinuri.json'), colectiePinuri);
writeFileSync(join(DEST, 'pinuri.json'), colectiePinuri);

const colectieTestimoniale = JSON.stringify(TESTIMONIALE, null, 1);
writeFileSync(join(DEST_PUBLIC, 'testimoniale.json'), colectieTestimoniale);
writeFileSync(join(DEST, 'testimoniale.json'), colectieTestimoniale);

for (const r of rezultate) {
  const s = r.proiect.statistici;
  console.log(
    `${r.proiect.slug.padEnd(15)} ${String(s.total).padStart(4)} loturi · ` +
      `${s.disponibile} disp / ${s.rezervate} rez / ${s.vandute} vând / ${s.in_pregatire} preg · ` +
      `${s.suprafata_min}-${s.suprafata_max} mp · ` +
      `randament ${s.randament}% · ${s.loturi_neregulate} loturi cu formă neregulată (max ${s.laturi_max} laturi)`,
  );
}
console.log(
  `\nTotal ${rezultate.reduce((n, r) => n + r.features.length, 0)} loturi, ` +
    `${rezultate.reduce((n, r) => n + r.drumuri.length, 0)} tronsoane de drum interior, ` +
    `${POI.length} puncte de interes.`,
);
