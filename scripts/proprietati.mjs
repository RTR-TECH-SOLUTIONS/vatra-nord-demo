/**
 * Portofoliul de proprietăți răzlețe.
 *
 * Nu tot ce vinde un dezvoltator mic e o parcelare cu sute de loturi. Cele mai
 * multe sunt terenuri luate una câte una, prin sate, pe care vrea doar să le
 * arate pe hartă. Astea intră ca pinuri, nu ca poligoane cu cod de lot.
 *
 * Toate stau strâns, într-un cerc de vreo 5 km în jurul celor trei parcelări.
 * Așa arată portofoliul unui dezvoltator care lucrează o zonă, nu județul
 * întreg, și așa arată și harta de referință: un ghem de semne pe câțiva
 * kilometri. Prima variantă le împrăștiase pe 30 de km, iar harta părea goală.
 *
 * Coordonatele sunt reale și verificate în browser, pe chiar straturile pe care
 * le desenează harta: niciun punct nu cade peste apă, pădure, clădire sau drum,
 * iar între oricare două sunt peste 560 m. Verificarea făcută înainte doar pe
 * way-urile din Overpass ratase cinci pinuri, pentru că multipoligoanele de apă
 * și de pădure nu apar acolo ca way simplu. Numele, stările și cifrele sunt
 * fictive, ca tot restul demo-ului.
 *
 * Marca e scrisă explicit, nu dedusă din nume: „Săftica Nord” și parcelarea
 * „Săftica” ar da aceleași litere, iar două discuri identice pe aceeași hartă
 * nu ajută pe nimeni.
 *
 * `pretMp` e prețul cerut pe metru pătrat. Se scrie pe semn, pentru că la o
 * proprietate răzleață asta e singura cifră care se compară între ele: un teren
 * arabil de patru hectare și un lot intravilan de șapte sute de metri nu au
 * prețuri totale comparabile, dar au prețuri pe metru comparabile.
 */
export const PROPRIETATI = [
  {
    id: 'saftica-nord',
    nume: 'Săftica Nord',
    marca: 'SN',
    stare: 'disponibil',
    detaliu: '1,4 ha, front 62 m la drum comunal',
    pretMp: 28,
    lng: 26.066,
    lat: 44.627094,
  },
  {
    id: 'saftica-rasarit',
    nume: 'Săftica Răsărit',
    marca: 'SR',
    stare: 'oferta',
    detaliu: '6.200 m², intravilan, livadă bătrână',
    pretMp: 42,
    lng: 26.074041,
    lat: 44.624723,
  },
  {
    id: 'saftica-vest',
    nume: 'Săftica Vest',
    marca: 'SV',
    stare: 'disponibil',
    detaliu: '3 loturi, 520-680 m², curent la limită',
    pretMp: 58,
    lng: 26.057959,
    lat: 44.624723,
  },
  {
    id: 'saftica-sola-12',
    nume: 'Săftica, sola 12',
    marca: 'S12',
    stare: 'in_curand',
    detaliu: '2,1 ha, PUZ depus în iunie 2026',
    pretMp: 22,
    lng: 26.074718,
    lat: 44.629748,
  },
  {
    id: 'petresti-nord',
    nume: 'Petrești Nord',
    marca: 'PN',
    stare: 'disponibil',
    detaliu: '2 loturi de 900 m², deschidere 22 m',
    pretMp: 52,
    lng: 26.074718,
    lat: 44.608252,
  },
  {
    id: 'petresti-islaz',
    nume: 'Petrești Islaz',
    marca: 'PI',
    stare: 'disponibil',
    detaliu: '8.900 m², acces din drumul comunal',
    pretMp: 19,
    lng: 26.066,
    lat: 44.606589,
  },
  {
    id: 'drumul-corbeanca',
    nume: 'Drumul Corbeanca',
    marca: 'DC',
    stare: 'oferta',
    detaliu: '3.400 m², la 140 m de asfalt',
    pretMp: 34,
    lng: 26.048564,
    lat: 44.619,
  },
  {
    id: 'corbeanca-est',
    nume: 'Corbeanca Est',
    marca: 'CE',
    stare: 'disponibil',
    detaliu: '4 loturi, 480-600 m²',
    pretMp: 66,
    lng: 26.0509,
    lat: 44.625205,
  },
  {
    id: 'balotesti-sud',
    nume: 'Balotești Sud',
    marca: 'BS',
    stare: 'disponibil',
    detaliu: '1.100 m², intravilan, toate utilitățile',
    pretMp: 74,
    lng: 26.088603,
    lat: 44.614422,
  },
  {
    id: 'balotesti-dn1',
    nume: 'Balotești DN1',
    marca: 'BD',
    stare: 'oferta',
    detaliu: '5.600 m², deschidere 48 m la DN1',
    pretMp: 46,
    lng: 26.084754,
    lat: 44.60892,
  },
  {
    id: 'petresti-centru',
    nume: 'Petrești Centru',
    marca: 'PC',
    stare: 'disponibil',
    detaliu: '700 m², intravilan, gaz în stradă',
    pretMp: 61,
    lng: 26.070318,
    lat: 44.602557,
  },
  {
    id: 'saftica-tarla-30',
    nume: 'Săftica, tarlaua 30',
    marca: 'T30',
    stare: 'in_curand',
    detaliu: '4 ha, dezmembrare în lucru',
    pretMp: 16,
    lng: 26.074714,
    lat: 44.639109,
  },
  {
    id: 'balotesti-nord',
    nume: 'Balotești Nord',
    marca: 'BN',
    stare: 'disponibil',
    detaliu: '5 loturi, 500-750 m²',
    pretMp: 57,
    lng: 26.082655,
    lat: 44.636387,
  },
  {
    id: 'petresti-livada',
    nume: 'Petrești Livadă',
    marca: 'PL',
    stare: 'vandut',
    detaliu: '1,1 ha, vândut în martie 2026',
    pretMp: 31,
    lng: 26.078828,
    lat: 44.60004,
  },
  {
    id: 'petresti-vest',
    nume: 'Petrești Vest',
    marca: 'PV',
    stare: 'disponibil',
    detaliu: '1,3 ha, front 48 m',
    pretMp: 27,
    lng: 26.061594,
    lat: 44.598191,
  },
  {
    id: 'ostratu-rasarit',
    nume: 'Ostratu Răsărit',
    marca: 'OR',
    stare: 'disponibil',
    detaliu: '2,6 ha arabil, front 110 m',
    pretMp: 12,
    lng: 26.037176,
    lat: 44.614317,
  },
  {
    id: 'ostratu-solele-mari',
    nume: 'Ostratu, solele mari',
    marca: 'OS',
    stare: 'vandut',
    detaliu: '6 loturi, vândute în 2025',
    pretMp: 49,
    lng: 26.036518,
    lat: 44.620573,
  },
  {
    id: 'drumul-perisului',
    nume: 'Drumul Perișului',
    marca: 'DP',
    stare: 'disponibil',
    detaliu: '1,8 ha arabil, cu scoatere din circuit începută',
    pretMp: 15,
    lng: 26.038479,
    lat: 44.626688,
  },
  {
    id: 'saftica-tarla-48',
    nume: 'Săftica, tarlaua 48',
    marca: 'T48',
    stare: 'in_curand',
    detaliu: '2,4 ha, drum de acces în execuție',
    pretMp: 18,
    lng: 26.042885,
    lat: 44.632121,
  },
  {
    id: 'campul-safticii',
    nume: 'Câmpul Săfticii',
    marca: 'CS',
    stare: 'oferta',
    detaliu: '1.500 m², la 900 m de sat',
    pretMp: 24,
    lng: 26.066,
    lat: 44.644361,
  },
];
