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
  /**
   * Prețul cerut pe metru pătrat, scris pe disc. E singura cifră care se
   * compară între o tarla de patru hectare și un lot intravilan de șapte sute
   * de metri; prețul total al celor două nu spune nimic pus unul lângă altul.
   */
  pretMp?: number | null;
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

/**
 * Panglicile de stare. Aceleași culori vii ca pe pinurile de preț ale
 * loturilor, ca harta să vorbească o singură limbă la orice scară. Vândutul e
 * un roșu cărămiziu, nu unul aprins: pe vederea de ansamblu, o proprietate
 * marcată cu roșu strident ar striga „asta nu mai poți cumpăra” mai tare decât
 * strigă restul „astea poți”.
 */
export const STARI_PIN: Record<StarePin, ConfigStare> = {
  disponibil: { eticheta: 'Disponibil', culoare: '#17a05a', peCuloare: '#ffffff' },
  oferta: { eticheta: 'Ofertă', culoare: '#eda01b', peCuloare: '#1c1a14' },
  in_curand: { eticheta: 'În curând', culoare: '#2b86ad', peCuloare: '#ffffff' },
  vandut: { eticheta: 'Vândut', culoare: '#a34a3f', peCuloare: '#ffffff' },
};

export const ORDINE_STARI: StarePin[] = ['disponibil', 'oferta', 'in_curand', 'vandut'];

/**
 * Culorile discurilor.
 *
 * Discul poartă identitatea locului, panglica poartă starea: două proprietăți
 * vecine se deosebesc dintr-o privire, iar „disponibil” rămâne citibil pe
 * amândouă.
 *
 * Paleta a fost stinsă la început, ca semnele să nu concureze cu poligoanele
 * loturilor. La scara la care se vede tot portofoliul însă nu se vede niciun
 * poligon, se văd doar semnele, iar zece nuanțe închise una lângă alta arătau
 * ca un șir de pietre. Acum sunt tari, dar toate destul de închise cât scrisul
 * alb de pe ele să rămână lizibil.
 */
const CULORI_DISC = [
  '#1a8f4d', '#cc6612', '#2472c8', '#c22a55', '#6f43c0',
  '#0d8f8f', '#a8761a', '#d1462c', '#4557c4', '#5f9224',
];

/** Aceeași proprietate primește mereu aceeași culoare, fără s-o stocăm. */
export function culoareDisc(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CULORI_DISC[h % CULORI_DISC.length];
}

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

interface OptiuniPin {
  /** A doua linie din disc. Prețul pe metru pătrat, când se știe. */
  subMarca?: string | null;
  /** O a doua linie pe eticheta de sub semn: „3 loturi libere”. */
  subNume?: string | null;
}

/** Construiește marcajul. Aceeași funcție pe harta publică și în panou. */
export function elementPin(p: Pin, optiuni: OptiuniPin = {}): HTMLElement {
  const cfg = STARI_PIN[p.stare] ?? STARI_PIN.disponibil;

  const nod = document.createElement('button');
  nod.type = 'button';
  nod.className = 'pin';
  nod.dataset.pin = p.id;
  nod.dataset.stare = p.stare;
  nod.style.setProperty('--stare', cfg.culoare);
  nod.style.setProperty('--pe-stare', cfg.peCuloare);
  nod.style.setProperty('--disc', culoareDisc(p.id));
  nod.setAttribute(
    'aria-label',
    [p.nume, cfg.eticheta, p.detaliu].filter(Boolean).join(', '),
  );

  const disc = document.createElement('span');
  disc.className = 'pin__disc';
  disc.setAttribute('aria-hidden', 'true');

  const marca = document.createElement('span');
  marca.className = 'pin__marca';
  marca.textContent = p.marca || marcaDinNume(p.nume);
  disc.append(marca);

  // Cifra din disc e ce lipsea: un semn care spune cât costă metrul înainte de
  // click cântărește altfel decât unul care spune doar „SA”.
  if (optiuni.subMarca) {
    const sub = document.createElement('span');
    sub.className = 'pin__sub';
    sub.textContent = optiuni.subMarca;
    disc.append(sub);
    nod.classList.add('pin--cu-cifra');
  }

  const stare = document.createElement('span');
  stare.className = 'pin__stare';
  stare.textContent = cfg.eticheta;
  stare.setAttribute('aria-hidden', 'true');

  const nume = document.createElement('span');
  nume.className = 'pin__nume';
  nume.textContent = p.nume;
  nume.setAttribute('aria-hidden', 'true');
  if (optiuni.subNume) {
    const sub = document.createElement('em');
    sub.textContent = optiuni.subNume;
    nume.append(sub);
  }

  const ac = document.createElement('span');
  ac.className = 'pin__ac';
  ac.setAttribute('aria-hidden', 'true');

  nod.append(disc, stare, nume, ac);
  return nod;
}
