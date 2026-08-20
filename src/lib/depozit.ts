/**
 * Depozitul de modificări. Panoul de administrare scrie aici, harta publică și
 * paginile de lot citesc de aici și suprascriu datele generate la build.
 *
 * La demo persistența e în browser, deci „publicat" înseamnă „vizibil pe acest
 * calculator". E suficient ca să arăți clientului fluxul complet: schimbi
 * starea unui lot în panou, mergi pe hartă și e schimbată. La proiectul real,
 * singurul lucru care se schimbă e implementarea funcțiilor `citeste` și
 * `scrie`: în loc de localStorage, un API.
 */
import type { ProprietatiLot, StatusLot } from './loturi';
import type { Pin } from './pin';

export const CHEIE = 'vatra-nord/parcelare/v1';

export interface Modificare {
  status?: StatusLot;
  pret_mp?: number;
  cod?: string;
  observatii?: string | null;
}

export interface Depozit {
  versiune: 1;
  actualizat: string | null;
  /** Modificări peste loturile generate, pe id. */
  modificari: Record<string, Modificare>;
  /** Loturi adăugate din panou, în format GeoJSON. */
  adaugate: GeoJSON.Feature<GeoJSON.Polygon, ProprietatiLot>[];
  /** Loturi generate care au fost șterse din panou. */
  sterse: string[];
  /**
   * Lista completă de pinuri, așa cum a publicat-o panoul. `null` înseamnă că
   * nu s-a atins nimeni de ele și rămâne valabilă lista generată la build; o
   * listă goală înseamnă că au fost șterse toate, ceea ce e altceva.
   */
  pinuri: Pin[] | null;
}

const GOL: Depozit = { versiune: 1, actualizat: null, modificari: {}, adaugate: [], sterse: [], pinuri: null };

function areBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function citeste(): Depozit {
  if (!areBrowser()) return { ...GOL, pinuri: null };
  try {
    const brut = window.localStorage.getItem(CHEIE);
    if (!brut) return { ...GOL, pinuri: null };
    const d = JSON.parse(brut) as Depozit;
    if (d.versiune !== 1) return { ...GOL, pinuri: null };
    return {
      versiune: 1,
      actualizat: d.actualizat ?? null,
      modificari: d.modificari ?? {},
      adaugate: d.adaugate ?? [],
      sterse: d.sterse ?? [],
      // Câmp adăugat după prima versiune: un depozit salvat înainte de pinuri
      // trebuie să se citească în continuare, nu să fie aruncat.
      pinuri: d.pinuri ?? null,
    };
  } catch {
    return { ...GOL, pinuri: null };
  }
}

export function scrie(d: Omit<Depozit, 'versiune' | 'actualizat'>): Depozit {
  const complet: Depozit = {
    versiune: 1,
    actualizat: new Date().toISOString(),
    modificari: d.modificari,
    adaugate: d.adaugate,
    sterse: d.sterse,
    pinuri: d.pinuri,
  };
  if (areBrowser()) window.localStorage.setItem(CHEIE, JSON.stringify(complet));
  return complet;
}

export function goleste() {
  if (areBrowser()) window.localStorage.removeItem(CHEIE);
}

export function areModificari(d: Depozit) {
  return numaraModificari(d) > 0;
}

export function numaraModificari(d: Depozit) {
  // Pinurile se publică în bloc, ca listă, deci contează ca o singură
  // modificare: „lista de pinuri a fost rescrisă din panou”.
  return (
    Object.keys(d.modificari).length + d.adaugate.length + d.sterse.length + (d.pinuri ? 1 : 0)
  );
}

/**
 * Suprapune modificările peste colecția generată la build. Recalculează prețul
 * total, ca să nu rămână vechiul preț lângă noul preț pe metru pătrat.
 */
export function aplica<T extends GeoJSON.Feature<GeoJSON.Polygon, ProprietatiLot>>(
  colectie: GeoJSON.FeatureCollection<GeoJSON.Polygon, ProprietatiLot>,
  d: Depozit = citeste(),
): GeoJSON.FeatureCollection<GeoJSON.Polygon, ProprietatiLot> {
  const sterse = new Set(d.sterse);
  const features = colectie.features
    .filter((f) => !sterse.has(f.properties.id))
    .map((f) => {
      const m = d.modificari[f.properties.id];
      if (!m) return f;
      const props: ProprietatiLot = { ...f.properties, ...m };
      if (m.pret_mp !== undefined) props.pret_total = Math.round(props.suprafata * m.pret_mp);
      return { ...f, properties: props } as T;
    });
  return { type: 'FeatureCollection', features: [...features, ...d.adaugate] };
}

/** Modificarea unui singur lot, pentru paginile statice care afișează un lot. */
export function aplicaPeLot(p: ProprietatiLot, d: Depozit = citeste()): ProprietatiLot | null {
  if (d.sterse.includes(p.id)) return null;
  const m = d.modificari[p.id];
  if (!m) return p;
  const nou: ProprietatiLot = { ...p, ...m };
  if (m.pret_mp !== undefined) nou.pret_total = Math.round(nou.suprafata * m.pret_mp);
  return nou;
}
