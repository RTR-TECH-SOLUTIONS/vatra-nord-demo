import { Map as MapLibre, Marker, Popup, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl';
import type { MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cale } from '../lib/cale';

// Workerul e copiat în public/maplibre de scripts/copiaza-worker.mjs. Fără asta
// MapLibre îl caută lângă propriul modul, pe care Vite îl mută, iar sursele
// GeoJSON rămân goale fără nicio eroare în consolă.
setWorkerUrl(cale('/maplibre/maplibre-gl-worker.mjs'));

import { STATUSURI, ORDINE_STATUS, euro, mp, ml, dataRo } from '../lib/loturi';
import type { Proiect, ProprietatiLot, StatusLot } from '../lib/loturi';
import { styleBasemap, SURSA_VECTOR, type ModBasemap } from '../lib/basemap';
import { aplica as aplicaModificari, citeste as citesteDepozit, numaraModificari } from '../lib/depozit';
import { edificabilLot, potentialConstruire, silueta } from '../lib/parcelare.js';
import { elementPin, marcaDinNume, STARI_PIN, type Pin } from '../lib/pin';
import { FIRMA } from '../lib/firma';

type ColectieLoturi = GeoJSON.FeatureCollection<GeoJSON.Polygon, ProprietatiLot>;

// Serverul de glife (OpenFreeMap sau MapTiler) servește familia Noto Sans;
// fontul implicit al specificației, Open Sans, dă 404 pe amândouă.
const FONT_ETICHETA = ['Noto Sans Bold'];

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
  satelit: { disponibil: 0.78, rezervat: 0.7, in_pregatire: 0.5, vandut: 0.36 },
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
let modBasemap: ModBasemap = 'satelit';
let lotSelectat: string | null = null;
let poiVizibil = false;
let straturiPuse = false;
/** Vederea de la nivelul solului, pornită de pe un lot. */
let modStrada: string | null = null;
let parcelareaDinStrada: string | null = null;
let secventa = 0;
let ceasPagina: number | null = null;

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

  // Codurile stau pe un singur strat, deci filtrul lui e reuniunea stărilor
  // bifate. Fără asta ar rămâne scrise codurile loturilor tocmai stinse.
  if (harta.getLayer('loturi-cod')) {
    const active = ORDINE_STATUS.filter((s) => filtre.statusuri.has(s));
    harta.setFilter(
      'loturi-cod',
      (active.length
        ? ['any', ...active.map((s) => expresieFiltru(s))]
        : ['==', ['get', 'id'], '__niciunul__']) as never,
    );
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
}

/* ----------------------------------------------------------------- straturi */

function adaugaStraturi() {
  if (harta.getSource(SURSA)) return;

  // Pe hârtie scrisul e tuș cu halo deschis, pe fotografie e alb cu halo
  // închis. Aceleași straturi, două regimuri de lizibilitate.
  const pePlansa = modBasemap === 'harta';
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
  harta.addLayer({
    id: 'hotar-fond',
    type: 'fill',
    source: 'hotare',
    minzoom: 11.5,
    paint: {
      'fill-color': pePlansa ? '#e3dac8' : '#f4f1ea',
      'fill-opacity': pePlansa ? 0.9 : 0.12,
    },
  });
  harta.addLayer({
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
    harta.addLayer({
      id: idFill(s),
      type: 'fill',
      source: SURSA,
      paint: { 'fill-color': cfg.culoare, 'fill-opacity': opacitateFill(s, pragDezvaluire) as never },
      filter: expresieFiltru(s) as never,
    });
    harta.addLayer({
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

  // Codul lotului, scris pe lot. Fără el grila e un mozaic colorat; cu el
  // devine planșă de parcelare, iar omul poate spune la telefon „D8”, nu
  // „al treilea de sus”.
  harta.addLayer({
    id: 'loturi-cod',
    type: 'symbol',
    source: SURSA,
    minzoom: 15.2,
    layout: {
      'text-field': ['get', 'cod'],
      'text-font': FONT_ETICHETA,
      'text-size': ['interpolate', ['linear'], ['zoom'], 15.2, 8.5, 19, 14],
      'text-padding': 3,
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': modBasemap === 'harta' ? '#2b3134' : '#ffffff',
      'text-halo-color': modBasemap === 'harta' ? 'rgba(247,244,238,0.85)' : 'rgba(0,0,0,0.55)',
      'text-halo-width': 1.1,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 15.2, 0, 15.8, 1],
    },
  });

  // Drumurile parcelării, generate de motor odată cu loturile. Le desenăm ca
  // suprafață, nu ca simplu gol între rânduri: se vede că e o stradă.
  harta.addSource('drumuri-parcelare', { type: 'geojson', data: cale('/date/drumuri.geojson') });
  harta.addLayer({
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
  harta.addLayer({
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
  if (modBasemap === 'satelit' && harta.getSource(SURSA_VECTOR)) {
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

function fisaLot(p: ProprietatiLot): string {
  const proiect = proiectDupaSlug.get(p.proiect);
  const cfg = STATUSURI[p.status];
  const randuri: [string, string][] = [
    ['Suprafață', mp(p.suprafata)],
    ['Deschidere', ml(p.front)],
    ['Preț', euro(p.pret_total)],
    ['Preț pe m²', `${euro(p.pret_mp)}/m²`],
  ];

  return `
    <div class="fisa-lot">
      <div class="fisa-lot__cap">
        <div>
          <p class="fisa-lot__cod">Lotul ${p.cod}</p>
          <p class="fisa-lot__proiect">${proiect ? `${proiect.nume}, ${proiect.localitate}` : p.proiect}</p>
        </div>
        <span class="fisa-lot__status" style="--c: ${cfg.culoare}">${cfg.eticheta}</span>
      </div>
      <dl class="fisa-lot__date cifre">
        ${randuri.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
      ${p.observatii ? `<p class="fisa-lot__nota">${p.observatii}</p>` : ''}
      <p class="fisa-lot__tva">Prețul nu conține TVA. Actualizat ${dataRo(p.actualizat)}.</p>
      <div class="fisa-lot__actiuni">
        <a class="buton buton-primar" href="${cale(`/lot/${p.id}`)}">Vezi pagina lotului</a>
        <div class="fisa-lot__secundare">
          <a class="buton buton-secundar" href="tel:+40722000000">Sună</a>
          <button class="buton buton-secundar" type="button" data-copiaza="${p.id}">Copiază linkul</button>
        </div>
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

  // Coborârea pornește prima, ca fișa să știe de la început că e afișată în
  // modul de la stradă și să apară ca panou fix, nu ca popup ancorat.
  coboaraLaStrada(p, coord);

  const html = fisaLot(p);
  popup?.remove();
  popup = null;

  if (esteMobil() || modStrada) {
    if (cardMobil) {
      cardMobil.innerHTML = `<button class="card-lot__inchide" type="button" aria-label="Închide">×</button>${html}`;
      cardMobil.hidden = false;
      cardMobil.querySelector('.card-lot__inchide')?.addEventListener('click', inchideLot);
      legaCopiere(cardMobil);
    }
  } else {
    if (cardMobil) cardMobil.hidden = true;
    popup = new Popup({ maxWidth: '320px', offset: 12, closeButton: true, closeOnClick: false })
      .setLngLat(coord)
      .setHTML(html)
      .addTo(harta);
    popup.on('close', () => {
      lotSelectat = null;
      harta.setFilter('lot-selectat', ['==', ['get', 'id'], '__niciunul__'] as never);
    });
    const nod = popup.getElement();
    if (nod) legaCopiere(nod);
  }

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
  const url = new URL(window.location.href);
  url.searchParams.delete('lot');
  history.replaceState(null, '', url);
}

function legaCopiere(radacina: HTMLElement) {
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
  const latime = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w'), 10) || 340;
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
    zoom: Math.min(Math.max(zoom, 12), 17),
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
  const normala = proiect?.azimutNormala ?? 0;
  const spreStrada = p.sir === 0 ? normala : (normala + 180) % 360;
  return {
    center: centru,
    zoom: 19.3,
    pitch: 74,
    bearing: (spreStrada + 180) % 360,
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
    programeazaPagina(p, al);
  }, 1150);
}

/**
 * Coborârea se termină pe pagina lotului. Lăsăm o pauză la nivelul solului, ca
 * să se vadă unde e, și o portiță de anulare pentru cine vrea doar să compare
 * loturi pe hartă.
 */
function programeazaPagina(p: ProprietatiLot, al: number) {
  const bara = el('bara-strada');
  bara?.classList.add('bara-strada--pleaca');
  const stare = el('bara-strada-stare');
  if (stare) stare.textContent = 'Se deschide pagina lotului…';

  ceasPagina = window.setTimeout(() => {
    if (al !== secventa) return;
    window.location.href = cale(`/lot/${p.id}`);
  }, 3100);
}

function anuleazaPagina() {
  if (ceasPagina !== null) {
    window.clearTimeout(ceasPagina);
    ceasPagina = null;
  }
  el('bara-strada')?.classList.remove('bara-strada--pleaca');
  const stare = el('bara-strada-stare');
  if (stare) stare.textContent = '';
}

/** Volumul casei maxime pentru lotul deschis, calculat în browser. */
function aratConstruibil(p: ProprietatiLot) {
  const proiect = proiectDupaSlug.get(p.proiect);
  const lot = loturi.features.find((f) => f.properties.id === p.id);
  if (!proiect || !lot) return;

  const azimutSpreLot = p.sir === 0 ? (proiect.azimutNormala + 180) % 360 : proiect.azimutNormala;
  const edificabil = edificabilLot(lot.geometry.coordinates[0], azimutSpreLot);
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
  anuleazaPagina();
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
  harta.setStyle(styleBasemap(mod));
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

  legaInterval('pret', (min, max) => {
    filtre.pretMin = min;
    filtre.pretMax = max;
    aplicaFiltre();
  }, (v) => euro(v));

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

  el<HTMLButtonElement>('ramai-pe-harta')?.addEventListener('click', anuleazaPagina);

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
  const pret = set.map((f) => f.properties.pret_total);
  const cadru = (vals: number[], pas: number) => {
    const min = Math.floor(Math.min(...vals) / pas) * pas;
    const max = Math.ceil(Math.max(...vals) / pas) * pas;
    return [min, max] as const;
  };
  const [sMin, sMax] = cadru(sup, 10);
  const [pMin, pMax] = cadru(pret, 1000);

  const aplica = (prefix: string, min: number, max: number, pas: number) => {
    const jos = el<HTMLInputElement>(`${prefix}-min`);
    const sus = el<HTMLInputElement>(`${prefix}-max`);
    if (!jos || !sus) return;
    for (const inp of [jos, sus]) {
      inp.min = String(min);
      inp.max = String(max);
      inp.step = String(pas);
    }
    jos.value = String(min);
    sus.value = String(max);
    (jos as HTMLInputElement & { _reset?: () => void })._reset?.();
  };

  aplica('sup', sMin, sMax, 10);
  aplica('pret', pMin, pMax, 1000);

  filtre.supMin = sMin;
  filtre.supMax = sMax;
  filtre.pretMin = pMin;
  filtre.pretMax = pMax;
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
    const pin: Pin = {
      id: `parcelare:${p.slug}`,
      nume: p.nume,
      marca: marcaDinNume(p.nume),
      stare: libere > 0 ? 'disponibil' : 'vandut',
      detaliu: libere > 0 ? `${libere} loturi libere` : 'toate loturile vândute',
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
    const proiect = intrare.slug ? proiectDupaSlug.get(intrare.slug) : null;
    const nod = elementPin(intrare.pin, {
      subMarca: proiect ? `${proiect.statistici.disponibile} loturi` : null,
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
  pune('cp-pret', `de la ${euro(st.pret_total_min)} + TVA`);
  pune('cp-descriere', proiect.descriere[0] ?? '');

  const ul = el('cp-utilitati');
  if (ul) {
    ul.innerHTML = proiect.utilitati
      .map((u) => {
        const gata = u.stare === 'la lot' ? 'da' : 'nu';
        return `<li data-gata="${gata}"><b>${u.tip}</b><span>${u.stare}${u.detaliu ? ` · ${u.detaliu}` : ''}</span></li>`;
      })
      .join('');
  }

  // Cele mai ieftine loturi libere: e prima întrebare, iar la 213 loturi o
  // listă întreagă în fișă n-ar ajuta pe nimeni.
  const lista = el('cp-loturi');
  if (lista) {
    const ieftine = loturi.features
      .filter((f) => f.properties.proiect === slug && f.properties.status === 'disponibil')
      .sort((a, b) => a.properties.pret_total - b.properties.pret_total)
      .slice(0, 8);
    lista.innerHTML = ieftine
      .map(
        (f) =>
          `<li><button type="button" data-lot="${f.properties.id}">${f.properties.cod} <em>${euro(f.properties.pret_total)}</em></button></li>`,
      )
      .join('');
    for (const b of lista.querySelectorAll<HTMLButtonElement>('[data-lot]')) {
      b.addEventListener('click', () => {
        const id = b.dataset.lot!;
        const f = loturi.features.find((x) => x.properties.id === id);
        const c = centruLot(id);
        if (!f || !c) return;
        inchideFisaParcelare();
        alegeParcelare(slug);
        window.setTimeout(() => deschideLot(f.properties, c), 1500);
      });
    }
  }

  const pagina = el<HTMLAnchorElement>('cp-pagina');
  if (pagina) pagina.href = cale(`/parcelari/${slug}`);

  card.hidden = false;
  card.scrollTop = 0;
  marcheazaFisa(true);
}

/** Cutia pe care o ocupă un pin pe ecran, după cât din el e afișat. */
function cutiaPin(x: number, y: number, forma: 'plin' | 'fara-nume' | 'mic') {
  const dim =
    forma === 'plin'
      ? { l: 148, i: 92 }
      : forma === 'fara-nume'
        ? { l: 96, i: 76 }
        : { l: 36, i: 44 };
  return { s: x - dim.l / 2, d: x + dim.l / 2, sus: y - dim.i, jos: y };
}

type Cutie = ReturnType<typeof cutiaPin>;

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
  if (!pinuri.length) return;
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
    style: styleBasemap(modBasemap),
    center: camera.center,
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: redusa() ? 0 : camera.pitch,
    maxPitch: 80,
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
    harta.on('zoom', actualizeazaPinuri);
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
