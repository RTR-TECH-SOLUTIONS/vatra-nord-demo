import { Map as MapLibre, Marker, Popup, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl';
import type { MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cale } from '../lib/cale';

// Workerul e copiat în public/maplibre de scripts/copiaza-worker.mjs. Fără asta
// MapLibre îl caută lângă propriul modul, pe care Vite îl mută, iar sursele
// GeoJSON rămân goale fără nicio eroare în consolă.
setWorkerUrl(cale('/maplibre/maplibre-gl-worker.mjs'));

import { STATUSURI, ORDINE_STATUS, euro, mp, ml, dataRo, cuTva, azimutSpreLot } from '../lib/loturi';
import type { Proiect, ProprietatiLot, StatusLot } from '../lib/loturi';
import { styleBasemap, FONT_HARTA, SURSA_VECTOR, type ModBasemap } from '../lib/basemap';
import { aplica as aplicaModificari, citeste as citesteDepozit, numaraModificari } from '../lib/depozit';
import { edificabilLot, potentialConstruire, silueta } from '../lib/parcelare.js';
import { elementPin, marcaDinNume, STARI_PIN, type Pin } from '../lib/pin';
import { elementPinPret } from '../lib/pinPret';
import { benziBuget, type BandaBuget } from '../lib/buget';
import { planLot } from '../lib/plan';
import { CULORI_PRET } from '../lib/pinPret';
import { FIRMA } from '../lib/firma';

type ColectieLoturi = GeoJSON.FeatureCollection<GeoJSON.Polygon, ProprietatiLot>;

// Fontul vine din basemap, pentru că depinde de cine servește glifele.
const FONT_ETICHETA = FONT_HARTA;

/** Straturile de text ale fundalului, care trebuie ridicate peste loturi. */
const ETICHETE_DEASUPRA = [
  'drum-nume-secundar',
  'drum-nume-principal',
  'apa-nume',
  'loc-nume',
  // echivalentele din stilul MapTiler, dacă e configurată cheia
  'road_label',
  'place_label_town',
  'place_label_village',
];

const SURSA = 'loturi';
const SURSA_POI = 'poi';
const idFill = (s: StatusLot) => `loturi-${s}`;
const idLinie = (s: StatusLot) => `loturi-${s}-contur`;

/**
 * Cât de tare ține fiecare stare, pe fiecare fundal. Nu e o valoare unică
 * pentru că fondul e complet diferit: planșa e hârtie deschisă, satelitul e
 * fotografie închisă și aglomerată. Ce contează în ambele e ierarhia, nu
 * cifra: disponibilul iese în față, vândutul se retrage aproape în fond.
 * Berceni face invers, jumătate de hartă e roșu aprins, adică jumătate de
 * hartă strigă „asta nu mai poți cumpăra”.
 */
const OPACITATE: Record<ModBasemap, Record<StatusLot, number>> = {
  harta: { disponibil: 0.82, rezervat: 0.72, in_pregatire: 0.46, vandut: 0.3 },
  teren: { disponibil: 0.78, rezervat: 0.7, in_pregatire: 0.5, vandut: 0.36 },
};

/**
 * Pragul valului de dezvăluire. Loturile primesc la încărcare o proprietate
 * `ordine` (0 la 1, de-a lungul rândurilor), iar pragul mătură intervalul o
 * dată, la intrarea pe site. Peste 1,15 expresia dă 1 peste tot, adică
 * dezvăluirea e terminată și nu mai costă nimic.
 */
let pragDezvaluire = 1.2;

/** Factorul de dezvăluire pentru un lot: 0 înainte de val, 1 după. */
function factorVal(prag: number): unknown {
  return ['max', 0, ['min', 1, ['/', ['-', prag, ['get', 'ordine']], 0.16]]];
}

function opacitateFill(s: StatusLot, prag: number): unknown {
  const baza = OPACITATE[modBasemap][s];
  return [
    '*',
    ['case', ['boolean', ['feature-state', 'hover'], false], Math.min(baza + 0.2, 0.95), baza],
    factorVal(prag),
  ];
}

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function citesteJSON<T>(id: string): T {
  const nod = document.getElementById(id);
  if (!nod?.textContent) throw new Error(`Lipsește blocul de date #${id}`);
  return JSON.parse(nod.textContent) as T;
}

const proiecte = citesteJSON<Proiect[]>('date-proiecte');
const proiectDupaSlug = new Map(proiecte.map((p) => [p.slug, p]));
/**
 * Parcelările care au venit din build au pagină statică proprie; cele create
 * din panou, nu — se face la publicarea site-ului. Fișa lor ascunde butonul
 * care ar duce în gol.
 */
const arePagina = new Set(proiecte.map((p) => p.slug));

/**
 * Parcelările create din panou intră în listă înainte de orice altceva: din ele
 * ies pinul de pe hartă, rândul din portofoliu și fișa. Fără pasul ăsta, un lot
 * publicat pe o parcelare nouă ar apărea pe hartă fără nimic în jurul lui.
 */
function adaugaProiecteNoi(noi: Proiect[]) {
  const lista = document.querySelector('.portofoliu');
  const randuri = document.querySelectorAll('[data-fel="parcelare"]');
  const dupaCare = randuri.length ? randuri[randuri.length - 1].closest('li') : null;

  for (const p of noi) {
    if (proiectDupaSlug.has(p.slug)) continue;
    proiecte.push(p);
    proiectDupaSlug.set(p.slug, p);
    if (!lista) continue;

    const li = document.createElement('li');
    li.innerHTML = `
      <button type="button" class="rand" data-portofoliu="${p.slug}" data-fel="parcelare" aria-pressed="false">
        <span class="rand__marca" style="--c: ${STARI_PIN.disponibil.culoare}" aria-hidden="true">${marcaDinNume(p.nume)}</span>
        <span class="rand__text">
          <span class="rand__nume">${p.nume}</span>
          <span class="rand__sub">${p.localitate} · parcelare nouă</span>
        </span>
        <span class="rand__nr cifre">${p.statistici.disponibile}</span>
      </button>`;
    if (dupaCare) dupaCare.after(li);
    else lista.append(li);
  }

  const contor = document.querySelector('.camp--portofoliu .camp__nr');
  if (contor) {
    contor.textContent = String(document.querySelectorAll('[data-portofoliu]').length - 1);
  }
}

interface Filtre {
  proiect: string;
  statusuri: Set<StatusLot>;
  supMin: number;
  supMax: number;
  pretMin: number;
  pretMax: number;
}

let loturi: ColectieLoturi;
let harta: MapLibre;
let popup: Popup | null = null;
// Implicit pornim pe hartă, nu pe satelit: la scara la care se vede tot
// portofoliul, harta se citește, iar satelitul e pastă verde.
let modBasemap: ModBasemap = 'harta';
let lotSelectat: string | null = null;
let poiVizibil = false;
let straturiPuse = false;
/** Vederea de la nivelul solului, pornită de pe un lot. */
let modStrada: string | null = null;
let parcelareaDinStrada: string | null = null;
let secventa = 0;

const filtre: Filtre = {
  proiect: 'toate',
  statusuri: new Set(ORDINE_STATUS),
  supMin: 0,
  supMax: Infinity,
  pretMin: 0,
  pretMax: Infinity,
};

/* ------------------------------------------------------------------ filtre */

function expresieFiltru(status: StatusLot): unknown[] {
  const conditii: unknown[] = [
    'all',
    ['==', ['get', 'status'], status],
    ['>=', ['get', 'suprafata'], filtre.supMin],
    ['<=', ['get', 'suprafata'], filtre.supMax === Infinity ? 1e9 : filtre.supMax],
    ['>=', ['get', 'pret_total'], filtre.pretMin],
    ['<=', ['get', 'pret_total'], filtre.pretMax === Infinity ? 1e12 : filtre.pretMax],
  ];
  if (filtre.proiect !== 'toate') conditii.push(['==', ['get', 'proiect'], filtre.proiect]);
  return conditii;
}

function treceFiltrele(p: ProprietatiLot): boolean {
  if (!filtre.statusuri.has(p.status)) return false;
  if (filtre.proiect !== 'toate' && p.proiect !== filtre.proiect) return false;
  if (p.suprafata < filtre.supMin || p.suprafata > filtre.supMax) return false;
  if (p.pret_total < filtre.pretMin || p.pret_total > filtre.pretMax) return false;
  return true;
}

function aplicaFiltre() {
  if (!straturiPuse) return;

  actualizeazaPinuri();

  for (const s of ORDINE_STATUS) {
    const vizibil = filtre.statusuri.has(s);
    for (const id of [idFill(s), idLinie(s)]) {
      if (!harta.getLayer(id)) continue;
      harta.setFilter(id, expresieFiltru(s) as never);
      harta.setLayoutProperty(id, 'visibility', vizibil ? 'visible' : 'none');
    }
  }

  actualizeazaContoare();
}

/* ---------------------------------------------------------------- contoare */

function actualizeazaContoare() {
  const inProiect = loturi.features.filter(
    (f) => filtre.proiect === 'toate' || f.properties.proiect === filtre.proiect,
  );
  const potrivite = inProiect.filter((f) => treceFiltrele(f.properties));

  // Capul de panou e răspunsul viu la filtrele tocmai puse: câte loturi rămân,
  // câte dintre ele se pot cumpăra azi și de la ce preț pornesc.
  const disponibile = potrivite.filter((f) => f.properties.status === 'disponibil');
  const nr = el('nr-gasite');
  const eticheta = el('eticheta-gasite');
  const subDisp = el('sub-disponibile');
  const subPret = el('sub-pret');
  const antet = document.querySelector<HTMLElement>('.sertar__antet');

  if (nr) nr.textContent = String(potrivite.length);
  if (eticheta) {
    eticheta.textContent =
      potrivite.length === 0
        ? 'loturi se potrivesc'
        : potrivite.length === 1
          ? 'lot pe hartă'
          : 'loturi pe hartă';
  }
  if (subDisp) {
    subDisp.textContent =
      disponibile.length === 1 ? '1 disponibil' : `${disponibile.length} disponibile`;
  }
  if (subPret) {
    // „De la X €” se scrie doar peste loturi care chiar se pot cumpăra. Un preț
    // de pornire calculat din loturi vândute sau rezervate ar fi o cifră
    // adevărată pusă acolo ca să inducă în eroare.
    subPret.textContent = disponibile.length
      ? `de la ${euro(Math.min(...disponibile.map((f) => f.properties.pret_total)))} + TVA`
      : potrivite.length
        ? 'niciun lot liber în filtrul curent'
        : 'schimbă filtrele ca să vezi prețuri';
  }
  if (antet) antet.dataset.gol = potrivite.length === 0 ? 'da' : 'nu';

  for (const s of ORDINE_STATUS) {
    const nod = el(`nr-${s}`);
    if (!nod) continue;
    nod.textContent = String(
      inProiect.filter((f) => {
        const p = f.properties;
        if (p.status !== s) return false;
        if (p.suprafata < filtre.supMin || p.suprafata > filtre.supMax) return false;
        if (p.pret_total < filtre.pretMin || p.pret_total > filtre.pretMax) return false;
        return true;
      }).length,
    );
  }

  // Câte loturi are fiecare bandă de buget, cu celelalte filtre puse. Panoul
  // de referință n-are cifra asta, și fără ea omul bifează pe rând ca să vadă
  // unde e stoc.
  const fara = inProiect.filter((f) => {
    const p = f.properties;
    if (!filtre.statusuri.has(p.status)) return false;
    return p.suprafata >= filtre.supMin && p.suprafata <= filtre.supMax;
  });
  const scrie = (id: string, n: number) => {
    const nod = document.querySelector<HTMLElement>(`[data-nr-buget="${id}"]`);
    if (nod) nod.textContent = String(n);
    const rand = nod?.closest('li');
    if (rand) rand.dataset.gol = n === 0 ? 'da' : 'nu';
  };
  scrie('toate', fara.length);
  for (const b of benziCurente) {
    scrie(b.id, fara.filter((f) => f.properties.pret_total >= b.min && f.properties.pret_total < b.max).length);
  }
}

/* ----------------------------------------------------------------- straturi */

function adaugaStraturi() {
  if (harta.getSource(SURSA)) return;

  // Pe hârtie scrisul e tuș cu halo deschis, pe fotografie e alb cu halo
  // închis. Aceleași straturi, două regimuri de lizibilitate.
  const pePlansa = modBasemap === 'harta';

  /*
    Stilurile Mapbox își au etichetele în straturi proprii, iar dacă punem
    loturile peste ele, denumirile de străzi dispar exact acolo unde contează.
    Le inserăm sub primul strat de simboluri, ca scrisul să rămână deasupra.
    Fără stil Mapbox (fallback pe planșa noastră), `sub` rămâne gol și
    straturile se adaugă la vârf, ca înainte.
  */
  const primulSimbol = harta.getStyle().layers?.find((l) => l.type === 'symbol')?.id;
  const sub = (strat: Parameters<typeof harta.addLayer>[0]) =>
    primulSimbol ? harta.addLayer(strat, primulSimbol) : harta.addLayer(strat);
  const textPeste = pePlansa ? '#2b3134' : '#ffffff';
  const haloPeste = pePlansa ? 'rgba(247,244,238,0.88)' : 'rgba(0,0,0,0.7)';
  const conturPeste = pePlansa ? '#15181a' : '#ffffff';

  // Conturul tarlalei, sub loturi. E limbajul planului de situație: întâi se
  // desenează hotarul terenului, apoi împărțirea din el. În câmpul Ilfovului
  // OpenStreetMap nu are aproape nicio suprafață de teren, deci fără hotar
  // planșa ar fi hârtie goală cu o grilă plutind pe ea.
  harta.addSource('hotare', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: proiecte.map((p) => ({
        type: 'Feature' as const,
        properties: { slug: p.slug, nume: p.nume },
        geometry: { type: 'Polygon' as const, coordinates: [[...p.hotar, p.hotar[0]]] },
      })),
    },
  });
  sub({
    id: 'hotar-fond',
    type: 'fill',
    source: 'hotare',
    minzoom: 11.5,
    paint: {
      'fill-color': pePlansa ? '#e3dac8' : '#f4f1ea',
      'fill-opacity': pePlansa ? 0.9 : 0.12,
    },
  });
  sub({
    id: 'hotar-linie',
    type: 'line',
    source: 'hotare',
    minzoom: 11.5,
    layout: { 'line-join': 'round' as const },
    paint: {
      'line-color': pePlansa ? '#8a8069' : 'rgba(255,255,255,0.7)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 16, 1.6, 18, 2.4],
      'line-dasharray': [6, 3],
    },
  });

  harta.addSource(SURSA, { type: 'geojson', data: loturi, promoteId: 'id' });

  for (const s of ORDINE_STATUS) {
    const cfg = STATUSURI[s];
    // Conturul urmează ierarhia umpluturii: lotul de vânzare are muchie
    // fermă, cel vândut abia o schiță, ca grila să nu devină un gard uniform.
    const spor = cfg.vandabil ? 0.35 : 0;
    sub({
      id: idFill(s),
      type: 'fill',
      source: SURSA,
      paint: { 'fill-color': cfg.culoare, 'fill-opacity': opacitateFill(s, pragDezvaluire) as never },
      filter: expresieFiltru(s) as never,
    });
    sub({
      id: idLinie(s),
      type: 'line',
      source: SURSA,
      paint: {
        'line-color': cfg.contur,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          13, 0.4 + spor * 0.4,
          16, 1.1 + spor,
          18, 1.8 + spor * 1.6,
        ],
        'line-opacity': ['*', cfg.vandabil ? 0.95 : 0.6, factorVal(pragDezvaluire)] as never,
      },
      filter: expresieFiltru(s) as never,
    });
  }

  // Codul lotului nu mai are strat propriu: îl poartă pinul de preț, care
  // apare de la același zoom și spune și cât costă. Două scrisuri peste
  // același dreptunghi de teren însemnau două etichete care se ceartă.

  // Drumurile parcelării, generate de motor odată cu loturile. Le desenăm ca
  // suprafață, nu ca simplu gol între rânduri: se vede că e o stradă.
  harta.addSource('drumuri-parcelare', { type: 'geojson', data: cale('/date/drumuri.geojson') });
  sub({
    id: 'drumuri-parcelare-fond',
    type: 'fill',
    source: 'drumuri-parcelare',
    paint: {
      // Pe planșă drumul interior e miez de hârtie, ca restul rețelei; peste
      // fotografie e un praf deschis, cât să se citească traseul.
      'fill-color': pePlansa ? '#fcfbf8' : '#efe9dc',
      'fill-opacity': pePlansa ? 0.95 : 0.5,
    },
  });
  sub({
    id: 'drumuri-parcelare-contur',
    type: 'line',
    source: 'drumuri-parcelare',
    paint: {
      'line-color': pePlansa ? '#d3cabb' : '#cfc6b4',
      'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.3, 18, 1.2],
    },
  });

  // Casele din sat, ridicate în 3D. De la nivelul solului o imagine satelitară
  // plată nu spune nimic; clădirile dau adâncime și reper. Doar pe satelit:
  // pe planșă casele sunt desenate în plan, ca pe orice plan de situație, iar
  // niște volume gri peste hârtie ar strica exact ce face stilul special.
  if (modBasemap === 'teren' && harta.getSource(SURSA_VECTOR)) {
    harta.addLayer({
      id: 'cladiri-3d',
      type: 'fill-extrusion',
      source: SURSA_VECTOR,
      'source-layer': 'building',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#d9d2c6',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.82,
      },
    });
  }

  // Ce se poate construi pe lotul deschis: conturul edificabil și volumul
  // casei maxime, la înălțimea reală de cornișă. Se văd doar la nivelul solului.
  const golFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  harta.addSource('construibil', { type: 'geojson', data: golFC });
  harta.addLayer({
    id: 'edificabil-contur',
    type: 'line',
    source: 'construibil',
    filter: ['==', ['get', 'tip'], 'edificabil'],
    layout: { visibility: 'none' },
    paint: { 'line-color': conturPeste, 'line-width': 1.6, 'line-dasharray': [3, 2], 'line-opacity': 0.85 },
  });
  harta.addLayer({
    id: 'casa-volum',
    type: 'fill-extrusion',
    source: 'construibil',
    filter: ['==', ['get', 'tip'], 'casa'],
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': '#f4f1ea',
      'fill-extrusion-height': ['get', 'inaltime'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.5,
    },
  });

  // Lotul deschis, ridicat ca un volum jos, ca să se vadă și de la nivelul
  // solului, unde un poligon plat dispare complet.
  harta.addLayer({
    id: 'lot-selectat-volum',
    type: 'fill-extrusion',
    source: SURSA,
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': [
        'match', ['get', 'status'],
        ...ORDINE_STATUS.flatMap((st) => [st, STATUSURI[st].culoare]),
        '#2f8f57',
      ],
      'fill-extrusion-height': 1.6,
      'fill-extrusion-opacity': 0.55,
    },
    filter: ['==', ['get', 'id'], '__niciunul__'] as never,
  });

  // Conturul lotului deschis, deasupra tuturor.
  harta.addLayer({
    id: 'lot-selectat',
    type: 'line',
    source: SURSA,
    paint: { 'line-color': conturPeste, 'line-width': 2.5 },
    filter: ['==', ['get', 'id'], '__niciunul__'] as never,
  });

  harta.addSource(SURSA_POI, { type: 'geojson', data: cale('/date/poi.geojson') });
  harta.addLayer({
    id: 'poi-punct',
    type: 'circle',
    source: SURSA_POI,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': 5,
      'circle-color': pePlansa ? '#fbfaf7' : '#fbfaf7',
      'circle-stroke-color': '#15181a',
      'circle-stroke-width': 1.5,
    },
  });
  harta.addLayer({
    id: 'poi-eticheta',
    type: 'symbol',
    source: SURSA_POI,
    layout: {
      visibility: 'none',
      'text-field': ['get', 'nume'],
      'text-font': FONT_ETICHETA,
      'text-size': 12,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-max-width': 9,
    },
    paint: {
      'text-color': textPeste,
      'text-halo-color': haloPeste,
      'text-halo-width': 1.4,
    },
  });

  // Denumirile de străzi și de localități trec deasupra loturilor. Altfel
  // rămân sub poligoane și tocmai peste parcelare, unde contează cel mai mult,
  // nu se mai văd deloc.
  for (const id of ETICHETE_DEASUPRA) {
    if (harta.getLayer(id)) harta.moveLayer(id);
  }

  straturiPuse = true;
  aplicaFiltre();
  legaInteractiuni();
}

/* ------------------------------------------------------------- interacțiune */

let idHover: string | null = null;

function seteazaHover(id: string | null) {
  if (idHover === id) return;
  if (idHover) harta.setFeatureState({ source: SURSA, id: idHover }, { hover: false });
  idHover = id;
  if (idHover) harta.setFeatureState({ source: SURSA, id: idHover }, { hover: true });
}

function legaInteractiuni() {
  const straturi = ORDINE_STATUS.map(idFill);

  harta.on('mousemove', straturi, (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const f = e.features?.[0];
    if (!f) return;
    harta.getCanvas().style.cursor = 'pointer';
    seteazaHover(String(f.properties.id));
    aratTooltip(e, f.properties as unknown as ProprietatiLot);
  });

  harta.on('mouseleave', straturi, () => {
    harta.getCanvas().style.cursor = '';
    seteazaHover(null);
    ascundeTooltip();
  });

  // Handlerul de strat rulează primul și marchează click-ul ca rezolvat.
  // Handlerul general nu are voie să reinterogheze harta: deschiderea lotului
  // mută deja camera, iar a doua interogare ar cădea în gol și ar închide
  // imediat ce tocmai s-a deschis.
  let clickPeLot = false;

  harta.on('click', straturi, (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const f = e.features?.[0];
    if (!f) return;
    clickPeLot = true;
    deschideLot(f.properties as unknown as ProprietatiLot, [e.lngLat.lng, e.lngLat.lat]);
  });

  harta.on('click', () => {
    if (clickPeLot) {
      clickPeLot = false;
      return;
    }
    inchideLot();
  });
}

/* -------------------------------------------------------------- tooltip mic */

const tooltip = el<HTMLDivElement>('tooltip-lot');

function aratTooltip(e: MapMouseEvent, p: ProprietatiLot) {
  if (!tooltip || window.matchMedia('(hover: none)').matches) return;
  tooltip.innerHTML =
    `<strong>${p.cod}</strong> · ${mp(p.suprafata)}` +
    `<span>${STATUSURI[p.status].eticheta}</span>`;
  tooltip.hidden = false;
  tooltip.style.transform = `translate(${e.point.x + 14}px, ${e.point.y + 14}px)`;
}

function ascundeTooltip() {
  if (tooltip) tooltip.hidden = true;
}

/* ------------------------------------------------------------ fișa lotului */

/**
 * Fișa unui lot, deschisă din pin sau din poligon.
 *
 * Referința din piață pune aici o bandă colorată de stare, prețul, un desen
 * generic al lotului, patru casete de date și patru butoane. Structura e bună,
 * așa că o păstrăm; ce schimbăm e conținutul fiecărei părți:
 *
 *  - banda are exact culoarea pinului pe care tocmai s-a dat click, ca omul să
 *    vadă că s-a deschis ce a atins;
 *  - prețul e scris și cu TVA, pentru că ăsta e banul care pleacă din cont;
 *  - desenul e conturul real al lotului, cu retragerile și casa maximă, nu un
 *    dreptunghi identic pentru toate loturile;
 *  - casetele nu spun „strada / actele”, spun cifra: câte utilități ajung
 *    chiar la lot și cât se poate construi.
 */
function fisaLot(p: ProprietatiLot): string {
  const proiect = proiectDupaSlug.get(p.proiect);
  const cfg = STATUSURI[p.status];
  const viu = CULORI_PRET[p.status] ?? CULORI_PRET.disponibil;
  const lot = loturi.features.find((f) => f.properties.id === p.id);

  // Desenul: conturul lotului, retragerile și silueta casei maxime.
  let desen = '';
  let construit = '';
  if (lot && proiect) {
    const spreLot = azimutSpreLot(proiect, p.sir);
    const edificabil = edificabilLot(lot.geometry.coordinates[0], spreLot);
    const construire = potentialConstruire(p.suprafata, proiect.urbanism, edificabil?.suprafata ?? null);
    const casa = silueta(edificabil, construire.amprenta);
    desen = planLot({
      inel: lot.geometry.coordinates[0] as [number, number][],
      azimutStrada: (spreLot + 180) % 360,
      edificabil: edificabil?.inel ?? null,
      casa: casa?.inel ?? null,
      vecini: loturi.features
        .filter((f) => f.properties.proiect === p.proiect && f.properties.id !== p.id)
        .map((f) => ({
          inel: f.geometry.coordinates[0] as [number, number][],
          culoare: STATUSURI[f.properties.status].culoare,
          contur: STATUSURI[f.properties.status].contur,
        })),
      latime: 292,
      inaltime: 124,
      culoare: cfg.culoare,
      contur: cfg.contur,
      compact: true,
    });
    construit = `${proiect.urbanism.regim}, ${construire.amprenta} m² la sol`;
  }

  const laLot = proiect ? proiect.utilitati.filter((u) => u.stare === 'la lot').length : 0;
  const rata = proiect?.finantare
    ? Math.round((p.pret_total * (1 - proiect.finantare.avans / 100)) / proiect.finantare.luni)
    : null;

  const randuri: [string, string][] = [
    ['Deschidere', `${ml(p.front)} la stradă`],
    ['Utilități', proiect ? `${laLot} din ${proiect.utilitati.length} ajung la lot` : '—'],
    ['Acte', 'Intabulat, fără sarcini'],
    ['Poți construi', construit || '—'],
  ];

  return `
    <div class="fisa-lot" data-stare="${p.status}" style="--viu: ${viu.fond}; --pe-viu: ${viu.text}">
      <p class="fisa-lot__bara">${cfg.eticheta}</p>
      <div class="fisa-lot__corp">
        <h2 class="fisa-lot__cod">Lotul ${p.cod}</h2>
        <p class="fisa-lot__proiect">${proiect ? `${proiect.nume} · ${proiect.localitate}, ${proiect.judet}` : p.proiect}</p>

        <p class="fisa-lot__pret cifre">
          <strong>${euro(p.pret_total)}</strong><span class="fisa-lot__tvamic">+ TVA</span>
          <span class="fisa-lot__sep">·</span>${mp(p.suprafata)}
          <span class="fisa-lot__sep">·</span>${euro(p.pret_mp)}/m²
        </p>
        <p class="fisa-lot__final cifre">
          ${euro(cuTva(p.pret_total))} cu TVA${rata ? ` · rată de la ${euro(rata)} pe lună` : ''}
        </p>

        ${desen ? `<figure class="fisa-lot__plan">${desen}</figure>` : ''}

        <dl class="fisa-lot__date">
          ${randuri.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>

        ${p.observatii ? `<p class="fisa-lot__nota">${p.observatii}</p>` : ''}

        ${proiect ? `<a class="fisa-lot__toate" href="${cale(`/parcelari/${proiect.slug}`)}">Toate cele ${proiect.statistici.total} loturi din ${proiect.nume}</a>` : ''}

        <div class="fisa-lot__actiuni">
          <a class="buton buton-primar" href="${FIRMA.telefonLink}">Sună acum</a>
          <button class="buton buton-secundar" type="button" data-strada="${p.id}">Vezi de la stradă</button>
          <a class="buton buton-secundar" href="${cale(`/lot/${p.id}`)}">Pagina lotului</a>
          <button class="buton buton-secundar" type="button" data-copiaza="${p.id}">Copiază linkul</button>
        </div>
        <p class="fisa-lot__actualizat">Actualizat ${dataRo(p.actualizat)}.</p>
      </div>
    </div>`;
}

const cardMobil = el<HTMLDivElement>('card-lot');

function esteMobil() {
  return window.matchMedia('(max-width: 767px)').matches;
}

function deschideLot(p: ProprietatiLot, coord: [number, number]) {
  ascundeTooltip();
  lotSelectat = p.id;
  harta.setFilter('lot-selectat', ['==', ['get', 'id'], p.id] as never);

  // Click-ul pe lot deschide fișa, atât. Coborârea la nivelul solului e un
  // buton din fișă, nu o consecință: cine compară trei loturi nu vrea trei
  // zboruri de cameră între ele, iar înainte fiecare click ducea și la
  // schimbarea paginii după trei secunde, adică harta îți fugea de sub mână.
  // Fișa e panou fix, nu popup ancorat. Un popup de mărimea asta, agățat de un
  // lot din mijlocul ecranului, iese pe sub marginea de jos cu butoane cu tot,
  // și niciun anchor nu-l salvează pe un laptop scurt. Panoul stă mereu
  // întreg, în același loc, și nu acoperă lotul pe care tocmai ai dat click.
  inchideFisaParcelare();
  popup?.remove();
  popup = null;

  if (cardMobil) {
    // Culoarea benzii urcă pe panou, ca butonul de închidere să se vadă peste ea.
    cardMobil.style.setProperty('--pe-viu', (CULORI_PRET[p.status] ?? CULORI_PRET.disponibil).text);
    cardMobil.innerHTML = `<button class="card-lot__inchide" type="button" aria-label="Închide">×</button>${fisaLot(p)}`;
    cardMobil.hidden = false;
    cardMobil.querySelector('.card-lot__inchide')?.addEventListener('click', inchideLot);
    legaActiuniFisa(cardMobil, p, coord);
    cardMobil.scrollTop = 0;
  }

  actualizeazaPinuri();

  const url = new URL(window.location.href);
  url.searchParams.set('lot', p.id);
  history.replaceState(null, '', url);
}

function inchideLot() {
  iesiDinStrada();
  lotSelectat = null;
  popup?.remove();
  popup = null;
  if (cardMobil) cardMobil.hidden = true;
  if (straturiPuse) harta.setFilter('lot-selectat', ['==', ['get', 'id'], '__niciunul__'] as never);
  actualizeazaPinuri();
  const url = new URL(window.location.href);
  url.searchParams.delete('lot');
  history.replaceState(null, '', url);
}

function legaActiuniFisa(radacina: HTMLElement, p: ProprietatiLot, coord: [number, number]) {
  radacina.querySelector<HTMLButtonElement>('[data-strada]')?.addEventListener('click', () => {
    coboaraLaStrada(p, centruLot(p.id) ?? coord);
  });

  const buton = radacina.querySelector<HTMLButtonElement>('[data-copiaza]');
  buton?.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('lot', buton.dataset.copiaza!);
    try {
      await navigator.clipboard.writeText(url.toString());
      const initial = buton.textContent;
      buton.textContent = 'Link copiat';
      setTimeout(() => { buton.textContent = initial; }, 1800);
    } catch {
      buton.textContent = 'Nu am putut copia';
    }
  });
}

/* ----------------------------------------------------------------- comenzi */

function centruLot(id: string): [number, number] | null {
  const f = loturi.features.find((x) => x.properties.id === id);
  if (!f) return null;
  const inel = f.geometry.coordinates[0].slice(0, -1);
  const lon = inel.reduce((s, c) => s + c[0], 0) / inel.length;
  const lat = inel.reduce((s, c) => s + c[1], 0) / inel.length;
  return [lon, lat];
}

const redusa = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Încadrarea se calculează din bbox-ul parcelării, nu dintr-un zoom fix.
 *
 * Sidebarul mănâncă stânga ecranului, deci padding mare pe stânga. Iar la
 * pitch 60 jumătatea de sus a ecranului e orizont: padding mare și sus, ca
 * parcelarea să cadă în treimea de jos, unde perspectiva o arată mare.
 */
function spatiereCadru() {
  const h = harta.getContainer().clientHeight || 800;
  // Pe mobil etichetele parcelărilor sunt mai late decât punctele lor, deci
  // lăsăm loc lateral, altfel se taie la margini.
  // Pe 390px lățime, 84px de margine pe fiecare parte lasă 222px utili, adică
  // parcelarea ajunge o ștampilă. Marginea laterală e pentru etichetele
  // parcelărilor, care oricum nu se văd când una singură e aleasă.
  if (esteMobil()) return { top: Math.round(h * 0.15), right: 22, bottom: 168, left: 22 };
  const inchis = document.querySelector('.ecran-harta')?.getAttribute('data-sertar') === 'inchis';
  const latime = inchis
    ? 0
    : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w'), 10) || 340;
  // Pe ecran scurt un procent fix din înălțime mănâncă tot cadrul util, deci
  // marginea de sus e plafonată.
  return { top: Math.min(Math.round(h * 0.22), 180), right: 64, bottom: 64, left: latime + 48 };
}

/**
 * Zoomul se calculează din întinderea reală a hotarului, măsurată în reperul
 * camerei. `cameraForBounds` lucrează pe dreptunghiul aliniat la meridiane,
 * deci la o parcelare rotită dădea mereu o încadrare greșită.
 */
function incadrare(hotar: [number, number][], bearing: number, pitch: number, marjaExtra = 1) {
  const container = harta.getContainer();
  const pad = spatiereCadru();
  const latimeUtila = Math.max(240, container.clientWidth - pad.left - pad.right);
  const inaltimeUtila = Math.max(200, container.clientHeight - pad.top - pad.bottom);

  const lat0 = hotar.reduce((s, c) => s + c[1], 0) / hotar.length;
  const lon0 = hotar.reduce((s, c) => s + c[0], 0) / hotar.length;
  const rad = Math.PI / 180;
  const R = 6371008.8;
  const kx = rad * R * Math.cos(lat0 * rad);
  const ky = rad * R;

  const th = -bearing * rad;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [lon, lat] of hotar) {
    const x = (lon - lon0) * kx;
    const y = (lat - lat0) * ky;
    const u = x * cos - y * sin;
    const v = x * sin + y * cos;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }

  // Înclinarea mărește ce e aproape de privitor, iar creșterea nu e un prag,
  // e continuă: la 60 de grade marginea de jos se întinde cu mult peste ce
  // lăsa marja fixă de dinainte, deci parcelarea ieșea din cadru.
  const marja = (1.02 + pitch / 190) * marjaExtra;
  const metriPePixel = Math.max((maxU - minU) / latimeUtila, (maxV - minV) / inaltimeUtila) * marja;
  const zoom = Math.log2((156543.03392 * Math.cos(lat0 * rad)) / metriPePixel);

  return {
    center: [lon0, lat0] as [number, number],
    // Plafonul era 17, adică exact cât încape o parcelare de două sute de
    // loturi. Fâșiile de cinci-șapte loturi au nevoie de mai mult, altfel
    // rămân o dungă în mijlocul ecranului și pinurile de preț se calcă.
    zoom: Math.min(Math.max(zoom, 12), 18.4),
    bearing,
    pitch,
    padding: pad,
  };
}

/**
 * Corecția de încadrare, măsurată pe proiecția reală a hărții.
 *
 * `incadrare` calculează zoomul din scara de la centrul ecranului, dar sub
 * înclinare marginea de jos e mai aproape de cameră și se desenează mai mare,
 * așa că o marjă fixă e mereu ori prea strânsă, ori prea largă — și se schimbă
 * cu raportul ecranului. Aici nu mai ghicim: proiectăm hotarul cu camera
 * curentă, vedem cu cât depășește cutia utilă și scădem exact atâta zoom.
 * Două treceri, pentru că schimbarea zoomului schimbă și proiecția.
 */
function corecteazaIncadrare(hotar: [number, number][], treceri = 2) {
  const c = harta.getContainer();
  const w = c.clientWidth;
  const h = c.clientHeight;

  for (let i = 0; i < treceri; i++) {
    const pad = spatiereCadru();
    const cx = (pad.left + (w - pad.right)) / 2;
    const cy = (pad.top + (h - pad.bottom)) / 2;
    const semiL = Math.max(40, (w - pad.left - pad.right) / 2);
    const semiI = Math.max(40, (h - pad.top - pad.bottom) / 2);

    let depasire = 1;
    for (const p of hotar) {
      const q = harta.project(p);
      depasire = Math.max(depasire, Math.abs(q.x - cx) / semiL, Math.abs(q.y - cy) / semiI);
    }
    if (depasire <= 1.01) return;
    harta.setZoom(Math.max(harta.getZoom() - Math.log2(depasire), 11));
  }
}

function cameraPentruProiect(p: Proiect) {
  const pitch = redusa() ? 0 : p.camera.pitch;
  return incadrare(p.hotar, p.camera.bearing, pitch);
}

/** Ansamblul: toate parcelările în cadru, cu o înclinare mai mică. */
function cameraAnsamblu() {
  const pitch = redusa() ? 0 : 42;
  const toate = proiecte.flatMap((p) => p.hotar);
  // Ansamblul acoperă câțiva kilometri, deci deformarea dată de înclinare e mai
  // mare decât la o singură parcelare și are nevoie de marjă în plus.
  return incadrare(toate, 0, pitch, 1.45);
}

/* ------------------------------------------------ vederea de la nivelul solului */

/**
 * Poziția camerei pentru „de la stradă”: privim dinspre drumul interior către
 * lot. În fiecare bandă cele două șiruri sunt spate în spate, cu drumul între
 * ele, deci partea cu strada se deduce din `sir` și din normala ancorei.
 */
function pozaStrada(p: ProprietatiLot, centru: [number, number]) {
  const proiect = proiectDupaSlug.get(p.proiect);
  // Camera stă în stradă și privește spre lot, deci merge chiar pe direcția
  // dinspre stradă spre lot.
  const spreLot = proiect ? azimutSpreLot(proiect, p.sir) : 0;
  return {
    center: centru,
    zoom: 19.3,
    pitch: 74,
    bearing: spreLot,
  };
}

const lin = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Coborâre în doi timpi: apropiere, apoi lăsarea camerei la nivelul solului. */
function coboaraLaStrada(p: ProprietatiLot, centru: [number, number]) {
  const tinta = pozaStrada(p, centru);
  const al = ++secventa;
  porneStrada(p);

  if (redusa()) {
    harta.jumpTo(tinta);
    return;
  }

  harta.flyTo({
    center: centru,
    zoom: 16.9,
    pitch: 52,
    bearing: tinta.bearing,
    duration: 1100,
    curve: 1.25,
    essential: true,
  });

  window.setTimeout(() => {
    if (al !== secventa) return;
    harta.easeTo({ ...tinta, duration: 1700, easing: lin, essential: true });
  }, 1150);
}

/** Volumul casei maxime pentru lotul deschis, calculat în browser. */
function aratConstruibil(p: ProprietatiLot) {
  const proiect = proiectDupaSlug.get(p.proiect);
  const lot = loturi.features.find((f) => f.properties.id === p.id);
  if (!proiect || !lot) return;

  const edificabil = edificabilLot(lot.geometry.coordinates[0], azimutSpreLot(proiect, p.sir));
  if (!edificabil) return;
  const construire = potentialConstruire(p.suprafata, proiect.urbanism, edificabil.suprafata);
  const casa = silueta(edificabil, construire.amprenta);

  const features: GeoJSON.Feature[] = [
    {
      type: 'Feature',
      properties: { tip: 'edificabil' },
      geometry: { type: 'Polygon', coordinates: [edificabil.inel] },
    },
  ];
  if (casa) {
    features.push({
      type: 'Feature',
      properties: { tip: 'casa', inaltime: construire.inaltime },
      geometry: { type: 'Polygon', coordinates: [casa.inel] },
    });
  }
  (harta.getSource('construibil') as maplibregl.GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features,
  });
  for (const id of ['edificabil-contur', 'casa-volum']) {
    if (harta.getLayer(id)) harta.setLayoutProperty(id, 'visibility', 'visible');
  }

  const nod = el('bara-strada-casa');
  if (nod && casa) {
    nod.textContent =
      `casă de până la ${String(casa.latime).replace('.', ',')} pe ` +
      `${String(casa.adancime).replace('.', ',')} m, ${construire.amprenta} m² la sol`;
  }
}

function ascundeConstruibil() {
  for (const id of ['edificabil-contur', 'casa-volum']) {
    if (harta.getLayer(id)) harta.setLayoutProperty(id, 'visibility', 'none');
  }
  const nod = el('bara-strada-casa');
  if (nod) nod.textContent = '';
}

function porneStrada(p: ProprietatiLot) {
  modStrada = p.id;
  parcelareaDinStrada = p.proiect;
  actualizeazaPinuri();
  aratConstruibil(p);
  document.body.classList.add('mod-strada');
  if (harta.getLayer('lot-selectat-volum')) {
    harta.setFilter('lot-selectat-volum', ['==', ['get', 'id'], p.id] as never);
    harta.setLayoutProperty('lot-selectat-volum', 'visibility', 'visible');
  }
  const bara = el('bara-strada');
  if (bara) bara.hidden = false;
  const eticheta = el('bara-strada-lot');
  if (eticheta) {
    const proiect = proiectDupaSlug.get(p.proiect);
    eticheta.textContent = `Lotul ${p.cod}${proiect ? `, ${proiect.nume}` : ''}`;
  }
}

function iesiDinStrada(inapoiLaParcelare = true) {
  if (!modStrada) return;
  secventa += 1;
  modStrada = null;
  actualizeazaPinuri();
  document.body.classList.remove('mod-strada');
  ascundeConstruibil();
  if (harta.getLayer('lot-selectat-volum')) {
    harta.setLayoutProperty('lot-selectat-volum', 'visibility', 'none');
  }
  const bara = el('bara-strada');
  if (bara) bara.hidden = true;
  const inapoi = parcelareaDinStrada ?? filtre.proiect;
  parcelareaDinStrada = null;
  if (inapoiLaParcelare) ducLaProiect(inapoi);
}

function ducLaProiect(slug: string) {
  const proiect = proiectDupaSlug.get(slug);
  const optiuni = slug === 'toate' || !proiect ? cameraAnsamblu() : cameraPentruProiect(proiect);
  const hotar = proiect && slug !== 'toate' ? proiect.hotar : proiecte.flatMap((p) => p.hotar);
  if (redusa()) {
    harta.jumpTo(optiuni);
    corecteazaIncadrare(hotar);
    return;
  }
  harta.flyTo({ ...optiuni, duration: 1400, essential: true });
  harta.once('moveend', () => corecteazaIncadrare(hotar));
}

function marcheazaFundal() {
  document.querySelector('.ecran-harta')?.setAttribute('data-fundal', modBasemap);
}

function schimbaBasemap(mod: ModBasemap) {
  if (mod === modBasemap) return;
  modBasemap = mod;
  marcheazaFundal();
  straturiPuse = false;
  void styleBasemap(mod).then((stil) => harta.setStyle(stil));
  harta.once('styledata', () => {
    adaugaStraturi();
    comutaPoi(poiVizibil);
    if (lotSelectat) harta.setFilter('lot-selectat', ['==', ['get', 'id'], lotSelectat] as never);
  });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-basemap]')) {
    b.setAttribute('aria-pressed', String(b.dataset.basemap === mod));
  }
}

function comutaPoi(vizibil: boolean) {
  poiVizibil = vizibil;
  for (const id of ['poi-punct', 'poi-eticheta']) {
    if (harta.getLayer(id)) harta.setLayoutProperty(id, 'visibility', vizibil ? 'visible' : 'none');
  }
}

/* -------------------------------------------------------------- controale UI */

function legaControale() {
  legaPortofoliu();
  legaFisaParcelare();

  for (const s of ORDINE_STATUS) {
    el<HTMLInputElement>(`filtru-${s}`)?.addEventListener('change', (e) => {
      const bifat = (e.target as HTMLInputElement).checked;
      if (bifat) filtre.statusuri.add(s);
      else filtre.statusuri.delete(s);
      aplicaFiltre();
    });
  }

  legaInterval('sup', (min, max) => {
    filtre.supMin = min;
    filtre.supMax = max;
    aplicaFiltre();
  }, (v) => mp(v));

  el<HTMLButtonElement>('reseteaza')?.addEventListener('click', () => {
    filtre.proiect = 'toate';
    filtre.statusuri = new Set(ORDINE_STATUS);
    marcheazaRand('toate');
    for (const s of ORDINE_STATUS) {
      const cb = el<HTMLInputElement>(`filtru-${s}`);
      if (cb) cb.checked = true;
    }
    reseteazaIntervale();
    aplicaFiltre();
    ducLaProiect('toate');
  });

  el<HTMLInputElement>('filtru-poi')?.addEventListener('change', (e) => {
    comutaPoi((e.target as HTMLInputElement).checked);
  });

  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-basemap]')) {
    b.addEventListener('click', () => schimbaBasemap(b.dataset.basemap as ModBasemap));
  }

  el<HTMLButtonElement>('iesi-strada')?.addEventListener('click', () => {
    iesiDinStrada();
    inchideLot();
  });

  // Strângerea panoului pe desktop. Referința din piață are același gest, iar
  // pe o hartă care e tot produsul, un panou de 372 de pixeli care nu se poate
  // da la o parte e o piedică.
  const scena = document.querySelector<HTMLElement>('.ecran-harta');
  const pastila = el<HTMLButtonElement>('deschide-sertar');
  const aratePanou = (deschis: boolean) => {
    if (!scena) return;
    if (deschis) delete scena.dataset.sertar;
    else scena.dataset.sertar = 'inchis';
    if (pastila) pastila.hidden = deschis;
    // Încadrarea ține cont de lățimea panoului, deci se reface.
    const p = filtre.proiect !== 'toate' ? proiectDupaSlug.get(filtre.proiect) : null;
    if (p && !modStrada) corecteazaIncadrare(p.hotar);
  };
  el<HTMLButtonElement>('inchide-sertar')?.addEventListener('click', () => aratePanou(false));
  pastila?.addEventListener('click', () => aratePanou(true));

  const sertar = el<HTMLElement>('sertar');
  el<HTMLButtonElement>('comuta-sertar')?.addEventListener('click', (e) => {
    const buton = e.currentTarget as HTMLButtonElement;
    const deschis = buton.getAttribute('aria-expanded') === 'true';
    buton.setAttribute('aria-expanded', String(!deschis));
    sertar?.classList.toggle('sertar--deschis', !deschis);
  });
}

/* Două range-uri suprapuse: cel de minim și cel de maxim, care nu se depășesc. */
function legaInterval(
  prefix: string,
  laSchimbare: (min: number, max: number) => void,
  formateaza: (v: number) => string,
) {
  const jos = el<HTMLInputElement>(`${prefix}-min`);
  const sus = el<HTMLInputElement>(`${prefix}-max`);
  const text = el<HTMLElement>(`${prefix}-valoare`);
  const bara = el<HTMLElement>(`${prefix}-bara`);
  if (!jos || !sus) return;

  const actualizeaza = (declansat: boolean) => {
    let min = Number(jos.value);
    let max = Number(sus.value);
    if (min > max) {
      if (document.activeElement === jos) { max = min; sus.value = String(max); }
      else { min = max; jos.value = String(min); }
    }
    if (text) text.textContent = `${formateaza(min)} - ${formateaza(max)}`;
    if (bara) {
      const total = Number(jos.max) - Number(jos.min) || 1;
      bara.style.setProperty('--start', `${((min - Number(jos.min)) / total) * 100}%`);
      bara.style.setProperty('--end', `${((max - Number(jos.min)) / total) * 100}%`);
    }
    if (declansat) laSchimbare(min, max);
  };

  jos.addEventListener('input', () => actualizeaza(true));
  sus.addEventListener('input', () => actualizeaza(true));
  (jos as HTMLInputElement & { _reset?: () => void })._reset = () => actualizeaza(false);
  actualizeaza(false);
}

/** Intervalele se recalibrează pe parcelarea selectată, altfel sliderul e inutil. */
function reseteazaIntervale() {
  const set = loturi.features.filter(
    (f) => filtre.proiect === 'toate' || f.properties.proiect === filtre.proiect,
  );
  const sup = set.map((f) => f.properties.suprafata);
  const pas = 10;
  const sMin = Math.floor(Math.min(...sup) / pas) * pas;
  const sMax = Math.ceil(Math.max(...sup) / pas) * pas;

  const jos = el<HTMLInputElement>('sup-min');
  const sus = el<HTMLInputElement>('sup-max');
  if (jos && sus) {
    for (const inp of [jos, sus]) {
      inp.min = String(sMin);
      inp.max = String(sMax);
      inp.step = String(pas);
    }
    jos.value = String(sMin);
    sus.value = String(sMax);
    (jos as HTMLInputElement & { _reset?: () => void })._reset?.();
  }

  filtre.supMin = sMin;
  filtre.supMax = sMax;
  filtre.pretMin = 0;
  filtre.pretMax = Infinity;

  construiesteBenzi(set.map((f) => f.properties.pret_total));
}

/* ------------------------------------------------------------ benzi de buget */

let benziCurente: BandaBuget[] = [];

/**
 * Benzile se recalculează pe stocul din filtrul curent. Dacă omul a ales
 * Lacul Vlăsiei, „sub 50.000 €” nu mai spune nimic: acolo pornesc de la
 * 42.000. Pragurile trebuie să vină din prețurile care chiar sunt pe hartă.
 */
function construiesteBenzi(preturi: number[]) {
  const lista = el<HTMLUListElement>('benzi-buget');
  if (!lista) return;
  benziCurente = benziBuget(preturi);

  const rand = (id: string, eticheta: string, min: string, max: string, bifat: boolean) => `
    <li>
      <label for="buget-${id}">
        <input type="radio" name="buget" id="buget-${id}" value="${id}"
               data-min="${min}" data-max="${max}"${bifat ? ' checked' : ''} />
        <span class="benzi__bulina" aria-hidden="true"></span>
        <span class="benzi__text">${eticheta}</span>
        <span class="benzi__nr cifre" data-nr-buget="${id}">0</span>
      </label>
    </li>`;

  lista.innerHTML =
    rand('toate', 'Toate', '', '', true) +
    benziCurente
      .map((b) => rand(b.id, b.eticheta, String(b.min), b.max === Infinity ? '' : String(b.max), false))
      .join('');

  legaBenziBuget();
}

function legaBenziBuget() {
  for (const inp of document.querySelectorAll<HTMLInputElement>('input[name="buget"]')) {
    inp.addEventListener('change', () => {
      if (!inp.checked) return;
      filtre.pretMin = inp.dataset.min ? Number(inp.dataset.min) : 0;
      filtre.pretMax = inp.dataset.max ? Number(inp.dataset.max) : Infinity;
      aplicaFiltre();
    });
  }
}

/* ------------------------------------------------------------------ pornire */

/* --------------------------------------------------------------- pinuri */

interface PinPeHarta {
  pin: Pin;
  marker: Marker;
  /** Pinurile generate din parcelări duc în filtru; cele puse din panou, nu. */
  slug: string | null;
}

const pinuri: PinPeHarta[] = [];

/** Parcelările existente devin pinuri automat, ca să nu fie două limbaje. */
function pinuriDinProiecte(): PinPeHarta[] {
  return proiecte.map((p) => {
    const libere = p.statistici.disponibile;
    // Prețul mediu pe metru pătrat al loturilor care chiar se pot cumpăra. Un
    // preț mediu calculat și peste cele vândute ar fi o cifră adevărată pusă
    // acolo ca să inducă în eroare.
    const deVanzare = loturi.features.filter(
      (f) => f.properties.proiect === p.slug && STATUSURI[f.properties.status].vandabil,
    );
    const mediu = deVanzare.length
      ? Math.round(deVanzare.reduce((s, f) => s + f.properties.pret_mp, 0) / deVanzare.length)
      : null;
    const pin: Pin = {
      id: `parcelare:${p.slug}`,
      nume: p.nume,
      marca: marcaDinNume(p.nume),
      stare: libere > 0 ? 'disponibil' : 'vandut',
      detaliu: libere > 0 ? `${libere} loturi libere` : 'toate loturile vândute',
      pretMp: mediu,
      legatura: cale(`/parcelari/${p.slug}`),
      lng: (p.bbox[0] + p.bbox[2]) / 2,
      lat: (p.bbox[1] + p.bbox[3]) / 2,
    };
    return { pin, slug: p.slug, marker: null as unknown as Marker };
  });
}

function fisaPin(p: Pin): string {
  const cfg = STARI_PIN[p.stare] ?? STARI_PIN.disponibil;
  const detaliu = p.detaliu ? `<p class="fisa-pin__detaliu">${p.detaliu}</p>` : '';
  // Fără link, butonul e telefonul: în nișa asta el e CTA-ul dominant, iar un
  // „Vezi detalii” care nu duce nicăieri e mai rău decât niciun buton.
  const actiune = p.legatura
    ? `<a class="buton buton-primar w-full" href="${p.legatura}">Vezi parcelarea</a>`
    : `<a class="buton buton-primar w-full" href="${FIRMA.telefonLink}">Sună pentru acest teren</a>`;
  return `
    <div class="fisa-pin">
      <p class="fisa-pin__stare" style="--c: ${cfg.culoare}">${cfg.eticheta}</p>
      <h2 class="fisa-pin__nume">${p.nume}</h2>
      ${detaliu}
      ${actiune}
    </div>`;
}

function construiestePinuri(generate: Pin[]) {
  for (const p of pinuri) p.marker.remove();
  pinuri.length = 0;

  // Panoul publică lista întreagă, deci dacă a publicat ceva, aia e lista.
  // Fără publicare rămâne portofoliul generat la build.
  const lista = citesteDepozit().pinuri ?? generate;
  const proprietati: PinPeHarta[] = lista.map((pin) => ({
    pin,
    slug: null,
    marker: null as unknown as Marker,
  }));

  for (const intrare of [...pinuriDinProiecte(), ...proprietati]) {
    const nod = elementPin(intrare.pin, {
      // Pe disc scrie prețul pe metru pătrat, nu numărul de loturi: e prima
      // întrebare a omului și e singura cifră comparabilă între o parcelare și
      // o tarla răzleață. Numărul de loturi a trecut pe eticheta de dedesubt.
      subMarca: intrare.pin.pretMp ? `${intrare.pin.pretMp} €/m²` : null,
      subNume: intrare.slug ? (proiectDupaSlug.get(intrare.slug)?.statistici.disponibile
        ? `${proiectDupaSlug.get(intrare.slug)!.statistici.disponibile} loturi libere`
        : 'stoc epuizat') : null,
    });
    if (intrare.slug) nod.classList.add('pin--parcelare');
    nod.addEventListener('click', (ev) => {
      ev.stopPropagation();
      deschidePin(intrare);
    });
    intrare.marker = new Marker({ element: nod, anchor: 'bottom' })
      .setLngLat([intrare.pin.lng, intrare.pin.lat])
      .addTo(harta);
    pinuri.push(intrare);
  }
  actualizeazaPinuri();
}

function deschidePin(intrare: PinPeHarta) {
  if (intrare.slug) {
    // Pin de parcelare: întâi fișa, abia apoi intrarea. Așa omul vede câte
    // loturi sunt și de la ce preț înainte să se angajeze într-un zoom.
    deschideFisaParcelare(intrare.slug);
    return;
  }

  inchideLot();
  popup?.remove();
  marcheazaTeren(intrare.pin.id);
  popup = new Popup({ maxWidth: '260px', offset: 26, closeButton: true, closeOnClick: true })
    .setLngLat([intrare.pin.lng, intrare.pin.lat])
    .setHTML(fisaPin(intrare.pin))
    .addTo(harta);
  popup.on('close', () => marcheazaTeren(null));
  harta.easeTo({
    center: [intrare.pin.lng, intrare.pin.lat],
    zoom: Math.max(harta.getZoom(), 14.5),
    duration: redusa() ? 0 : 700,
  });
}

/**
 * Portofoliul are două stări diferite, care nu au voie să se amestece:
 *
 * - `aria-pressed` — care parcelare filtrează harta. Doar rândurile de
 *   parcelare și „Toate” pot fi apăsate.
 * - `data-deschis` — ce teren ai deschis ultima dată. Un teren răzleț nu
 *   filtrează nimic, doar te duce la el, deci nu are ce căuta în starea de
 *   filtrare.
 *
 * Prima variantă le ținea pe amândouă în `aria-pressed`, iar panoul ajungea să
 * scrie că e ales „Petrești Centru” în timp ce harta era filtrată pe Lacul
 * Vlăsiei.
 */
function marcheazaRand(cheie: string) {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-portofoliu]')) {
    if (b.dataset.fel === 'teren') continue;
    b.setAttribute('aria-pressed', String(b.dataset.portofoliu === cheie));
  }
}

function marcheazaTeren(id: string | null) {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-fel="teren"]')) {
    if (id && b.dataset.portofoliu === id) b.dataset.deschis = 'da';
    else delete b.dataset.deschis;
  }
}

function alegeParcelare(slug: string) {
  filtre.proiect = slug;
  marcheazaRand(slug);
  iesiDinStrada(false);
  inchideLot();
  reseteazaIntervale();
  aplicaFiltre();
  ducLaProiect(slug);
}

function legaFisaParcelare() {
  el<HTMLButtonElement>('cp-inchide')?.addEventListener('click', inchideFisaParcelare);
  el<HTMLButtonElement>('cp-intra')?.addEventListener('click', () => {
    const slug = parcelareInFisa;
    inchideFisaParcelare();
    if (slug) alegeParcelare(slug);
  });
}

function legaPortofoliu() {
  for (const buton of document.querySelectorAll<HTMLButtonElement>('[data-portofoliu]')) {
    const cheie = buton.dataset.portofoliu!;
    const fel = buton.dataset.fel;

    buton.addEventListener('click', () => {
      if (fel === 'teren') {
        // Un teren răzleț nu e un filtru: nu schimbă ce se vede pe hartă, doar
        // te duce la el. Filtrul rămâne cum era.
        marcheazaTeren(cheie);
        const intrare = pinuri.find((x) => x.pin.id === cheie);
        if (intrare) deschidePin(intrare);
        return;
      }
      deschideFisaParcelare(cheie);
    });

    // Trecerea cu mouse-ul peste rând ridică semnul de pe hartă. Fără asta,
    // lista și harta rămân două liste separate.
    const evidentiaza = (pornit: boolean) => {
      const id = fel === 'teren' ? cheie : `parcelare:${cheie}`;
      const intrare = pinuri.find((x) => x.pin.id === id);
      intrare?.marker.getElement().classList.toggle('pin--evidentiat', pornit);
    };
    buton.addEventListener('mouseenter', () => evidentiaza(true));
    buton.addEventListener('mouseleave', () => evidentiaza(false));
    buton.addEventListener('focus', () => evidentiaza(true));
    buton.addEventListener('blur', () => evidentiaza(false));
  }
}

/* -------------------------------------------------- fișa parcelării */

let parcelareInFisa: string | null = null;

function marcheazaFisa(deschisa: boolean) {
  const scena = document.querySelector<HTMLElement>('.ecran-harta');
  if (!scena) return;
  if (deschisa) scena.dataset.fisa = 'da';
  else delete scena.dataset.fisa;
}

function inchideFisaParcelare() {
  parcelareInFisa = null;
  const card = el('card-parcelare');
  if (card) card.hidden = true;
  marcheazaFisa(false);
}

/**
 * Fișa unei parcelări, deschisă din pin sau din portofoliu.
 *
 * Referința din piață pune aici patru bife („curent la limită”, „intabulat”) și
 * un tabel de prețuri. Bifele sunt exact formularea pe care cumpărătorul a
 * învățat să nu o creadă, așa că aici fiecare utilitate spune și starea reală,
 * și detaliul, inclusiv atunci când răspunsul e „nu încă”.
 */
function deschideFisaParcelare(slug: string) {
  const proiect = proiectDupaSlug.get(slug);
  const card = el('card-parcelare');
  if (!proiect || !card) return;

  parcelareInFisa = slug;
  inchideLot();
  popup?.remove();
  popup = null;

  const pune = (id: string, text: string) => {
    const nod = el(id);
    if (nod) nod.textContent = text;
  };

  const st = proiect.statistici;
  pune('cp-nume', proiect.nume);
  pune('cp-unde', `${proiect.localitate}, județul ${proiect.judet}`);
  pune('cp-disponibile', `${st.disponibile} din ${st.total} disponibile`);
  pune('cp-pret', st.pret_total_min ? `de la ${euro(st.pret_total_min)} + TVA` : 'stoc epuizat');
  pune('cp-descriere', proiect.descriere[0] ?? '');

  // Toate loturile, în ordinea de pe teren, cu bulina de stare. La fâșiile de
  // cinci-șapte loturi asta e chiar oferta întreagă; lista „cele mai ieftine
  // opt” avea sens doar cât o parcelare avea două sute de loturi.
  const lista = el('cp-loturi');
  if (lista) {
    const aleParcelarii = loturi.features.filter((f) => f.properties.proiect === slug);
    lista.innerHTML = aleParcelarii
      .map((f) => {
        const l = f.properties;
        const cfg = STATUSURI[l.status];
        const pret = l.status === 'vandut' ? 'vândut' : l.status === 'in_pregatire' ? 'în curând' : euro(l.pret_total);
        return `<li><button type="button" data-lot="${l.id}" data-stare="${l.status}" title="${cfg.eticheta}">
            <span class="bulina" style="--c: ${cfg.culoare}" aria-hidden="true"></span>
            <span class="cod">Lotul ${l.cod}</span>
            <span class="sup">${mp(l.suprafata)}</span>
            <span class="pret">${pret}</span>
          </button></li>`;
      })
      .join('');
    for (const b of lista.querySelectorAll<HTMLButtonElement>('[data-lot]')) {
      b.addEventListener('click', () => {
        const id = b.dataset.lot!;
        const f = loturi.features.find((x) => x.properties.id === id);
        const c = centruLot(id);
        if (!f || !c) return;
        if (filtre.proiect !== slug) alegeParcelare(slug);
        deschideLot(f.properties, c);
      });
    }
  }

  const ul = el('cp-utilitati');
  if (ul) {
    ul.innerHTML = proiect.utilitati
      .map((u) => {
        const gata = u.stare === 'la lot' ? 'da' : 'nu';
        return `<li data-gata="${gata}"><b>${u.tip}</b><span>${u.stare}${u.detaliu ? ` · ${u.detaliu}` : ''}</span></li>`;
      })
      .join('');
  }

  const suna = el<HTMLAnchorElement>('cp-suna');
  if (suna) suna.href = FIRMA.telefonLink;

  const pagina = el<HTMLAnchorElement>('cp-pagina');
  if (pagina) {
    pagina.href = cale(`/parcelari/${slug}`);
    pagina.hidden = !arePagina.has(slug);
  }

  card.hidden = false;
  card.scrollTop = 0;
  marcheazaFisa(true);
}

/* ------------------------------------------ pinurile de preț ale loturilor */

/**
 * Fiecare lot poartă prețul pe hartă.
 *
 * E singura schimbare care mută harta din „planșă frumoasă” în „ofertă”: prima
 * întrebare a omului nu e ce cod are lotul, e cât costă. Referința din piață
 * face același lucru și e partea care îi funcționează.
 *
 * Semnul apare abia când lotul e mai mare decât el pe ecran. Sub pragul ăsta
 * ar fi o etichetă plutind peste un dreptunghi de doi pixeli, adică zgomot.
 */
interface PinPret {
  p: ProprietatiLot;
  centru: [number, number];
  marker: Marker;
}

const pinuriPret: PinPret[] = [];
const ZOOM_PRET = 15.6;

function construiestePinuriPret() {
  for (const x of pinuriPret) x.marker.remove();
  pinuriPret.length = 0;

  for (const f of loturi.features) {
    const c = centruLot(f.properties.id);
    if (!c) continue;
    const nod = elementPinPret(f.properties);
    nod.addEventListener('click', (ev) => {
      ev.stopPropagation();
      deschideLot(f.properties, c);
    });
    nod.addEventListener('mouseenter', () => seteazaHover(f.properties.id));
    nod.addEventListener('mouseleave', () => seteazaHover(null));
    pinuriPret.push({
      p: f.properties,
      centru: c,
      marker: new Marker({ element: nod, anchor: 'bottom', offset: [0, -5] })
        .setLngLat(c)
        .addTo(harta),
    });
  }
}

/** Cutia pe care o ocupă un pin pe ecran, după cât din el e afișat. */
function cutiaPin(x: number, y: number, forma: 'plin' | 'fara-nume' | 'mic') {
  // Discul a crescut de la 44 la 54 de pixeli când a primit prețul, iar
  // eticheta are acum două rânduri. Cutiile trebuie să crească odată cu ele,
  // altfel coliziunile se calculează pe un semn care nu mai există.
  const dim =
    forma === 'plin'
      ? { l: 156, i: 106 }
      : forma === 'fara-nume'
        ? { l: 108, i: 86 }
        : { l: 40, i: 48 };
  return { s: x - dim.l / 2, d: x + dim.l / 2, sus: y - dim.i, jos: y };
}

type Cutie = ReturnType<typeof cutiaPin>;

function cutiaPret(x: number, y: number, mic: boolean) {
  const dim = mic ? { l: 20, i: 20 } : { l: 80, i: 46 };
  return { s: x - dim.l / 2, d: x + dim.l / 2, sus: y - dim.i, jos: y };
}

function seLoveste(a: Cutie, b: Cutie) {
  return a.s < b.d && a.d > b.s && a.sus < b.jos && a.jos > b.sus;
}

let ceasPinuri = 0;

/**
 * Ce pin se vede și cum. Două feluri de reguli:
 *
 * 1. Context — pinul nu stă peste lucrul pe care tocmai l-ai deschis.
 * 2. Coliziune — două proprietăți apropiate nu se calcă. Întâi cade numele,
 *    apoi pinul se face mic. Nu dispare niciodată complet: e proprietatea pe
 *    care clientul a pus-o pe hartă, nu o etichetă de fundal. Exact aici se
 *    strică harta de referință, unde zeci de discuri saturate se suprapun
 *    până nu se mai citește niciunul.
 */
function actualizeazaPinuri() {
  if (!pinuri.length && !pinuriPret.length) return;
  if (ceasPinuri) return;
  ceasPinuri = requestAnimationFrame(() => {
    ceasPinuri = 0;
    asazaPinuri();
  });
}

function asazaPinuri() {
  const z = harta.getZoom();

  const vizibile: { nod: HTMLElement; x: number; y: number; prioritar: boolean }[] = [];

  for (const { pin, marker, slug } of pinuri) {
    const nod = marker.getElement();
    let ascuns = false;
    // Pe glob, la scară de continent, un semn cu „Disponibil” plutind peste
    // Europa nu spune nimic. Semnele intră în cadru abia când zona are sens.
    if (z < 8.6) ascuns = true;
    // În vederea de la stradă harta e o scenă, nu o listă.
    else if (modStrada) ascuns = true;
    // Parcelarea în care ai intrat nu are nevoie de propriul semn peste loturi.
    else if (slug && (z > 15.4 || filtre.proiect === slug)) ascuns = true;
    // Proprietățile răzlețe se retrag când te uiți de aproape la parcele.
    else if (!slug && z > 17.4) ascuns = true;

    nod.classList.toggle('pin--ascuns', ascuns);
    if (ascuns) continue;

    const punct = harta.project([pin.lng, pin.lat]);
    vizibile.push({ nod, x: punct.x, y: punct.y, prioritar: Boolean(slug) });
  }

  // Cine e mai jos pe ecran e mai aproape de privitor, deci trece peste. La
  // egalitate, parcelările au întâietate: ele duc undeva.
  vizibile.sort((a, b) => b.y - a.y || Number(b.prioritar) - Number(a.prioritar));

  const cuNume = z >= 11;
  const ocupate: Cutie[] = [];
  let strat = 400;
  for (const v of vizibile) {
    let forma: 'plin' | 'fara-nume' | 'mic' = cuNume ? 'plin' : 'fara-nume';
    let cutie = cutiaPin(v.x, v.y, forma);
    if (ocupate.some((o) => seLoveste(cutie, o))) {
      forma = 'fara-nume';
      cutie = cutiaPin(v.x, v.y, forma);
      if (ocupate.some((o) => seLoveste(cutie, o))) {
        forma = 'mic';
        cutie = cutiaPin(v.x, v.y, forma);
      }
    }
    ocupate.push(cutie);
    v.nod.classList.toggle('pin--fara-nume', forma !== 'plin');
    v.nod.classList.toggle('pin--mic', forma === 'mic');
    const parinte = v.nod.parentElement;
    if (parinte) parinte.style.zIndex = String(strat--);
  }

  asazaPinuriPret(z, ocupate);
}

/**
 * Pinurile de preț se așază în aceeași hartă de ocupare ca semnele de
 * proprietate, ca să nu se calce între ele. Când doi vecini nu încap, cel de
 * dedesubt se strânge la o bulină: rămâne vizibil unde e lotul, dar cedează
 * prețul vecinului. Ordinea e după preț, ca lotul mai ieftin să fie cel care
 * își păstrează eticheta.
 */
function asazaPinuriPret(z: number, ocupate: Cutie[]) {
  if (!pinuriPret.length) return;

  const vizibile: { nod: HTMLElement; x: number; y: number; ordine: number }[] = [];

  for (const { p, centru, marker } of pinuriPret) {
    const nod = marker.getElement();
    const ascuns = z < ZOOM_PRET || Boolean(modStrada) || !treceFiltrele(p);
    nod.classList.toggle('pin-pret--ascuns', ascuns);
    nod.classList.toggle('pin-pret--deschis', lotSelectat === p.id);
    if (ascuns) continue;
    const punct = harta.project(centru);
    vizibile.push({
      nod,
      x: punct.x,
      y: punct.y,
      // Disponibilul înaintea vândutului, apoi cel mai ieftin înaintea celui scump.
      ordine: (p.status === 'disponibil' ? 0 : 1e9) + p.pret_total,
    });
  }

  vizibile.sort((a, b) => a.ordine - b.ordine);

  let strat = 300;
  for (const v of vizibile) {
    let cutie = cutiaPret(v.x, v.y, false);
    const mic = ocupate.some((o) => seLoveste(cutie, o));
    if (mic) cutie = cutiaPret(v.x, v.y, true);
    ocupate.push(cutie);
    v.nod.classList.toggle('pin-pret--mic', mic);
    const parinte = v.nod.parentElement;
    if (parinte) parinte.style.zIndex = String(strat--);
  }
}

/* ------------------------------------------------------- intrarea pe hartă */

/**
 * Fiecare lot primește o poziție 0 la 1 de-a lungul rândurilor parcelării
 * lui. E singura proprietate de care are nevoie valul de dezvăluire: fără ea
 * loturile ar apărea toate deodată, cu ea se deschid pe rânduri, dinspre
 * capătul dinspre care vine camera.
 */
function calculeazaOrdinea(col: ColectieLoturi) {
  const perProiect = new Map<string, { p: ProprietatiLot; u: number }[]>();
  const rad = Math.PI / 180;

  for (const f of col.features) {
    const inel = f.geometry.coordinates[0];
    let lon = 0;
    let lat = 0;
    for (const c of inel) {
      lon += c[0];
      lat += c[1];
    }
    lon /= inel.length;
    lat /= inel.length;

    const proiect = proiectDupaSlug.get(f.properties.proiect);
    const az = (proiect?.azimut ?? 0) * rad;
    // Unități de grade, scalate pe longitudine: e de ajuns pentru o ordonare.
    const x = lon * Math.cos(lat * rad);
    const u = x * Math.sin(az) + lat * Math.cos(az);

    const lista = perProiect.get(f.properties.proiect) ?? [];
    lista.push({ p: f.properties, u });
    perProiect.set(f.properties.proiect, lista);
  }

  for (const lista of perProiect.values()) {
    let min = Infinity;
    let max = -Infinity;
    for (const { u } of lista) {
      if (u < min) min = u;
      if (u > max) max = u;
    }
    const interval = max - min || 1;
    for (const { p, u } of lista) {
      (p as ProprietatiLot & { ordine: number }).ordine = (u - min) / interval;
    }
  }
}

let ceasVal: number | null = null;

/** Mătură pragul o singură dată, cu un val de circa o secundă. */
function dezvaluieLoturi(intarziere = 0) {
  if (redusa()) return;
  pragDezvaluire = 0;
  aplicaOpacitati();

  const durata = 1100;
  let start = 0;
  const pas = (t: number) => {
    if (!start) start = t + intarziere;
    const k = Math.min(1, Math.max(0, (t - start) / durata));
    pragDezvaluire = k * 1.2;
    aplicaOpacitati();
    if (k < 1) ceasVal = requestAnimationFrame(pas);
    else ceasVal = null;
  };
  if (ceasVal) cancelAnimationFrame(ceasVal);
  ceasVal = requestAnimationFrame(pas);
}

function aplicaOpacitati() {
  for (const s of ORDINE_STATUS) {
    if (!harta.getLayer(idFill(s))) continue;
    harta.setPaintProperty(idFill(s), 'fill-opacity', opacitateFill(s, pragDezvaluire) as never);
    harta.setPaintProperty(
      idLinie(s),
      'line-opacity',
      ['*', STATUSURI[s].vandabil ? 0.95 : 0.6, factorVal(pragDezvaluire)] as never,
    );
  }
}

/** Parcelarea cu cele mai multe loturi libere: aia merită prima secundă. */
function parcelareaPrincipala(): Proiect {
  return proiecte.reduce((a, b) => (b.statistici.disponibile > a.statistici.disponibile ? b : a));
}

async function porneste() {
  const container = el<HTMLDivElement>('harta');
  if (!container) return;

  const [raspuns, raspunsPinuri] = await Promise.all([
    fetch(cale('/date/loturi.geojson')),
    fetch(cale('/date/pinuri.json')),
  ]);
  const generate = (await raspuns.json()) as ColectieLoturi;
  const pinuriGenerate = (raspunsPinuri.ok ? await raspunsPinuri.json() : []) as Pin[];
  // Peste datele generate la build punem ce s-a publicat din panou.
  const depozit = citesteDepozit();
  adaugaProiecteNoi(depozit.proiecteNoi);
  loturi = aplicaModificari(generate, depozit) as ColectieLoturi;
  calculeazaOrdinea(loturi);
  const nrModificari = numaraModificari(depozit);
  if (nrModificari > 0) {
    const nota = el('nota-publicat');
    if (nota) {
      nota.textContent =
        `${nrModificari} ${nrModificari === 1 ? 'modificare publicată' : 'modificări publicate'} din panou`;
      nota.hidden = false;
    }
  }

  const parametri = new URLSearchParams(window.location.search);
  const lotCerut = parametri.get('lot');
  const proiectCerut = parametri.get('parcelare');
  const lotInitial = lotCerut ? loturi.features.find((f) => f.properties.id === lotCerut) : undefined;

  const slugInitial = lotInitial?.properties.proiect ?? (proiectCerut && proiectDupaSlug.has(proiectCerut) ? proiectCerut : 'toate');
  filtre.proiect = slugInitial;
  marcheazaRand(slugInitial);

  const camera = slugInitial === 'toate'
    ? { center: [26.067, 44.617] as [number, number], zoom: 12.4, bearing: 0, pitch: 42 }
    : proiectDupaSlug.get(slugInitial)!.camera;

  harta = new MapLibre({
    container,
    style: await styleBasemap(modBasemap),
    center: camera.center,
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: redusa() ? 0 : camera.pitch,
    maxPitch: 80,
    // Stilurile Mapbox conțin proprietăți din specificația lor, nu din a
    // MapLibre. Validarea le-ar respinge pe toate; randarea le ignoră.
    validateStyle: false,
    // Globul se vede abia sub zoom 5, deci limita de dinainte îl făcea
    // inaccesibil.
    minZoom: 1.5,
    maxZoom: 20,
    attributionControl: { compact: true },
    logo: false,
    // Necesar ca harta să apară în capturi de ecran (ale noastre și ale clientului).
    preserveDrawingBuffer: true,
  } as ConstructorParameters<typeof MapLibre>[0]);

  harta.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
  harta.addControl(new ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');
  harta.keyboard.enable();

  // Doar în dev, ca să pot inspecta straturile din consolă.
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__harta = harta;

  marcheazaFundal();
  reseteazaIntervale();
  legaControale();

  harta.on('load', () => {
    // Când urmează o intrare cu val, loturile se pun deja stinse: altfel apar
    // o clipă, dispar și reapar, ceea ce arată a bug, nu a regie.
    if (!lotInitial && !redusa()) pragDezvaluire = 0;
    adaugaStraturi();
    construiestePinuri(pinuriGenerate);
    construiestePinuriPret();
    harta.on('zoom', actualizeazaPinuri);
    // Și la deplasare, nu doar la zoom: coliziunile se calculează în pixeli,
    // deci se schimbă și când harta se rotește sau se trage.
    harta.on('move', actualizeazaPinuri);
    document.getElementById('harta-incarcare')?.setAttribute('hidden', '');

    if (lotInitial) {
      const c = centruLot(lotInitial.properties.id);
      if (c) {
        harta.easeTo({ center: c, zoom: 17.4, duration: redusa() ? 0 : 900 });
        deschideLot(lotInitial.properties, c);
        return;
      }
    }

    // Încadrarea reală se poate calcula abia după ce harta știe dimensiunea ecranului.
    if (slugInitial !== 'toate') {
      const p = proiectDupaSlug.get(slugInitial)!;
      harta.jumpTo(cameraPentruProiect(p));
      corecteazaIncadrare(p.hotar);
      dezvaluieLoturi();
      return;
    }

    // Intrarea pe site: pornim de la ansamblu, ca omul să vadă unde e față de
    // București, apoi coborâm spre parcelarea cu cele mai multe loturi libere.
    // Un ecran de pornire cu trei ștampile într-un câmp nu vinde nimic.
    if (redusa()) {
      const p = parcelareaPrincipala();
      harta.jumpTo(cameraPentruProiect(p));
      corecteazaIncadrare(p.hotar);
      return;
    }

    // Intrarea pornește de pe glob, de unde se vede România întreagă, și
    // coboară până pe parcelare. E singura secundă din tot site-ul în care
    // omul înțelege unde e zona față de restul țării.
    harta.jumpTo({ center: [24.6, 46.4], zoom: 2.4, pitch: 0, bearing: 0 });
    window.setTimeout(() => {
      // Dacă între timp omul a atins harta sau a schimbat filtrul, nu-i luăm
      // camera din mână.
      if (lotSelectat || modStrada || filtre.proiect !== 'toate') return;
      const principala = parcelareaPrincipala();
      harta.flyTo({
        ...cameraPentruProiect(principala),
        // Mai lung decât un zbor obișnuit, pentru că drumul e de la glob până
        // la un lot de 600 de metri pătrați. Curba mare ține camera sus la
        // mijloc, ca să nu treacă razant peste țară.
        duration: 4200,
        curve: 1.9,
        essential: false,
      });
      harta.once('moveend', () => corecteazaIncadrare(principala.hotar));
      dezvaluieLoturi(2600);
    }, 400);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inchideFisaParcelare();
      inchideLot();
    }
  });
}

porneste().catch((err) => {
  console.error('[harta]', err);
  const nod = document.getElementById('harta-incarcare');
  if (nod) nod.textContent = 'Harta nu a putut fi încărcată. Reîncarcă pagina.';
});

export {};
