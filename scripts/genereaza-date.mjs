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
import { descarcaObstacole } from './obstacole.mjs';

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

/** Azimutul laturii de care se lipesc rândurile, în grade de la nord. */
function azimutAncora(teren, ancora = 0) {
  const pr = proiectieLocala(teren[0]);
  const a = pr.laMetri(teren[ancora % teren.length]);
  const b = pr.laMetri(teren[(ancora + 1) % teren.length]);
  return ((Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI + 360) % 180;
}

/** Direcția spre interiorul terenului, perpendiculară pe ancoră. */
function azimutNormala(teren, ancora = 0) {
  const pr = proiectieLocala(teren[0]);
  const P = teren.map(pr.laMetri);
  const a = P[ancora % P.length];
  const b = P[(ancora + 1) % P.length];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  let nx = -dy / L;
  let ny = dx / L;
  const cx = P.reduce((s, p) => s + p[0], 0) / P.length;
  const cy = P.reduce((s, p) => s + p[1], 0) / P.length;
  if ((cx - a[0]) * nx + (cy - a[1]) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return ((Math.atan2(nx, ny) * 180) / Math.PI + 360) % 360;
}

function normalizeaza(valori) {
  const min = Math.min(...valori);
  const interval = Math.max(...valori) - min || 1;
  return valori.map((v) => (v - min) / interval);
}

async function proceseaza(cfg) {
  const obstacole = await descarcaObstacole(cfg.slug, cfg.teren);
  const azimut = azimutAncora(cfg.teren, cfg.ancora);

  const rezultat = genereazaParcelare({
    teren: cfg.teren,
    obstacole: obstacole.features,
    azimut,
    front: cfg.front,
    adancime: cfg.adancime,
    drumInterior: cfg.drumInterior,
    // Blocuri de circa șapte loturi între străzile perpendiculare, ca într-o
    // parcelare reală.
    pasTransversal: cfg.pasTransversal ?? 130,
    drumTransversal: cfg.drumTransversal ?? 8,
    retragere: cfg.retragere ?? 5,
    // Sub 62% din lotul nominal, fâșia rămasă la hotar nu se vinde ca lot.
    minSuprafata: cfg.minSuprafata ?? Math.round(cfg.front * cfg.adancime * 0.62),
    maxBenzi: cfg.benzi ?? Infinity,
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
  for (const [, lista] of peSir) {
    lista.sort((a, b) => a.u - b.u);
    lista.forEach((l, i) => {
      l.colt = i === 0 || i === lista.length - 1;
      const numar = l.sir === 0 ? i * 2 + 1 : i * 2 + 2;
      l.cod = `${LITERE[l.banda] ?? 'Z'}${numar}`;
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
    if (l.colt) note.push('lot de colț, deschidere pe două laturi');
    if (l.laturi > 4) note.push('formă neregulată, urmează hotarul terenului');
    if (l.banda === nrBenzi - 1 && cfg.slug === 'lacul-vlasiei') note.push('ultima bandă, cu deschidere către lac');
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

  const azNormala = azimutNormala(cfg.teren, cfg.ancora);
  const { seed, mix, teren, ancora, front, adancime, drumInterior, retragere,
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
      lotTipic: { front, adancime, drumInterior },
      azimut: +azimut.toFixed(1),
      azimutNormala: +azNormala.toFixed(1),
      hotar: teren.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]),
      tarlaHa: rezultat.statistici.teren_ha,
      camera: {
        center: [+((bbox[0] + bbox[2]) / 2).toFixed(6), +((bbox[1] + bbox[3]) / 2).toFixed(6)],
        zoom: 15.6,
        bearing: +(((azimut - 90 + 540) % 360) - 180).toFixed(1),
        pitch: 60,
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

for (const r of rezultate) {
  const s = r.proiect.statistici;
  console.log(
    `${r.proiect.slug.padEnd(15)} ${String(s.total).padStart(4)} loturi · ` +
      `${s.disponibile} disp / ${s.rezervate} rez / ${s.vandute} vând / ${s.in_pregatire} preg · ` +
      `${s.benzi} benzi · ${s.suprafata_min}-${s.suprafata_max} mp · ` +
      `randament ${s.randament}% · ${s.loturi_neregulate} loturi cu formă neregulată (max ${s.laturi_max} laturi)`,
  );
}
console.log(
  `\nTotal ${rezultate.reduce((n, r) => n + r.features.length, 0)} loturi, ` +
    `${rezultate.reduce((n, r) => n + r.drumuri.length, 0)} tronsoane de drum interior, ` +
    `${POI.length} puncte de interes.`,
);
