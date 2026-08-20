/**
 * Descarcă o vedere aeriană pentru fiecare parcelare, încadrată pe bbox-ul ei.
 * Rulează cu `npm run imagini` (nu face parte din build, ca să nu depindem de
 * rețea la fiecare compilare; fișierele sunt versionate în public/imagini).
 *
 * Sursa e serviciul de export al Esri World Imagery, același furnizor ca
 * fundalul provizoriu al hărții. La proiectul real se înlocuiește cu ortofoto
 * din dronă sau cu MapTiler, care are drept de uz comercial.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { cadruImagine, LATIME_IMAGINE, INALTIME_IMAGINE } from '../src/lib/imagine.js';

const AICI = dirname(fileURLToPath(import.meta.url));
const RADACINA = join(AICI, '..');
const DEST = join(RADACINA, 'public', 'imagini');

const LATIME = LATIME_IMAGINE;
const INALTIME = INALTIME_IMAGINE;

const proiecte = JSON.parse(readFileSync(join(RADACINA, 'src', 'data', 'proiecte.json'), 'utf8'));

mkdirSync(DEST, { recursive: true });

const forteaza = process.argv.includes('--force');

// Două mărimi din același cadru: una pentru pagini și liste, una mare pentru
// vederea apropiată de pe pagina lotului, unde imaginea se decupează la 3x.
const MARIMI = [
  { sufix: '', latime: LATIME, inaltime: INALTIME },
  { sufix: '-mare', latime: LATIME * 2.5, inaltime: INALTIME * 2.5 },
];

for (const p of proiecte) {
  const bbox = cadruImagine(p.bbox).map((n) => n.toFixed(6)).join(',');
  for (const m of MARIMI) {
    const fisier = join(DEST, `${p.slug}${m.sufix}.jpg`);
    if (existsSync(fisier) && !forteaza) {
      console.log(`${p.slug}${m.sufix}: există deja, sar peste (--force ca să reia)`);
      continue;
    }
    const url =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export' +
      `?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=${m.latime},${m.inaltime}&format=jpg&f=image`;

    const raspuns = await fetch(url);
    if (!raspuns.ok) throw new Error(`${p.slug}${m.sufix}: ${raspuns.status} ${raspuns.statusText}`);
    const tip = raspuns.headers.get('content-type') ?? '';
    if (!tip.startsWith('image/')) throw new Error(`${p.slug}${m.sufix}: răspuns neașteptat, ${tip}`);

    const date = Buffer.from(await raspuns.arrayBuffer());
    writeFileSync(fisier, date);
    console.log(`${p.slug}${m.sufix}: ${m.latime}x${m.inaltime}, ${(date.length / 1024).toFixed(0)} KB`);
  }
}
