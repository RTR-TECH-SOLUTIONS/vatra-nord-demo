import type { MapOptions } from 'maplibre-gl';

/** maplibre-gl nu reexportă StyleSpecification, deci îl luăm din tipul opțiunilor. */
type Style = NonNullable<MapOptions['style']>;

/**
 * Basemap-ul e singurul lucru din hartă care depinde de un furnizor extern.
 * E izolat aici tocmai ca schimbarea lui să fie o linie, nu o rescriere:
 * MapLibre acceptă la fel un URL de style sau un obiect de style.
 *
 * Sunt două moduri, amândouă desenate de noi:
 *
 * - `harta` — planșa. Un stil vectorial propriu, construit din aceleași dale
 *   OpenMapTiles pe care le folosește toată lumea, dar colorat în limbajul
 *   planului de situație: hârtie caldă, tarlale tentate, drumuri cu tuș.
 *   Nu e un stil de-a gata, tocmai ca harta să nu semene cu a nimănui.
 * - `satelit` — imaginea aeriană, gradată (desaturată și cu contrast în plus)
 *   ca poligoanele loturilor să iasă în față, plus aceleași etichete.
 *
 * Cu cheie MapTiler (PUBLIC_MAPTILER_KEY în .env) satelitul vine de la ei, cu
 * drept de uz comercial pe planul Flex. Fără cheie cade pe Esri, care e DOAR
 * pentru preview intern: ToS-ul lor nu permite uz comercial.
 */

const CHEIE = import.meta.env.PUBLIC_MAPTILER_KEY as string | undefined;
const TOKEN_MAPBOX = import.meta.env.PUBLIC_MAPBOX_TOKEN as string | undefined;

export const areCheie = Boolean(CHEIE || TOKEN_MAPBOX);
/** Mapbox cere logo-ul lor pe hartă, deci pagina trebuie să știe că e folosit. */
export const areMapbox = Boolean(TOKEN_MAPBOX);

export type ModBasemap = 'satelit' | 'harta';

export const SURSA_VECTOR = 'openmaptiles';

const ATRIBUIRE_ESRI =
  'Imagini <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics · preview intern';
const ATRIBUIRE_OSM = '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>';
const ATRIBUIRE_MAPBOX =
  '<a href="https://www.mapbox.com/about/maps/">© Mapbox</a> · imagini Maxar';

const GLIFE = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const TILE_VECTOR = 'https://tiles.openfreemap.org/planet';

/** Numele de străzi și de localități, luate din același set de date ca OSM. */
const nume = [
  'coalesce',
  ['get', 'name:ro'],
  ['get', 'name:latin'],
  ['get', 'name'],
] as unknown;

/* --------------------------------------------------------- paleta planșei */

/**
 * Culorile planșei. Pornesc din tokenii proiectului (hârtie/tuș din
 * `global.css`) și coboară spre verde-oliv doar cât să se distingă pădurea de
 * arătură. Nimic saturat: loturile sunt singurul lucru colorat de pe hartă.
 */
const P = {
  sol: '#efe9dd',
  arabil: '#e8e1d2',
  padure: '#d5dcc7',
  iarba: '#e2e6d3',
  balta: '#dde3d8',
  nisip: '#eee6d2',
  locuit: '#ebe5d9',
  industrial: '#e7e1d4',
  institutie: '#eae3d6',
  sport: '#dee5d4',
  parc: '#dbe2cd',
  apa: '#bfccd3',
  apaContur: '#a5b6bf',
  curs: '#adbec7',
  cale: '#c8bfac',
  drumTus: '#d3cabb',
  drumMiez: '#fcfbf8',
  potecaTus: '#b9ad96',
  casa: '#d8cfbd',
  casaContur: '#bdb19b',
  hotar: '#b5aa98',
  textDrum: '#4a5054',
  textLoc: '#2b3134',
  textApa: '#6d8592',
  haloClar: 'rgba(247,244,238,0.92)',
} as const;

/* --------------------------------------------------------------- etichete */

/**
 * Etichetele de drum, localitate și apă. Aceleași id-uri în ambele moduri,
 * pentru că `harta.ts` le ridică deasupra loturilor după id; se schimbă doar
 * culoarea, pentru că pe satelit textul trebuie alb cu halo negru, iar pe
 * planșă tuș cu halo de hârtie.
 */
function etichete(peSatelit: boolean) {
  const culoare = peSatelit ? '#ffffff' : P.textDrum;
  const culoareLoc = peSatelit ? '#ffffff' : P.textLoc;
  const culoareApa = peSatelit ? '#dff1ff' : P.textApa;
  const halo = (a: number) => (peSatelit ? `rgba(0,0,0,${a})` : P.haloClar);

  return [
    {
      id: 'drum-nume-principal',
      type: 'symbol' as const,
      source: SURSA_VECTOR,
      'source-layer': 'transportation_name',
      minzoom: 11.5,
      filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
      layout: {
        'symbol-placement': 'line' as const,
        'text-field': nume,
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11.5, 17, 14],
        'text-rotation-alignment': 'map' as const,
        'text-letter-spacing': 0.02,
        'symbol-spacing': 240,
      },
      paint: {
        'text-color': culoare,
        'text-halo-color': halo(0.8),
        'text-halo-width': peSatelit ? 1.6 : 1.5,
      },
    },
    {
      id: 'drum-nume-secundar',
      type: 'symbol' as const,
      source: SURSA_VECTOR,
      'source-layer': 'transportation_name',
      minzoom: 12.5,
      filter: ['match', ['get', 'class'], ['minor', 'service', 'track', 'path'], true, false],
      layout: {
        'symbol-placement': 'line' as const,
        'text-field': nume,
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10.5, 18, 13],
        'text-rotation-alignment': 'map' as const,
        'symbol-spacing': 170,
      },
      paint: {
        'text-color': culoare,
        'text-halo-color': halo(0.78),
        'text-halo-width': peSatelit ? 1.4 : 1.4,
      },
    },
    {
      id: 'loc-nume',
      type: 'symbol' as const,
      source: SURSA_VECTOR,
      'source-layer': 'place',
      filter: ['match', ['get', 'class'], ['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood'], true, false],
      layout: {
        'text-field': nume,
        'text-font': ['Noto Sans Bold'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          9, ['match', ['get', 'class'], ['city'], 15, ['town'], 13, 11],
          15, ['match', ['get', 'class'], ['city'], 22, ['town'], 18, 15],
        ],
        'text-max-width': 8,
        'text-transform': 'uppercase' as const,
        'text-letter-spacing': 0.08,
      },
      paint: {
        'text-color': culoareLoc,
        'text-halo-color': halo(0.72),
        'text-halo-width': 1.8,
      },
    },
    {
      id: 'apa-nume',
      type: 'symbol' as const,
      source: SURSA_VECTOR,
      'source-layer': 'water_name',
      minzoom: 12,
      layout: {
        'text-field': nume,
        'text-font': ['Noto Sans Italic'],
        'text-size': 13,
        'text-max-width': 6,
      },
      paint: {
        'text-color': culoareApa,
        'text-halo-color': halo(0.6),
        'text-halo-width': 1.4,
      },
    },
  ];
}

/* ---------------------------------------------------------------- planșa */

/** Lățimea drumurilor, aceeași expresie refolosită la tuș și la miez. */
function latimeDrum(spor: number) {
  return [
    'interpolate', ['exponential', 1.45], ['zoom'],
    10, ['match', ['get', 'class'], ['motorway', 'trunk'], 1.4 + spor, ['primary'], 1 + spor, 0.4 + spor],
    14, ['match', ['get', 'class'],
      ['motorway', 'trunk'], 6 + spor,
      ['primary'], 4.6 + spor,
      ['secondary'], 3.8 + spor,
      ['tertiary'], 3 + spor,
      ['minor'], 2.2 + spor,
      1.5 + spor],
    18, ['match', ['get', 'class'],
      ['motorway', 'trunk'], 26 + spor * 2,
      ['primary'], 20 + spor * 2,
      ['secondary'], 16 + spor * 2,
      ['tertiary'], 13 + spor * 2,
      ['minor'], 11 + spor * 2,
      7 + spor * 2],
  ];
}

const DRUMURI_CU_MIEZ = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service'];

/**
 * Planșa: stilul nostru de hartă. Ordinea straturilor e cea a unui plan de
 * situație desenat de mână — întâi fondul de teren, apoi apa, apoi rețeaua de
 * drumuri (tuș sub miez, ca la desenul tehnic), apoi construcțiile, la urmă
 * scrisul.
 */
function stilPlansa(): Style {
  return {
    version: 8,
    glyphs: GLIFE,
    // Globul. La zoom mic pământul se curbează, iar la apropiere MapLibre trece
    // singur pe mercator, deci parcelarea rămâne dreaptă acolo unde contează.
    projection: { type: 'globe' },
    sources: {
      [SURSA_VECTOR]: {
        type: 'vector',
        url: TILE_VECTOR,
        attribution: ATRIBUIRE_OSM,
      },
    },
    sky: {
      'sky-color': '#cfdae2',
      'horizon-color': '#eae3d6',
      'fog-color': '#ece6da',
      'sky-horizon-blend': 0.7,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.5,
    },
    layers: [
      { id: 'fundal', type: 'background', paint: { 'background-color': P.sol } },

      /* --- fondul de teren: tarlale, pădure, izlaz --- */
      {
        id: 'teren-arabil',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'farmland'],
        paint: { 'fill-color': P.arabil, 'fill-opacity': 0.9 },
      },
      {
        id: 'teren-iarba',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landcover',
        filter: ['match', ['get', 'class'], ['grass', 'wetland'], true, false],
        paint: {
          'fill-color': ['match', ['get', 'class'], 'wetland', P.balta, P.iarba],
          'fill-opacity': 0.9,
        },
      },
      {
        id: 'teren-nisip',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'sand'],
        paint: { 'fill-color': P.nisip },
      },
      {
        id: 'teren-padure',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'wood'],
        paint: { 'fill-color': P.padure, 'fill-opacity': 0.95 },
      },
      {
        id: 'teren-parc',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'park',
        paint: { 'fill-color': P.parc, 'fill-opacity': 0.6 },
      },

      /* --- folosința: sat, hale, instituții --- */
      {
        id: 'folosinta-locuit',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['residential', 'suburb', 'quarter', 'neighbourhood'], true, false],
        paint: { 'fill-color': P.locuit, 'fill-opacity': 0.85 },
      },
      {
        id: 'folosinta-industrial',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['industrial', 'commercial', 'retail', 'railway', 'quarry'], true, false],
        paint: { 'fill-color': P.industrial, 'fill-opacity': 0.9 },
      },
      {
        id: 'folosinta-institutie',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['school', 'university', 'kindergarten', 'college', 'hospital', 'cemetery'], true, false],
        paint: { 'fill-color': P.institutie, 'fill-opacity': 0.9 },
      },
      {
        id: 'folosinta-sport',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['pitch', 'playground', 'track', 'stadium'], true, false],
        paint: { 'fill-color': P.sport },
      },

      /* --- apa --- */
      {
        id: 'apa',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'fill-color': P.apa },
      },
      {
        id: 'apa-contur',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'water',
        minzoom: 11,
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: {
          'line-color': P.apaContur,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 17, 1.2],
        },
      },
      {
        id: 'curs-apa',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'waterway',
        minzoom: 11,
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
        paint: {
          'line-color': P.curs,
          'line-width': [
            'interpolate', ['exponential', 1.4], ['zoom'],
            11, ['match', ['get', 'class'], ['river'], 1.1, 0.5],
            18, ['match', ['get', 'class'], ['river'], 8, 3],
          ],
        },
      },

      /* --- calea ferată --- */
      {
        id: 'cale-ferata',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'transportation',
        minzoom: 11,
        filter: ['match', ['get', 'class'], ['rail', 'transit'], true, false],
        paint: {
          'line-color': P.cale,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 18, 2.4],
          'line-dasharray': [4, 2],
        },
      },

      /* --- drumurile: tuș dedesubt, miez de hârtie deasupra --- */
      {
        id: 'drum-tus',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'transportation',
        minzoom: 9,
        filter: [
          'all',
          ['!=', ['get', 'brunnel'], 'tunnel'],
          ['match', ['get', 'class'], DRUMURI_CU_MIEZ, true, false],
        ],
        layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
        paint: {
          'line-color': P.drumTus,
          'line-width': latimeDrum(1.1),
        },
      },
      {
        id: 'drum-miez',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'transportation',
        minzoom: 9,
        filter: [
          'all',
          ['!=', ['get', 'brunnel'], 'tunnel'],
          ['match', ['get', 'class'], DRUMURI_CU_MIEZ, true, false],
        ],
        layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
        paint: {
          'line-color': P.drumMiez,
          'line-width': latimeDrum(0),
        },
      },
      {
        id: 'drum-pamant',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['match', ['get', 'class'], ['track', 'path'], true, false],
        layout: { 'line-cap': 'butt' as const, 'line-join': 'round' as const },
        paint: {
          'line-color': P.potecaTus,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.9, 15, 1.8, 18, 4],
          'line-dasharray': [4, 2.2],
        },
      },

      /* --- construcțiile, în plan, nu în volum --- */
      {
        id: 'casa-plan',
        type: 'fill',
        source: SURSA_VECTOR,
        'source-layer': 'building',
        minzoom: 14.5,
        paint: {
          'fill-color': P.casa,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15.5, 0.95],
        },
      },
      {
        id: 'casa-plan-contur',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'building',
        minzoom: 16,
        paint: {
          'line-color': P.casaContur,
          'line-width': 0.6,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 16, 0, 16.6, 1],
        },
      },

      /* --- limita administrativă, ca pe planul de situație --- */
      {
        id: 'hotar-administrativ',
        type: 'line',
        source: SURSA_VECTOR,
        'source-layer': 'boundary',
        minzoom: 9,
        filter: ['<=', ['get', 'admin_level'], 8],
        paint: {
          'line-color': P.hotar,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 15, 1.1],
          'line-dasharray': [5, 2, 1, 2],
          'line-opacity': 0.75,
        },
      },

      ...etichete(false),
    ],
  } as unknown as Style;
}

/* --------------------------------------------------------------- satelitul */

/**
 * Sursa de imagine satelitară, în ordinea în care o vrem.
 *
 * Mapbox intră prin Raster Tiles API (`/v4/mapbox.satellite`), nu prin stilul
 * lor randat ca raster. Arată la fel, dar contorul e cu totul altul: 750.000 de
 * dale pe lună gratis în loc de 200.000, adică vreo 3.700 de vizite în loc de o
 * mie. Stratul de străzi și de denumiri rămâne al nostru, deasupra, deci nu
 * plătim de două ori pentru același ecran.
 */
function sursaSatelit() {
  if (TOKEN_MAPBOX) {
    return {
      type: 'raster' as const,
      tiles: [
        `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${TOKEN_MAPBOX}`,
      ],
      tileSize: 256,
      maxzoom: 22,
      attribution: ATRIBUIRE_MAPBOX,
    };
  }
  return {
    type: 'raster' as const,
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    maxzoom: 19,
    attribution: ATRIBUIRE_ESRI,
  };
}

/**
 * Satelitul, gradat, peste care punem drumurile discret
 * și aceleași etichete. Gradarea nu e cochetărie: imaginea brută din Ilfov e
 * verde-pe-verde, iar peste ea un lot verde „disponibil” dispare. Desaturată
 * și cu ceva contrast, fotografia rămâne credibilă și lasă culoarea loturilor
 * să fie singurul lucru saturat din cadru.
 */
function satelitFallback(): Style {
  return {
    version: 8,
    glyphs: GLIFE,
    projection: { type: 'globe' },
    sources: {
      ortofoto: sursaSatelit(),
      [SURSA_VECTOR]: {
        type: 'vector',
        url: TILE_VECTOR,
        attribution: ATRIBUIRE_OSM,
      },
    },
    // Fără cer, la înclinare mare deasupra orizontului rămâne o bandă neagră.
    sky: {
      'sky-color': '#9ec7e8',
      'horizon-color': '#e3eef6',
      'fog-color': '#dfe8ee',
      'sky-horizon-blend': 0.6,
      // Ceață mai densă spre orizont: de la nivelul solului imaginea satelitară
      // se întinde și devine pastă, iar ceața o ascunde exact acolo.
      'horizon-fog-blend': 0.85,
      'fog-ground-blend': 0.55,
    },
    layers: [
      { id: 'fundal', type: 'background', paint: { 'background-color': '#1d2126' } },
      {
        id: 'ortofoto',
        type: 'raster',
        source: 'ortofoto',
        paint: {
          'raster-opacity': 1,
          'raster-saturation': -0.28,
          'raster-contrast': 0.12,
          'raster-brightness-min': 0.04,
        },
      },
      {
        id: 'drumuri-umplere',
        type: 'line' as const,
        source: SURSA_VECTOR,
        'source-layer': 'transportation',
        minzoom: 11,
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
        paint: {
          'line-color': 'rgba(255,255,255,0.5)',
          'line-width': [
            'interpolate', ['exponential', 1.4], ['zoom'],
            11, ['match', ['get', 'class'], ['motorway', 'trunk'], 1.4, 0.4],
            15, ['match', ['get', 'class'], ['motorway', 'trunk'], 5, ['primary', 'secondary'], 3.4, ['tertiary', 'minor'], 2.2, 1.1],
            18, ['match', ['get', 'class'], ['motorway', 'trunk'], 16, ['primary', 'secondary'], 12, ['tertiary', 'minor'], 8, 4],
          ],
        },
      },
      ...etichete(true),
    ],
  } as unknown as Style;
}

export function styleBasemap(mod: ModBasemap): Style {
  if (mod === 'harta') return stilPlansa();
  // Cu token Mapbox rămânem pe stilul nostru hibrid, doar cu imaginea lor
  // dedesubt: așa plătim un singur contor, cel mai larg. Stilul gata făcut de
  // la MapTiler intră doar dacă avem cheia lor și nu avem Mapbox.
  if (TOKEN_MAPBOX) return satelitFallback();
  return CHEIE ? `https://api.maptiler.com/maps/hybrid/style.json?key=${CHEIE}` : satelitFallback();
}
