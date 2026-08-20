/**
 * Pinurile de proprietate.
 *
 * Nu orice teren de vânzare e o parcelare cu sute de loturi. Cele mai multe
 * sunt proprietăți răzlețe pe care vânzătorul vrea doar să le arate pe hartă:
 * unde e, cum se cheamă, dacă mai e liberă. Pentru ele nu are sens un poligon
 * cu cod de lot și preț pe metru pătrat, are sens un semn pe hartă.
 *
 * Marcajul e desenat în DOM, nu ca simbol de hartă, din două motive: îl putem
 * face exact în limbajul panourilor (hârtie, tuș, un accent), și rămâne buton
 * adevărat, deci merge la tastatură și îl citește un cititor de ecran.
 */

export type StarePin = 'disponibil' | 'oferta' | 'in_curand' | 'vandut';

export interface Pin {
  id: string;
  nume: string;
  /** Două-trei litere pe disc. Se deduce din nume, dar se poate scrie de mână. */
  marca: string;
  stare: StarePin;
  /** O linie sub nume: „12 loturi, de la 21.000 €” sau „4.800 m², deschidere 40 m”. */
  detaliu?: string | null;
  /** Unde duce click-ul. Gol înseamnă că pinul doar arată locul. */
  legatura?: string | null;
  lng: number;
  lat: number;
}

export interface ConfigStare {
  eticheta: string;
  culoare: string;
  /** Text peste culoare: pe galben, tușul se citește mai bine decât albul. */
  peCuloare: string;
}

export const STARI_PIN: Record<StarePin, ConfigStare> = {
  disponibil: { eticheta: 'Disponibil', culoare: '#2f8f57', peCuloare: '#ffffff' },
  oferta: { eticheta: 'Ofertă', culoare: '#c08a2a', peCuloare: '#15181a' },
  in_curand: { eticheta: 'În curând', culoare: '#3e6b7a', peCuloare: '#ffffff' },
  vandut: { eticheta: 'Vândut', culoare: '#8a9095', peCuloare: '#ffffff' },
};

export const ORDINE_STARI: StarePin[] = ['disponibil', 'oferta', 'in_curand', 'vandut'];

const DIACRITICE: Record<string, string> = {
  ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't',
  Ă: 'A', Â: 'A', Î: 'I', Ș: 'S', Ş: 'S', Ț: 'T', Ţ: 'T',
};

function faraDiacritice(s: string) {
  return s.replace(/[ăâîșşțţĂÂÎȘŞȚŢ]/g, (c) => DIACRITICE[c] ?? c);
}

/**
 * Marca implicită: inițialele cuvintelor, iar dacă numele e un singur cuvânt,
 * primele două litere. Diacriticele cad, pentru că „SĂ” pe un disc de 44 de
 * pixeli e o pată, nu o literă.
 */
export function marcaDinNume(nume: string): string {
  const cuvinte = faraDiacritice(nume)
    .split(/[\s·,\-–]+/)
    .filter((c) => c.length > 1);
  if (cuvinte.length === 0) return faraDiacritice(nume).slice(0, 2).toUpperCase();
  if (cuvinte.length === 1) return cuvinte[0].slice(0, 2).toUpperCase();
  return cuvinte
    .slice(0, 3)
    .map((c) => c[0])
    .join('')
    .toUpperCase();
}

/** Construiește marcajul. Aceeași funcție pe harta publică și în panou. */
export function elementPin(p: Pin): HTMLElement {
  const cfg = STARI_PIN[p.stare] ?? STARI_PIN.disponibil;

  const nod = document.createElement('button');
  nod.type = 'button';
  nod.className = 'pin';
  nod.dataset.pin = p.id;
  nod.dataset.stare = p.stare;
  nod.style.setProperty('--stare', cfg.culoare);
  nod.style.setProperty('--pe-stare', cfg.peCuloare);
  nod.setAttribute(
    'aria-label',
    [p.nume, cfg.eticheta, p.detaliu].filter(Boolean).join(', '),
  );

  const disc = document.createElement('span');
  disc.className = 'pin__disc';
  disc.textContent = p.marca || marcaDinNume(p.nume);
  disc.setAttribute('aria-hidden', 'true');

  const stare = document.createElement('span');
  stare.className = 'pin__stare';
  stare.textContent = cfg.eticheta;
  stare.setAttribute('aria-hidden', 'true');

  const nume = document.createElement('span');
  nume.className = 'pin__nume';
  nume.textContent = p.nume;
  nume.setAttribute('aria-hidden', 'true');

  const ac = document.createElement('span');
  ac.className = 'pin__ac';
  ac.setAttribute('aria-hidden', 'true');

  nod.append(disc, stare, nume, ac);
  return nod;
}
