/**
 * Descarcă o vedere aeriană pentru fiecare parcelare, încadrată pe bbox-ul ei.
 * Rulează cu `npm run imagini` (nu face parte din build, ca să nu depindem de
 * rețea la fiecare compilare; fișierele sunt versionate în public/imagini).
 *
 * Sursa e Static Images API de la Mapbox, același furnizor ca fundalul hărții,
 * deci imaginea din pagina lotului și harta arată la fel. Atribuirea se scrie
 * în legenda figurii, pentru că sigla peste o planșă de parcelare ar arăta ca o
 * captură de ecran, nu ca un plan.
 *
 * Serviciul Esri, folosit înainte, refuză încadrările mici pe care le cer acum
 * fâșiile de cinci-șapte loturi.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cadruImagine, LATIME_IMAGINE, INALTIME_IMAGINE } from '../src/lib/imagine.js';

const AICI = dirname(fileURLToPath(import.meta.url));
const RADACINA = join(AICI, '..');
const DEST = join(RADACINA, 'public', 'imagini');

function tokenMapbox() {
  if (process.env.PUBLIC_MAPBOX_TOKEN) return process.env.PUBLIC_MAPBOX_TOKEN;
  try {
    const env = readFileSync(join(RADACINA, '.env'), 'utf8');
    return env.match(/^PUBLIC_MAPBOX_TOKEN=(.+)$/m)?.[1].trim() ?? '';
  } catch {
    return '';
  }
}

const TOKEN = tokenMapbox();
if (!TOKEN) throw new Error('Lipsește PUBLIC_MAPBOX_TOKEN (în .env sau în mediu)');

const proiecte = JSON.parse(readFileSync(join(RADACINA, 'src', 'data', 'proiecte.json'), 'utf8'));

mkdirSync(DEST, { recursive: true });

const forteaza = process.argv.includes('--force');

// Același cadru la două mărimi: una pentru liste, una la 2x pentru vederea
// apropiată de pe pagina lotului, unde imaginea se decupează. Raportul rămâne
// cel din `imagine.js`, altfel conturul desenat peste ea ar cădea alături.
const LATIME = 1200;
const INALTIME = Math.round((LATIME * INALTIME_IMAGINE) / LATIME_IMAGINE);
const MARIMI = [
  { sufix: '', dublu: false },
  { sufix: '-mare', dublu: true },
];

for (const p of proiecte) {
  const [a, b, c, d] = cadruImagine(p.bbox).map((n) => n.toFixed(6));
  for (const m of MARIMI) {
    const fisier = join(DEST, `${p.slug}${m.sufix}.jpg`);
    if (existsSync(fisier) && !forteaza) {
      console.log(`${p.slug}${m.sufix}: există deja, sar peste (--force ca să reia)`);
      continue;
    }
    const url =
      'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/' +
      `%5B${a},${b},${c},${d}%5D/${LATIME}x${INALTIME}${m.dublu ? '@2x' : ''}` +
      `?access_token=${TOKEN}&logo=false&attribution=false`;

    const raspuns = await fetch(url);
    if (!raspuns.ok) {
      throw new Error(`${p.slug}${m.sufix}: ${raspuns.status} ${await raspuns.text()}`);
    }
    const tip = raspuns.headers.get('content-type') ?? '';
    if (!tip.startsWith('image/')) throw new Error(`${p.slug}${m.sufix}: răspuns neașteptat, ${tip}`);

    const date = Buffer.from(await raspuns.arrayBuffer());
    writeFileSync(fisier, date);
    console.log(`${p.slug}${m.sufix}: ${(date.length / 1024).toFixed(0)} KB`);
  }
}
