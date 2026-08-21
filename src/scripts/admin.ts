import { Map as MapLibre, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cale } from '../lib/cale';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawLineStringMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

import {
  genereazaParcelare,
  proiectieLocala,
  imparteLot,
  unesteLoturi,
  suprafataInel,
  deschidereInel,
  potentialConstruire,
} from '../lib/parcelare.js';
import { STATUSURI, ORDINE_STATUS, euro, mp, ml } from '../lib/loturi';
import type { Proiect, ProprietatiLot, StatusLot } from '../lib/loturi';
import { citeste, scrie, goleste, numaraModificari, type Depozit, type Modificare } from '../lib/depozit';
import { styleBasemap, FONT_HARTA, type ModBasemap } from '../lib/basemap';
import { elementPin, marcaDinNume, ORDINE_STARI, STARI_PIN, type Pin, type StarePin } from '../lib/pin';
import type { Testimonial } from '../lib/testimoniale';

setWorkerUrl(cale('/maplibre/maplibre-gl-worker.mjs'));

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function citesteJSON<T>(id: string): T {
  const nod = document.getElementById(id);
  if (!nod?.textContent) throw new Error(`Lipsește blocul de date #${id}`);
  return JSON.parse(nod.textContent) as T;
}

const proiecte = citesteJSON<Proiect[]>('date-proiecte');
const proiectDupaSlug = new Map(proiecte.map((p) => [p.slug, p]));

type Inel = [number, number][];

/** Valoarea din selector care înseamnă „fă o parcelare nouă”. */
const NOU = '__nou__';

interface LotAdmin {
  id: string;
  cod: string;
  proiect: string;
  status: StatusLot;
  suprafata: number;
  front: number;
  laturi: number;
  pret_mp: number;
  observatii: string | null;
  sir: 0 | 1;
  actualizat: string;
  inel: Inel;
  nou: boolean;
}

type Unealta = 'navigare' | 'lot-nou' | 'imparte' | 'teren' | 'forma' | 'pin';

const gol: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

let harta: MapLibre;
let draw: TerraDraw;
let modBasemap: ModBasemap = 'harta';

let baza: LotAdmin[] = [];
let loturi: LotAdmin[] = [];
/** Parcelările create din panou, peste cele generate la build. */
let proiecteNoi: Proiect[] = [];
let selectie: string[] = [];
let unealta: Unealta = 'navigare';
let idDesenTeren: string | number | null = null;
let idDesenForma: string | number | null = null;
let lotInEditare: string | null = null;

/** Pinurile de proprietate: puse din panou, salvate în depozit. */
let pinuri: Pin[] = [];
/** Lista generată la build, ca să știm dacă panoul a schimbat ceva. */
let bazaPinuri: Pin[] = [];
let pinSelectat: string | null = null;
let contorPin = 0;
const marcherePin = new Map<string, Marker>();
/**
 * Marca urmează numele până când o scrii tu. Altfel un pin botezat mai târziu
 * rămâne cu inițialele implicite de la creare, iar discul spune „P2” pe un
 * teren care se cheamă Livada Periș.
 */
const marcaDeMana = new Set<string>();

/** Testimonialele: aceeași regulă ca la pinuri, lista se publică în bloc. */
let testimoniale: Testimonial[] = [];
let bazaTestimoniale: Testimonial[] = [];
let testimonialSelectat: string | null = null;
let contorTestimonial = 0;

let teren: Inel | null = null;
let obstacole: GeoJSON.Feature[] = [];
let drumuri: GeoJSON.Feature[] = [];

const istoric: string[] = [];
let contorNou = 0;
/**
 * Dublu-click-ul care închide o linie sau un poligon ajunge și la handlerul de
 * click pe loturi și ar schimba selecția imediat după operație. Îl ignorăm
 * pentru câteva sute de milisecunde.
 */
let ignorClickPanaLa = 0;

/* -------------------------------------------------------------------- ajutor */

function numar(id: string, implicit: number) {
  const n = Number(el<HTMLInputElement>(id)?.value);
  return Number.isFinite(n) && n > 0 ? n : implicit;
}

function anunta(text: string, tip: 'info' | 'lucru' | 'eroare' = 'info') {
  const nod = el('mesaj');
  if (!nod) return;
  nod.textContent = text;
  nod.dataset.tip = tip;
}

function lotDupaId(id: string | null) {
  return id ? loturi.find((l) => l.id === id) ?? null : null;
}

function memoreaza() {
  istoric.push(JSON.stringify(loturi));
  if (istoric.length > 40) istoric.shift();
}

function inapoi() {
  const stare = istoric.pop();
  if (!stare) return anunta('Nu mai am ce anula.');
  loturi = JSON.parse(stare) as LotAdmin[];
  selectie = selectie.filter((id) => loturi.some((l) => l.id === id));
  anunta('Am anulat ultima modificare.');
  randeaza();
}

function laLot(f: GeoJSON.Feature<GeoJSON.Polygon, ProprietatiLot>, nou = false): LotAdmin {
  const p = f.properties;
  return {
    id: p.id,
    cod: p.cod,
    proiect: p.proiect,
    status: p.status,
    suprafata: p.suprafata,
    front: p.front,
    laturi: p.laturi ?? f.geometry.coordinates[0].length - 1,
    pret_mp: p.pret_mp,
    observatii: p.observatii ?? null,
    sir: p.sir ?? 0,
    actualizat: p.actualizat,
    inel: f.geometry.coordinates[0] as Inel,
    nou,
  };
}

function caFeature(l: LotAdmin): GeoJSON.Feature<GeoJSON.Polygon, ProprietatiLot> {
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [l.inel] },
    properties: {
      id: l.id,
      cod: l.cod,
      proiect: l.proiect,
      sir: l.sir,
      status: l.status,
      suprafata: l.suprafata,
      front: l.front,
      laturi: l.laturi,
      pret_total: Math.round(l.suprafata * l.pret_mp),
      pret_mp: l.pret_mp,
      tva_inclus: false,
      observatii: l.observatii,
      actualizat: l.actualizat,
    },
  };
}

function recalculeaza(l: LotAdmin) {
  l.suprafata = suprafataInel(l.inel);
  l.front = deschidereInel(l.inel);
  l.laturi = l.inel.length - 1;
}

/* ------------------------------------------------------------------ încărcare */

async function incarca() {
  const r = await fetch(cale('/date/loturi.geojson'));
  const colectie = (await r.json()) as GeoJSON.FeatureCollection<GeoJSON.Polygon, ProprietatiLot>;
  baza = colectie.features.map((f) => laLot(f));

  const d = citeste();

  // Parcelările create într-o sesiune anterioară intră înapoi în listă înainte
  // de loturi, ca loturile lor să aibă unde să se lipească.
  proiecteNoi = d.proiecteNoi.map((p) => ({ ...p }));
  for (const p of proiecteNoi) {
    if (proiectDupaSlug.has(p.slug)) continue;
    proiecte.push(p);
    proiectDupaSlug.set(p.slug, p);
  }
  umpleSelectoare();

  const sterse = new Set(d.sterse);
  loturi = baza
    .filter((l) => !sterse.has(l.id))
    .map((l) => {
      const m = d.modificari[l.id];
      return m ? { ...l, ...m, observatii: m.observatii ?? l.observatii } : { ...l };
    });
  for (const f of d.adaugate) loturi.push(laLot(f, true));
  contorNou = d.adaugate.length;
  const rPinuri = await fetch(cale('/date/pinuri.json'));
  bazaPinuri = rPinuri.ok ? ((await rPinuri.json()) as Pin[]) : [];
  const rTestimoniale = await fetch(cale('/date/testimoniale.json'));
  bazaTestimoniale = rTestimoniale.ok ? ((await rTestimoniale.json()) as Testimonial[]) : [];
  testimoniale = (d.testimoniale ?? bazaTestimoniale).map((t) => ({ ...t }));
  contorTestimonial = testimoniale.length;
  testimonialSelectat = null;
  pinuri = (d.pinuri ?? bazaPinuri).map((x) => ({ ...x }));
  for (const x of pinuri) marcaDeMana.add(x.id);
  contorPin = pinuri.length;
  pinSelectat = null;
  randeaza();
}

/* ------------------------------------------------------------------ publicare */

function calculeazaDepozit(): Omit<Depozit, 'versiune' | 'actualizat'> {
  const dupaId = new Map(loturi.map((l) => [l.id, l]));
  const modificari: Record<string, Modificare> = {};
  const sterse: string[] = [];

  for (const b of baza) {
    const l = dupaId.get(b.id);
    if (!l) {
      sterse.push(b.id);
      continue;
    }
    const m: Modificare = {};
    if (l.status !== b.status) m.status = l.status;
    if (l.pret_mp !== b.pret_mp) m.pret_mp = l.pret_mp;
    if (l.cod !== b.cod) m.cod = l.cod;
    if ((l.observatii ?? null) !== (b.observatii ?? null)) m.observatii = l.observatii;
    if (Object.keys(m).length) modificari[b.id] = m;
  }

  const adaugate = loturi.filter((l) => l.nou).map(caFeature);
  // Parcelările noi se publică doar dacă au rămas cu loturi: una golită între
  // timp nu are ce căuta în portofoliu.
  const proiecteDePublicat = proiecteNoi.filter((p) => loturi.some((l) => l.proiect === p.slug));
  // Dacă lista de pinuri e neatinsă, nu o mai scriem: harta publică folosește
  // atunci direct build-ul, iar depozitul nu poartă o copie inutilă.
  const pinuriDePublicat =
    JSON.stringify(pinuri) === JSON.stringify(bazaPinuri) ? null : pinuri;
  const testimonialeDePublicat =
    JSON.stringify(testimoniale) === JSON.stringify(bazaTestimoniale) ? null : testimoniale;
  return {
    modificari,
    adaugate,
    sterse,
    pinuri: pinuriDePublicat,
    testimoniale: testimonialeDePublicat,
    proiecteNoi: proiecteDePublicat,
  };
}

function publica() {
  const d = scrie(calculeazaDepozit());
  const n = numaraModificari(d);
  anunta(
    n === 0
      ? 'Publicat. Nu erau modificări față de datele generate.'
      : `Publicat: ${n} ${n === 1 ? 'modificare' : 'modificări'}. Deschide harta ca să le vezi.`,
  );
  randeaza();
}

function renunta() {
  goleste();
  anunta('Am șters modificările publicate. Se reîncarcă datele generate.');
  incarca();
}

/* --------------------------------------------------------------------- harta */

const container = el<HTMLDivElement>('harta-admin');
if (!container) throw new Error('Lipsește containerul hărții');

// Parcelarea cu cele mai multe loturi libere: acolo e treabă de făcut.
const primul = proiecte.reduce((a, b) =>
  b.statistici.disponibile > a.statistici.disponibile ? b : a,
);
harta = new MapLibre({
  container,
  style: await styleBasemap(modBasemap),
  center: primul.camera.center,
  // Fâșiile au sub o sută cincizeci de metri; la 15,6 rămâneau o dungă în
  // mijlocul ecranului și nu se putea da click pe un lot.
  zoom: 17.6,
  bearing: primul.camera.bearing,
  pitch: 0,
  attributionControl: { compact: true },
  logo: false,
  // Stilurile Mapbox au proprietăți din specificația lor, nu din a MapLibre.
  validateStyle: false,
  preserveDrawingBuffer: true,
} as ConstructorParameters<typeof MapLibre>[0]);

harta.addControl(new NavigationControl({ visualizePitch: false }), 'bottom-right');

// Doar în dev, ca să pot verifica operațiile din consolă și din teste.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__admin = {
    harta,
    get loturi() { return loturi; },
    get selectie() { return selectie; },
    get teren() { return teren; },
  };
}

draw = new TerraDraw({
  adapter: new TerraDrawMapLibreGLAdapter({ map: harta }),
  modes: [
    new TerraDrawPolygonMode({
      styles: { fillColor: '#2f5d46', fillOpacity: 0.22, outlineColor: '#2f5d46', outlineWidth: 3 },
    }),
    new TerraDrawLineStringMode({ styles: { lineStringColor: '#c08a2a', lineStringWidth: 3 } }),
    new TerraDrawSelectMode({
      flags: {
        polygon: {
          feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
        },
      },
    }),
  ],
});

harta.on('load', () => {
  harta.addSource('obstacole', { type: 'geojson', data: gol });
  harta.addLayer({
    id: 'obstacole-fond',
    type: 'fill',
    source: 'obstacole',
    paint: { 'fill-color': '#b4483a', 'fill-opacity': 0.2 },
  });

  harta.addSource('drumuri-noi', { type: 'geojson', data: gol });
  harta.addLayer({
    id: 'drumuri-noi-fond',
    type: 'fill',
    source: 'drumuri-noi',
    paint: { 'fill-color': '#efe9dc', 'fill-opacity': 0.65 },
  });

  harta.addSource('loturi', { type: 'geojson', data: gol, promoteId: 'id' });
  for (const s of ORDINE_STATUS) {
    harta.addLayer({
      id: `lot-${s}`,
      type: 'fill',
      source: 'loturi',
      filter: ['==', ['get', 'status'], s],
      paint: { 'fill-color': STATUSURI[s].culoare, 'fill-opacity': STATUSURI[s].opacitate },
    });
    harta.addLayer({
      id: `lot-${s}-contur`,
      type: 'line',
      source: 'loturi',
      filter: ['==', ['get', 'status'], s],
      paint: { 'line-color': STATUSURI[s].contur, 'line-width': 1 },
    });
  }
  harta.addLayer({
    id: 'lot-selectat',
    type: 'line',
    source: 'loturi',
    paint: { 'line-color': '#ffffff', 'line-width': 3 },
    filter: ['in', ['get', 'id'], ['literal', []]],
  });
  harta.addLayer({
    id: 'lot-cod',
    type: 'symbol',
    source: 'loturi',
    minzoom: 15.6,
    layout: {
      'text-field': ['get', 'cod'],
      'text-font': FONT_HARTA,
      'text-size': 11,
    },
    paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.7)', 'text-halo-width': 1.2 },
  });

  draw.start();
  // Abia acum se poate seta un mod; înainte de start, Terra Draw aruncă.
  schimbaUnealta('navigare');
  el('admin-incarcare')?.setAttribute('hidden', '');

  harta.on('click', ORDINE_STATUS.map((s) => `lot-${s}`), (e) => {
    const id = e.features?.[0]?.properties?.id as string | undefined;
    if (!id) return;
    // Cu unealta de pin, click-ul pune un semn, nu selectează lotul de dedesubt.
    if (unealta === 'pin' || unealta === 'imparte' || Date.now() < ignorClickPanaLa) return;
    if (selectie.includes(id)) selectie = selectie.filter((x) => x !== id);
    else if (unealta === 'navigare' && (e.originalEvent as MouseEvent).shiftKey) selectie = [...selectie, id];
    else selectie = [id];
    randeaza();
  });

  harta.on('click', (e) => {
    if (unealta !== 'pin' || Date.now() < ignorClickPanaLa) return;
    adaugaPin(e.lngLat.lng, e.lngLat.lat);
  });

  legaFormularPin();
  legaTestimoniale();
  incarca();
});

/* --------------------------------------------------------- testimoniale */

function testimonialDupaId(id: string | null) {
  return id ? (testimoniale.find((t) => t.id === id) ?? null) : null;
}

function adaugaTestimonial() {
  contorTestimonial += 1;
  const t: Testimonial = {
    id: `testimonial-${contorTestimonial}-${testimoniale.length}`,
    nume: '',
    localitate: null,
    proiect: proiecte[0]?.slug ?? null,
    lot: null,
    suprafata: null,
    data: null,
    text: '',
    poza: null,
    legendaPoza: null,
  };
  testimoniale.push(t);
  testimonialSelectat = t.id;
  anunta('Testimonial adăugat. Scrie ce a spus cumpărătorul, apoi publică.');
  randeaza();
  el<HTMLInputElement>('tst-nume')?.focus();
}

function stergeTestimonial() {
  const t = testimonialDupaId(testimonialSelectat);
  if (!t) return;
  testimoniale = testimoniale.filter((x) => x.id !== t.id);
  testimonialSelectat = null;
  anunta('Testimonialul a fost șters.');
  randeaza();
}

/**
 * Poza vine direct din telefonul sau calculatorul clientului, deci poate avea
 * și 8 MB. La demo o ținem în localStorage, care are vreo 5 MB cu totul, așa
 * că o micșorăm înainte: 1400px pe latura mare și JPEG la 72%. La proiectul
 * real fișierul urcă pe server și pasul ăsta rămâne oricum util, ca pagina să
 * nu care fotografii de 8 MB.
 */
function micsoreazaPoza(fisier: File): Promise<string> {
  return new Promise((rezolva, respinge) => {
    const cititor = new FileReader();
    cititor.onerror = () => respinge(new Error('nu am putut citi fișierul'));
    cititor.onload = () => {
      const img = new Image();
      img.onerror = () => respinge(new Error('fișierul nu e o imagine'));
      img.onload = () => {
        const maxim = 1400;
        const scara = Math.min(1, maxim / Math.max(img.width, img.height));
        const panza = document.createElement('canvas');
        panza.width = Math.round(img.width * scara);
        panza.height = Math.round(img.height * scara);
        const ctx = panza.getContext('2d');
        if (!ctx) return respinge(new Error('canvas indisponibil'));
        ctx.drawImage(img, 0, 0, panza.width, panza.height);
        rezolva(panza.toDataURL('image/jpeg', 0.72));
      };
      img.src = cititor.result as string;
    };
    cititor.readAsDataURL(fisier);
  });
}

function randezaTestimoniale() {
  const lista = el('lista-testimoniale');
  if (lista) {
    lista.innerHTML = testimoniale.length
      ? testimoniale
          .map((t) => {
            const nume = t.nume || 'fără nume';
            const unde = [t.lot ? `lotul ${t.lot}` : null, t.poza ? 'cu poză' : 'fără poză']
              .filter(Boolean)
              .join(' · ');
            return `<li><button type="button" data-testimonial="${t.id}" aria-pressed="${t.id === testimonialSelectat}">${nume}<span class="unde">${unde}</span></button></li>`;
          })
          .join('')
      : '<li><p class="ajutor">Niciun testimonial încă.</p></li>';

    for (const b of lista.querySelectorAll<HTMLButtonElement>('[data-testimonial]')) {
      b.addEventListener('click', () => {
        testimonialSelectat = b.dataset.testimonial!;
        randeaza();
      });
    }
  }

  const t = testimonialDupaId(testimonialSelectat);
  const formular = el('formular-testimonial');
  if (formular) formular.hidden = !t;
  const bSterge = el<HTMLButtonElement>('sterge-testimonial');
  if (bSterge) bSterge.disabled = !t;
  if (!t) return;

  const set = (id: string, v: string) => {
    const nod = el<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id);
    if (nod && nod.value !== v) nod.value = v;
  };
  set('tst-nume', t.nume);
  set('tst-localitate', t.localitate ?? '');
  set('tst-proiect', t.proiect ?? '');
  set('tst-lot', t.lot ?? '');
  set('tst-suprafata', t.suprafata ? String(t.suprafata) : '');
  set('tst-data', t.data ?? '');
  set('tst-text', t.text);
  set('tst-legenda', t.legendaPoza ?? '');

  const previzualizare = el('tst-previzualizare');
  const img = el<HTMLImageElement>('tst-previzualizare-img');
  const stare = el('tst-poza-stare');
  if (previzualizare && img) {
    if (t.poza) {
      previzualizare.hidden = false;
      if (img.src !== t.poza) img.src = t.poza;
      if (stare) stare.textContent = t.poza.startsWith('data:') ? 'Poză pusă din panou.' : 'Poză din datele demo-ului.';
    } else {
      previzualizare.hidden = true;
      img.removeAttribute('src');
      if (stare) stare.textContent = 'Nicio poză. Poate rămâne și fără.';
    }
  }
}

function legaTestimoniale() {
  const selectProiect = el<HTMLSelectElement>('tst-proiect');
  if (selectProiect) {
    selectProiect.innerHTML =
      '<option value="">Fără parcelare</option>' +
      proiecte.map((p) => `<option value="${p.slug}">${p.nume}, ${p.localitate}</option>`).join('');
  }

  const laSchimbare = () => {
    const t = testimonialDupaId(testimonialSelectat);
    if (!t) return;
    const val = (id: string) =>
      el<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id)?.value.trim() ?? '';
    t.nume = val('tst-nume');
    t.localitate = val('tst-localitate') || null;
    t.proiect = val('tst-proiect') || null;
    t.lot = val('tst-lot') || null;
    const sup = Number(val('tst-suprafata'));
    t.suprafata = Number.isFinite(sup) && sup > 0 ? Math.round(sup) : null;
    t.data = val('tst-data') || null;
    t.text = val('tst-text');
    t.legendaPoza = val('tst-legenda') || null;
    randeaza();
  };

  for (const id of ['tst-nume', 'tst-localitate', 'tst-proiect', 'tst-lot', 'tst-suprafata', 'tst-data', 'tst-text', 'tst-legenda']) {
    const nod = el<HTMLInputElement>(id);
    nod?.addEventListener('input', laSchimbare);
    nod?.addEventListener('change', laSchimbare);
  }

  el<HTMLButtonElement>('testimonial-nou')?.addEventListener('click', adaugaTestimonial);
  el<HTMLButtonElement>('sterge-testimonial')?.addEventListener('click', stergeTestimonial);

  el<HTMLInputElement>('tst-poza')?.addEventListener('change', async (e) => {
    const camp = e.target as HTMLInputElement;
    const fisier = camp.files?.[0];
    const t = testimonialDupaId(testimonialSelectat);
    if (!fisier || !t) return;
    anunta('Se pregătește poza…', 'lucru');
    try {
      t.poza = await micsoreazaPoza(fisier);
      anunta('Poza a fost pusă. Nu uita legenda.');
    } catch (err) {
      anunta(`Nu am putut folosi poza (${(err as Error).message}).`, 'eroare');
    } finally {
      camp.value = '';
      randeaza();
    }
  });

  el<HTMLButtonElement>('tst-scoate-poza')?.addEventListener('click', () => {
    const t = testimonialDupaId(testimonialSelectat);
    if (!t) return;
    t.poza = null;
    t.legendaPoza = null;
    randeaza();
  });
}

/* --------------------------------------------------------------- pinuri */

function pinDupaId(id: string | null) {
  return id ? (pinuri.find((x) => x.id === id) ?? null) : null;
}

function adaugaPin(lng: number, lat: number) {
  contorPin += 1;
  const pin: Pin = {
    id: `pin-${contorPin}-${Math.round(lng * 1e5)}${Math.round(lat * 1e5)}`,
    nume: `Proprietate ${contorPin}`,
    marca: `P${contorPin}`,
    stare: 'disponibil',
    detaliu: null,
    legatura: null,
    lng,
    lat,
  };
  pinuri.push(pin);
  pinSelectat = pin.id;
  // Un pin nou vrea să fie numit imediat, nu căutat prin panou.
  schimbaUnealta('navigare');
  anunta(`Pin adăugat. Scrie-i numele și starea, apoi publică.`);
  randeaza();
  el<HTMLInputElement>('pin-nume')?.select();
}

function stergePin() {
  const pin = pinDupaId(pinSelectat);
  if (!pin) return;
  pinuri = pinuri.filter((x) => x.id !== pin.id);
  pinSelectat = null;
  anunta(`Pinul „${pin.nume}” a fost șters.`);
  randeaza();
}

/**
 * Aduce marcherele la zi cu lista de pinuri. Le refolosim după id, ca să nu
 * pierdem trasul cu mouse-ul în mijlocul unei mutări.
 */
function randezaPinuri() {
  for (const [id, m] of marcherePin) {
    if (!pinuri.some((x) => x.id === id)) {
      m.remove();
      marcherePin.delete(id);
    }
  }

  for (const pin of pinuri) {
    const vechi = marcherePin.get(pin.id);
    if (vechi) vechi.remove();

    const nod = elementPin(pin);
    nod.classList.toggle('pin--activ', pin.id === pinSelectat);
    nod.addEventListener('click', (ev) => {
      ev.stopPropagation();
      pinSelectat = pin.id;
      selectie = [];
      const grup = el('grup-pin');
      if (grup) grup.hidden = false;
      randeaza();
    });

    const marker = new Marker({ element: nod, anchor: 'bottom', draggable: true })
      .setLngLat([pin.lng, pin.lat])
      .addTo(harta);
    marker.on('dragend', () => {
      const l = marker.getLngLat();
      pin.lng = l.lng;
      pin.lat = l.lat;
      anunta(`„${pin.nume}” mutat.`);
      randeaza();
    });
    marcherePin.set(pin.id, marker);
  }

  const nr = el('nr-pinuri');
  if (nr) nr.textContent = pinuri.length ? `${pinuri.length} pe hartă` : '';

  const pin = pinDupaId(pinSelectat);
  const formular = el('formular-pin');
  const fara = el('fara-pin');
  if (formular && fara) {
    formular.hidden = !pin;
    fara.hidden = Boolean(pin);
  }
  if (!pin) return;

  const set = (id: string, v: string) => {
    const nod = el<HTMLInputElement | HTMLSelectElement>(id);
    if (nod && nod.value !== v) nod.value = v;
  };
  set('pin-nume', pin.nume);
  set('pin-marca', pin.marca);
  set('pin-stare', pin.stare);
  set('pin-detaliu', pin.detaliu ?? '');
  set('pin-legatura', pin.legatura ?? '');
}

function legaFormularPin() {
  const laSchimbare = () => {
    const pin = pinDupaId(pinSelectat);
    if (!pin) return;
    const val = (id: string) => el<HTMLInputElement | HTMLSelectElement>(id)?.value.trim() ?? '';
    const numeNou = val('pin-nume') || pin.nume;
    const marcaScrisa = val('pin-marca');
    pin.nume = numeNou;
    if (!marcaScrisa) marcaDeMana.delete(pin.id);
    pin.marca = (marcaDeMana.has(pin.id) ? marcaScrisa : marcaDinNume(numeNou))
      .slice(0, 3)
      .toUpperCase();
    pin.stare = (val('pin-stare') || 'disponibil') as StarePin;
    pin.detaliu = val('pin-detaliu') || null;
    pin.legatura = val('pin-legatura') || null;
    randeaza();
  };

  const campMarca = el<HTMLInputElement>('pin-marca');
  campMarca?.addEventListener('input', () => {
    if (pinSelectat && campMarca.value.trim()) marcaDeMana.add(pinSelectat);
  });

  for (const id of ['pin-nume', 'pin-marca', 'pin-stare', 'pin-detaliu', 'pin-legatura']) {
    const nod = el<HTMLInputElement>(id);
    nod?.addEventListener('input', laSchimbare);
    nod?.addEventListener('change', laSchimbare);
  }
  el<HTMLButtonElement>('sterge-pin')?.addEventListener('click', stergePin);

  const selectStare = el<HTMLSelectElement>('pin-stare');
  if (selectStare) {
    selectStare.innerHTML = ORDINE_STARI.map(
      (x) => `<option value="${x}">${STARI_PIN[x].eticheta}</option>`,
    ).join('');
  }
}

/* -------------------------------------------------------------------- unelte */

function schimbaUnealta(u: Unealta) {
  // Ieșim curat din editarea de formă înainte de orice altă unealtă.
  if (unealta === 'forma' && u !== 'forma') incheieForma();
  unealta = u;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-unealta]')) {
    b.setAttribute('aria-pressed', String(b.dataset.unealta === u));
  }
  if (u === 'pin') draw.setMode('select');
  else if (u === 'lot-nou' || u === 'teren') draw.setMode('polygon');
  else if (u === 'imparte') draw.setMode('linestring');
  else draw.setMode('select');

  const ajutoare: Record<Unealta, string> = {
    navigare: 'Click pe un lot ca să îl editezi. Shift plus click adaugă la selecție.',
    'lot-nou': 'Desenează conturul unui lot nou. Dublu-click închide poligonul.',
    imparte: 'Trage o linie peste lotul selectat, dintr-o latură în alta.',
    teren: 'Desenează conturul terenului pe care vrei să generezi parcelarea.',
    forma: 'Trage de colțuri ca să schimbi forma lotului. Apasă „Gata" când termini.',
  };
  anunta(ajutoare[u]);
  const grup = el('grup-pin');
  if (grup) grup.hidden = u !== 'pin' && !pinSelectat;
  randeaza();
}

draw.on('finish', (id, context) => {
  if (context.action !== 'draw') return;
  const f = draw.getSnapshotFeature(id);
  if (!f) return;

  if (unealta === 'teren' && f.geometry.type === 'Polygon') {
    if (idDesenTeren !== null && idDesenTeren !== id) draw.removeFeatures([idDesenTeren]);
    idDesenTeren = id;
    teren = f.geometry.coordinates[0] as Inel;
    const camp = el<HTMLInputElement>('camp-azimut');
    if (camp && !camp.dataset.atins) {
      camp.value = String(azimutLaturaLunga(teren));
      actualizeazaAzimut();
    }
    anunta('Teren desenat. Poți încărca obstacolele sau genera direct.');
    randeaza();
    return;
  }

  if (unealta === 'lot-nou' && f.geometry.type === 'Polygon') {
    ignorClickPanaLa = Date.now() + 600;
    adaugaLot(f.geometry.coordinates[0] as Inel);
    draw.removeFeatures([id]);
    return;
  }

  if (unealta === 'imparte' && f.geometry.type === 'LineString') {
    ignorClickPanaLa = Date.now() + 600;
    imparte(f.geometry.coordinates as Inel);
    draw.removeFeatures([id]);
    return;
  }
});

// Editarea formei unui lot: citim înapoi geometria pe măsură ce se trage de colțuri.
draw.on('change', (ids, tip) => {
  if (tip !== 'update') return;
  for (const id of ids) {
    if (id === idDesenTeren) {
      const f = draw.getSnapshotFeature(id);
      if (f?.geometry.type === 'Polygon') teren = f.geometry.coordinates[0] as Inel;
    }
    if (id === idDesenForma && lotInEditare) {
      const f = draw.getSnapshotFeature(id);
      const lot = lotDupaId(lotInEditare);
      if (f?.geometry.type === 'Polygon' && lot) {
        lot.inel = f.geometry.coordinates[0] as Inel;
        recalculeaza(lot);
        randeaza();
      }
    }
  }
});

/* ------------------------------------------------------------ operații loturi */

function idNou() {
  contorNou += 1;
  return `manual-${Date.now().toString(36)}-${contorNou}`;
}

/**
 * Codul următor din parcelare. Loturile generate au numere simple (1, 2, 3),
 * deci un lot desenat de mână trebuie să continue șirul, nu să apară ca „M3”
 * lângă ele. Dacă parcelarea folosește coduri cu literă, se păstrează litera.
 */
function codUrmator(slug: string): string {
  const ale = loturi.filter((l) => l.proiect === slug);
  const prefix = ale.map((l) => l.cod.match(/^([A-Za-zĂÂÎȘȚ]*)/)?.[1] ?? '').find(Boolean) ?? '';
  const maxim = ale.reduce((m, l) => {
    const n = Number(l.cod.replace(/^[^0-9]*/, '').match(/^\d+/)?.[0] ?? 0);
    return n > m ? n : m;
  }, 0);
  return `${prefix}${maxim + 1}`;
}

/** Prețul mediu pe metru pătrat din parcelare, ca punct de pornire. */
function pretMediu(slug: string): number | null {
  const ale = loturi.filter((l) => l.proiect === slug);
  if (!ale.length) return null;
  return Math.round(ale.reduce((s, l) => s + l.pret_mp, 0) / ale.length);
}

/** Punct în poligon, cu regula par-impar. Ne trebuie doar aici. */
function inInel(inel: Inel, [x, y]: [number, number]): boolean {
  let inauntru = false;
  for (let i = 0, j = inel.length - 1; i < inel.length; j = i++) {
    const [xi, yi] = inel[i];
    const [xj, yj] = inel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inauntru = !inauntru;
  }
  return inauntru;
}

/**
 * Parcelarea în care cade lotul desenat.
 *
 * Se caută după geometrie, nu după ce scrie în selectorul de generare: dacă
 * desenezi un lot lângă Săftica, el ține de Săftica, oricare ar fi parcelarea
 * aleasă în panoul de generare automată. Înainte lotul ajungea mereu la prima
 * parcelare din listă, cu codul și prețul ei, la doi kilometri de unde fusese
 * desenat.
 */
function parcelareaDupaLoc(inel: Inel): string | null {
  const c: [number, number] = [
    inel.reduce((a, p) => a + p[0], 0) / inel.length,
    inel.reduce((a, p) => a + p[1], 0) / inel.length,
  ];
  const acasa = proiecte.find((p) => inInel(p.hotar as Inel, c));
  if (acasa) return acasa.slug;

  // Nu cade în niciun hotar: îl dăm celei mai apropiate, dacă e la îndemână.
  let cea: { slug: string; d: number } | null = null;
  for (const p of proiecte) {
    const cx = (p.bbox[0] + p.bbox[2]) / 2;
    const cy = (p.bbox[1] + p.bbox[3]) / 2;
    const d = Math.hypot((cx - c[0]) * Math.cos((c[1] * Math.PI) / 180), cy - c[1]);
    if (!cea || d < cea.d) cea = { slug: p.slug, d };
  }
  // ~0,009 grade înseamnă vreo 900 m: dincolo de atât nu mai e „lângă”.
  return cea && cea.d < 0.009 ? cea.slug : null;
}

function adaugaLot(inel: Inel, sursa?: LotAdmin) {
  memoreaza();
  const proiect =
    sursa?.proiect ??
    parcelareaDupaLoc(inel) ??
    (el<HTMLSelectElement>('camp-proiect')?.value || proiecte[0].slug);
  const lot: LotAdmin = {
    id: idNou(),
    cod: sursa ? `${sursa.cod}-${contorNou}` : codUrmator(proiect),
    proiect,
    status: 'disponibil',
    suprafata: suprafataInel(inel),
    front: deschidereInel(inel),
    laturi: inel.length - 1,
    pret_mp: sursa?.pret_mp ?? pretMediu(proiect) ?? numar('camp-pret', 60),
    observatii: sursa ? 'lot rezultat din împărțire' : 'lot delimitat manual',
    sir: sursa?.sir ?? 0,
    actualizat: new Date().toISOString().slice(0, 10),
    inel,
    nou: true,
  };
  loturi.push(lot);
  selectie = [lot.id];
  anunta(
    `Lot adăugat la ${proiectDupaSlug.get(proiect)?.nume ?? proiect}: ` +
      `${mp(lot.suprafata)}, deschidere ${ml(lot.front)}, codul ${lot.cod}.`,
  );
  randeaza();
  return lot;
}

function imparte(linie: Inel) {
  const lot = lotDupaId(selectie[0]);
  if (!lot) return anunta('Selectează întâi lotul pe care vrei să îl împarți.', 'eroare');
  const parti = imparteLot(lot.inel, linie);
  if (!parti || parti.length < 2) {
    return anunta('Linia nu a tăiat lotul. Trage-o dintr-o latură în cealaltă.', 'eroare');
  }
  memoreaza();
  loturi = loturi.filter((l) => l.id !== lot.id);
  const create = parti.map((inel, i) => {
    const l: LotAdmin = {
      ...lot,
      id: idNou(),
      cod: `${lot.cod}${'ABCDEFGH'[i] ?? i}`,
      inel: inel as Inel,
      nou: true,
      observatii: 'lot rezultat din împărțire',
    };
    recalculeaza(l);
    loturi.push(l);
    return l;
  });
  selectie = create.map((l) => l.id);
  schimbaUnealta('navigare');
  anunta(`Lotul ${lot.cod} a fost împărțit în ${create.length}: ${create.map((l) => mp(l.suprafata)).join(' și ')}.`);
  randeaza();
}

function uneste() {
  if (selectie.length !== 2) return anunta('Selectează exact două loturi alăturate.', 'eroare');
  const [a, b] = selectie.map((id) => lotDupaId(id));
  if (!a || !b) return;
  const inel = unesteLoturi(a.inel, b.inel);
  if (!inel) return anunta('Loturile nu se ating, nu le pot uni.', 'eroare');
  memoreaza();
  loturi = loturi.filter((l) => l.id !== a.id && l.id !== b.id);
  const lot: LotAdmin = {
    ...a,
    id: idNou(),
    cod: `${a.cod}+${b.cod}`,
    inel: inel as Inel,
    nou: true,
    observatii: 'lot rezultat din unirea a două loturi',
  };
  recalculeaza(lot);
  loturi.push(lot);
  selectie = [lot.id];
  anunta(`Loturile ${a.cod} și ${b.cod} au fost unite: ${mp(lot.suprafata)}.`);
  randeaza();
}

function stergeSelectia() {
  if (!selectie.length) return;
  memoreaza();
  const n = selectie.length;
  loturi = loturi.filter((l) => !selectie.includes(l.id));
  selectie = [];
  anunta(`${n} ${n === 1 ? 'lot șters' : 'loturi șterse'}.`);
  randeaza();
}

function incepeForma() {
  const lot = lotDupaId(selectie[0]);
  if (!lot) return anunta('Selectează întâi un lot.', 'eroare');
  memoreaza();
  lotInEditare = lot.id;
  const rezultat = draw.addFeatures([
    {
      id: `forma-${Date.now()}`,
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [lot.inel] },
      properties: { mode: 'polygon' },
    } as never,
  ]);
  const adaugat = draw.getSnapshot().find((f) => f.geometry.type === 'Polygon' && f.id !== idDesenTeren);
  idDesenForma = adaugat?.id ?? null;
  void rezultat;
  schimbaUnealta('forma');
}

function incheieForma() {
  if (idDesenForma !== null) draw.removeFeatures([idDesenForma]);
  idDesenForma = null;
  lotInEditare = null;
}

/* ------------------------------------------------------------------ obstacole */

function bbox(inel: Inel, marja = 0.003) {
  let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
  for (const [lon, lat] of inel) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  return [minLat - marja, minLon - marja, maxLat + marja, maxLon + marja];
}

async function incarcaObstacole() {
  if (!teren) return anunta('Desenează întâi conturul terenului.', 'eroare');
  const buton = el<HTMLButtonElement>('incarca-obstacole');
  if (buton) buton.disabled = true;
  anunta('Se descarcă drumurile și clădirile din zonă…', 'lucru');
  const [s, w, n, e] = bbox(teren);
  const q = `[out:json][timeout:60];(way["highway"](${s},${w},${n},${e});way["building"](${s},${w},${n},${e});way["natural"="water"](${s},${w},${n},${e}););out geom;`;
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: new URLSearchParams({ data: q }),
    });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    obstacole = [];
    for (const elem of d.elements ?? []) {
      const g = elem.geometry;
      if (!g || g.length < 2) continue;
      const t = elem.tags ?? {};
      const coords = g.map((p: { lon: number; lat: number }) => [p.lon, p.lat]);
      const inchis = coords.length > 3 && coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1];
      if (t.highway) {
        obstacole.push({
          type: 'Feature',
          properties: { tip: 'drum', clasa: t.highway },
          geometry: { type: 'LineString', coordinates: coords },
        } as GeoJSON.Feature);
      } else if (inchis) {
        obstacole.push({
          type: 'Feature',
          properties: { tip: t.building ? 'cladire' : 'apa' },
          geometry: { type: 'Polygon', coordinates: [coords] },
        } as GeoJSON.Feature);
      }
    }
    anunta(`${obstacole.length} obstacole încărcate. Vor fi ocolite la generare.`);
  } catch (err) {
    anunta(`Nu am putut încărca obstacolele (${(err as Error).message}). Poți genera oricum.`, 'eroare');
  } finally {
    if (buton) buton.disabled = false;
    randeaza();
  }
}

/* ------------------------------------------------------------------ generarea */

function azimutLaturaLunga(inel: Inel) {
  const pr = proiectieLocala(inel[0]);
  const P = inel.map(pr.laMetri);
  let best = { L: -1, az: 0 };
  for (let i = 0; i < P.length; i += 1) {
    const a = P[i];
    const b = P[(i + 1) % P.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > best.L) best = { L, az: ((Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI + 360) % 180 };
  }
  return Math.round(best.az);
}

function slugRo(nume: string): string {
  const harta: Record<string, string> = {
    ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't',
  };
  const baza = nume
    .toLowerCase()
    .replace(/[ăâîșşțţ]/g, (c) => harta[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  let slug = baza || 'parcelare';
  let n = 2;
  while (proiectDupaSlug.has(slug)) slug = `${baza}-${n++}`;
  return slug;
}

/**
 * Parcelarea nouă, construită din terenul desenat.
 *
 * Regimul de construire, utilitățile și condițiile de plată se copiază de la o
 * parcelare existentă: sunt zeci de câmpuri pe care nimeni nu le completează de
 * la zero într-un panou, și în realitate un dezvoltator lucrează oricum cu
 * aceleași condiții pe toată zona. Ce se scrie de mână e doar ce chiar diferă:
 * numele, localitatea și prețul.
 */
function creeazaParcelare(rezultat: ReturnType<typeof genereazaParcelare>, azimut: number): string | null {
  const nume = (el<HTMLInputElement>('np-nume')?.value ?? '').trim();
  if (!nume) {
    anunta('Scrie numele parcelării noi înainte să generezi.', 'eroare');
    return null;
  }
  const model = proiectDupaSlug.get(el<HTMLSelectElement>('np-model')?.value ?? '') ?? proiecte[0];
  const localitate = (el<HTMLInputElement>('np-localitate')?.value ?? '').trim() || model.localitate;

  const inel = (teren ?? []) as Inel;
  const bbox = inel.reduce(
    (b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)],
    [180, 90, -180, -90],
  ) as [number, number, number, number];

  // Motorul citește `v` ca (-uy, ux) și pune fața lotului la `v` mare, deci
  // strada e acolo; direcția dinspre stradă spre lot e exact opusul.
  const th = (azimut * Math.PI) / 180;
  const azimutNormala =
    ((Math.atan2(Math.cos(th), -Math.sin(th)) * 180) / Math.PI + 360) % 360;

  const azi = new Date().toISOString().slice(0, 10);
  const front = numar('camp-front', 20);
  const adancime = numar('camp-adancime', 38);
  const pret = numar('camp-pret', 60);
  const supr = rezultat.loturi.map((l) => l.suprafata);

  const p: Proiect = {
    slug: slugRo(nume),
    nume,
    localitate,
    judet: model.judet,
    azimut: +azimut.toFixed(1),
    azimutNormala: +azimutNormala.toFixed(1),
    lotTipic: { front, adancime, drumInterior: numar('camp-drum', 0) },
    pretMp: [pret, pret],
    camera: {
      center: [+((bbox[0] + bbox[2]) / 2).toFixed(6), +((bbox[1] + bbox[3]) / 2).toFixed(6)],
      zoom: 17.4,
      bearing: +(((azimutNormala + 540) % 360) - 180).toFixed(1),
      pitch: 46,
    },
    bbox: bbox.map((n) => +n.toFixed(5)) as [number, number, number, number],
    hotar: inel.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]),
    tarlaHa: +(rezultat.statistici.teren_ha ?? 0).toFixed(2),
    distante: model.distante,
    finantare: model.finantare,
    urbanism: model.urbanism,
    utilitati: model.utilitati,
    descriere: [
      `${nume} e o fâșie de ${rezultat.loturi.length} loturi la ${localitate}, ` +
        `cu suprafețe între ${Math.min(...supr)} și ${Math.max(...supr)} de metri pătrați. ` +
        'Textul ăsta se scrie înainte de publicare.',
    ],
    actualizat: azi,
    statistici: {
      total: rezultat.loturi.length,
      disponibile: rezultat.loturi.length,
      rezervate: 0,
      vandute: 0,
      in_pregatire: 0,
      benzi: rezultat.statistici.benzi,
      suprafata_min: Math.min(...supr),
      suprafata_max: Math.max(...supr),
      suprafata_totala_ha: +(supr.reduce((a, b) => a + b, 0) / 1e4).toFixed(1),
      front_min: Math.min(...rezultat.loturi.map((l) => l.front)),
      pret_mp_min: pret,
      pret_mp_max: pret,
      pret_total_min: Math.round(Math.min(...supr) * pret),
    },
  };

  proiecte.push(p);
  proiectDupaSlug.set(p.slug, p);
  proiecteNoi.push(p);
  umpleSelectoare();
  const sel = el<HTMLSelectElement>('camp-proiect');
  if (sel) sel.value = p.slug;
  comutaParcelareNoua();
  return p.slug;
}

function genereaza() {
  if (!teren) return anunta('Desenează întâi conturul terenului.', 'eroare');
  anunta('Se împarte terenul…', 'lucru');
  const front = numar('camp-front', 18);
  const adancime = numar('camp-adancime', 33);
  try {
    const rezultat = genereazaParcelare({
      teren,
      obstacole,
      azimut: numar('camp-azimut', 90),
      front,
      adancime,
      drumInterior: numar('camp-drum', 0),
      drumTransversal: numar('camp-transversal', 0),
      pasTransversal: numar('camp-pas', 0),
      maxBenzi: Math.max(1, Math.round(numar('camp-benzi', 1))),
      retragere: numar('camp-retragere', 2),
      minSuprafata: Math.round(front * adancime * 0.62),
      marjaObstacol: numar('camp-marja', 3),
    });

    memoreaza();
    const prefix = (el<HTMLInputElement>('camp-prefix')?.value || '').toUpperCase();
    const ales = el<HTMLSelectElement>('camp-proiect')?.value || proiecte[0].slug;
    const proiect = ales === NOU ? creeazaParcelare(rezultat, numar('camp-azimut', 90)) : ales;
    if (!proiect) return;
    const pret = numar('camp-pret', 60);
    for (const [i, l] of rezultat.loturi.entries()) {
      contorNou += 1;
      loturi.push({
        id: idNou(),
        cod: `${prefix}${i + 1}`,
        proiect,
        status: 'disponibil',
        suprafata: l.suprafata,
        front: l.front,
        laturi: l.laturi,
        pret_mp: pret,
        observatii: null,
        sir: l.sir as 0 | 1,
        actualizat: new Date().toISOString().slice(0, 10),
        inel: l.inel as Inel,
        nou: true,
      });
    }
    drumuri = rezultat.drumuri.map((d) => ({
      type: 'Feature',
      properties: { banda: d.banda },
      geometry: { type: 'Polygon', coordinates: d.inel },
    })) as GeoJSON.Feature[];

    selectie = [];
    const st = rezultat.statistici;
    anunta(
      `${st.loturi} loturi pe ${st.teren_ha} ha, randament ${st.randament}%. ` +
        `${st.neregulate} urmează hotarul, cu până la ${st.laturi_max} laturi. Nu uita să publici.`,
    );
  } catch (err) {
    anunta(`Împărțirea a eșuat: ${(err as Error).message}`, 'eroare');
  }
  randeaza();
}

/* ---------------------------------------------------------------- randarea UI */

function randeaza() {
  randezaPinuri();
  randezaTestimoniale();
  (harta.getSource('loturi') as GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features: loturi.map(caFeature),
  });
  (harta.getSource('drumuri-noi') as GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features: drumuri,
  });
  (harta.getSource('obstacole') as GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features: obstacole.filter((o) => o.geometry.type === 'Polygon'),
  });
  if (harta.getLayer('lot-selectat')) {
    harta.setFilter('lot-selectat', ['in', ['get', 'id'], ['literal', selectie]]);
  }

  const lot = lotDupaId(selectie[0]);
  const formular = el('formular-lot');
  const fara = el('fara-selectie');
  if (formular && fara) {
    formular.hidden = !lot;
    fara.hidden = Boolean(lot);
  }

  if (lot) {
    const set = (id: string, v: string) => {
      const nod = el<HTMLInputElement | HTMLSelectElement>(id);
      if (nod && nod.value !== v) nod.value = v;
    };
    set('lot-cod', lot.cod);
    set('lot-status', lot.status);
    set('lot-pret', String(lot.pret_mp));
    set('lot-observatii', lot.observatii ?? '');
    const txt = (id: string, v: string) => {
      const nod = el(id);
      if (nod) nod.textContent = v;
    };
    txt('lot-suprafata', mp(lot.suprafata));
    txt('lot-front', ml(lot.front));
    txt('lot-laturi', `${lot.laturi} laturi`);
    txt('lot-total', euro(Math.round(lot.suprafata * lot.pret_mp)));
    const proiect = proiectDupaSlug.get(lot.proiect);
    if (proiect) {
      const c = potentialConstruire(lot.suprafata, proiect.urbanism);
      txt('lot-amprenta', `${c.amprenta} m² la sol`);
      txt('lot-desfasurata', `${c.desfasurata} m² desfășurat`);
    }
  }

  const nrSel = el('nr-selectie');
  if (nrSel) {
    nrSel.textContent = selectie.length > 1 ? `${selectie.length} loturi selectate` : '';
  }
  for (const [id, activ] of [
    ['uneste', selectie.length === 2],
    ['sterge-lot', selectie.length > 0],
    ['modifica-forma', selectie.length === 1],
    ['genereaza', Boolean(teren)],
    ['incarca-obstacole', Boolean(teren)],
    ['inapoi', istoric.length > 0],
  ] as const) {
    const b = el<HTMLButtonElement>(id);
    if (b) b.disabled = !activ;
  }

  const d = calculeazaDepozit();
  // „Nepublicat” înseamnă „diferă de ce e salvat”, nu „diferă de datele
  // generate”. Înainte se compara cu datele generate, deci butonul rămânea
  // aprins și după publicare, iar pinurile nu-l aprindeau deloc.
  const salvat = citeste();
  const amprenta = (x: Omit<Depozit, 'versiune' | 'actualizat'>) =>
    JSON.stringify([x.modificari, x.adaugate, x.sterse, x.pinuri, x.testimoniale]);
  const nepublicat = amprenta(d) !== amprenta(salvat);
  const bPublica = el<HTMLButtonElement>('publica');
  if (bPublica) bPublica.disabled = !nepublicat;

  const contor = el('contor');
  if (contor) {
    const disponibile = loturi.filter((l) => l.status === 'disponibil').length;
    const valoare = loturi.reduce((s, l) => s + l.suprafata * l.pret_mp, 0);
    contor.textContent = `${loturi.length} loturi · ${disponibile} disponibile · ${euro(valoare)}`;
  }
  const stareDepozit = el('stare-depozit');
  if (stareDepozit) {
    const bazaDupaId = new Map(bazaPinuri.map((x) => [x.id, JSON.stringify(x)]));
    const pinuriSchimbate =
      pinuri.filter((x) => bazaDupaId.get(x.id) !== JSON.stringify(x)).length +
      bazaPinuri.filter((b) => !pinuri.some((x) => x.id === b.id)).length;
    const bazaTst = new Map(bazaTestimoniale.map((t) => [t.id, JSON.stringify(t)]));
    const testimonialeSchimbate =
      testimoniale.filter((t) => bazaTst.get(t.id) !== JSON.stringify(t)).length +
      bazaTestimoniale.filter((b) => !testimoniale.some((t) => t.id === b.id)).length;
    const n =
      Object.keys(d.modificari).length +
      d.adaugate.length +
      d.sterse.length +
      pinuriSchimbate +
      testimonialeSchimbate;
    if (nepublicat) {
      stareDepozit.textContent = `${n} ${n === 1 ? 'modificare nepublicată' : 'modificări nepublicate'}`;
    } else if (n === 0) {
      stareDepozit.textContent = 'Nimic de publicat';
    } else {
      stareDepozit.textContent = `${n} ${n === 1 ? 'modificare publicată' : 'modificări publicate'}`;
    }
    stareDepozit.dataset.activ = String(nepublicat);
  }
}

function actualizeazaAzimut() {
  const v = el<HTMLInputElement>('camp-azimut')?.value ?? '90';
  const nod = el('valoare-azimut');
  if (nod) nod.textContent = `${v}°`;
}

/* ----------------------------------------------------------------- comenzile */

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-unealta]')) {
  b.addEventListener('click', () => schimbaUnealta(b.dataset.unealta as Unealta));
}

el<HTMLButtonElement>('gata-forma')?.addEventListener('click', () => schimbaUnealta('navigare'));
el<HTMLButtonElement>('modifica-forma')?.addEventListener('click', incepeForma);
el<HTMLButtonElement>('uneste')?.addEventListener('click', uneste);
el<HTMLButtonElement>('sterge-lot')?.addEventListener('click', stergeSelectia);
el<HTMLButtonElement>('inapoi')?.addEventListener('click', inapoi);
el<HTMLButtonElement>('incarca-obstacole')?.addEventListener('click', incarcaObstacole);
el<HTMLButtonElement>('genereaza')?.addEventListener('click', genereaza);
el<HTMLButtonElement>('publica')?.addEventListener('click', publica);
el<HTMLButtonElement>('renunta')?.addEventListener('click', renunta);

el<HTMLInputElement>('camp-azimut')?.addEventListener('input', (e) => {
  (e.target as HTMLInputElement).dataset.atins = 'da';
  actualizeazaAzimut();
});

el<HTMLButtonElement>('aliniaza')?.addEventListener('click', () => {
  if (!teren) return anunta('Desenează întâi terenul.', 'eroare');
  const camp = el<HTMLInputElement>('camp-azimut');
  if (camp) {
    camp.value = String(azimutLaturaLunga(teren));
    delete camp.dataset.atins;
    actualizeazaAzimut();
  }
});

for (const [id, aplica] of [
  ['lot-cod', (l: LotAdmin, v: string) => { l.cod = v.toUpperCase(); }],
  ['lot-status', (l: LotAdmin, v: string) => { l.status = v as StatusLot; }],
  ['lot-pret', (l: LotAdmin, v: string) => { l.pret_mp = Number(v) || 0; }],
  ['lot-observatii', (l: LotAdmin, v: string) => { l.observatii = v.trim() || null; }],
] as const) {
  const nod = el<HTMLInputElement>(id);
  const laSchimbare = (e: Event) => {
    const lot = lotDupaId(selectie[0]);
    if (!lot) return;
    aplica(lot, (e.target as HTMLInputElement).value);
    randeaza();
  };
  nod?.addEventListener('input', laSchimbare);
  nod?.addEventListener('change', laSchimbare);
}

el<HTMLButtonElement>('descarca')?.addEventListener('click', () => {
  const pachet = {
    type: 'FeatureCollection',
    features: [
      ...(teren ? [{ type: 'Feature', properties: { tip: 'teren' }, geometry: { type: 'Polygon', coordinates: [teren] } }] : []),
      ...drumuri.map((d) => ({ ...d, properties: { ...d.properties, tip: 'drum' } })),
      ...loturi.map((l) => {
        const f = caFeature(l);
        return { ...f, properties: { ...f.properties, tip: 'lot' } };
      }),
    ],
  };
  const blob = new Blob([JSON.stringify(pachet, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'parcelare.geojson';
  a.click();
  URL.revokeObjectURL(url);
});

el<HTMLSelectElement>('sari-la')?.addEventListener('change', (e) => {
  const p = proiectDupaSlug.get((e.target as HTMLSelectElement).value);
  if (!p) return;
  harta.flyTo({ center: p.camera.center, zoom: 17.6, bearing: p.camera.bearing, pitch: 0, duration: 900 });
});

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-basemap]')) {
  b.addEventListener('click', () => {
    const mod = b.dataset.basemap as ModBasemap;
    if (mod === modBasemap) return;
    modBasemap = mod;
    void styleBasemap(mod).then((stil) => harta.setStyle(stil));
    harta.once('styledata', () => {
      // Straturile proprii se pierd la schimbarea stilului; le punem la loc.
      window.location.reload();
    });
    for (const alt of document.querySelectorAll<HTMLButtonElement>('[data-basemap]')) {
      alt.setAttribute('aria-pressed', String(alt.dataset.basemap === mod));
    }
  });
}

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    inapoi();
  }
  if (e.key === 'Escape') {
    selectie = [];
    schimbaUnealta('navigare');
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const tinta = e.target as HTMLElement;
    if (tinta.tagName === 'INPUT' || tinta.tagName === 'TEXTAREA' || tinta.tagName === 'SELECT') return;
    e.preventDefault();
    stergeSelectia();
  }
});

const selectStatus = el<HTMLSelectElement>('lot-status');
if (selectStatus) {
  selectStatus.innerHTML = ORDINE_STATUS.map(
    (s) => `<option value="${s}">${STATUSURI[s].eticheta}</option>`,
  ).join('');
}
/**
 * Toate selectoarele de parcelare, umplute dintr-o singură sursă. Se apelează
 * din nou după ce panoul creează o parcelare, ca ea să apară imediat peste tot.
 */
function umpleSelectoare() {
  const optiuni = proiecte
    .map((p) => `<option value="${p.slug}">${p.nume}, ${p.localitate}</option>`)
    .join('');

  const pastreaza = (nod: HTMLSelectElement | null, html: string) => {
    if (!nod) return;
    const inainte = nod.value;
    nod.innerHTML = html;
    if ([...nod.options].some((o) => o.value === inainte)) nod.value = inainte;
  };

  pastreaza(
    el<HTMLSelectElement>('camp-proiect'),
    `${optiuni}<option value="${NOU}">＋ Parcelare nouă…</option>`,
  );
  pastreaza(el<HTMLSelectElement>('np-model'), optiuni);
  pastreaza(el<HTMLSelectElement>('sari-la'), `<option value="">Sari la parcelare…</option>${optiuni}`);
  pastreaza(
    el<HTMLSelectElement>('tst-proiect'),
    `<option value="">Fără parcelare</option>${optiuni}`,
  );
}

/** Câmpurile parcelării noi apar doar când e aleasă în selector. */
function comutaParcelareNoua() {
  const grup = el('grup-parcelare-noua');
  const sel = el<HTMLSelectElement>('camp-proiect');
  if (grup) grup.hidden = sel?.value !== NOU;
}

umpleSelectoare();
el<HTMLSelectElement>('camp-proiect')?.addEventListener('change', comutaParcelareNoua);
comutaParcelareNoua();

actualizeazaAzimut();
