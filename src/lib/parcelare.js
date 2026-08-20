/**
 * Motorul de parcelare. Rulează la fel în Node (generatorul de date demo) și în
 * browser (panoul de administrare), ca să nu existe două adevăruri despre cum
 * se împarte un teren.
 *
 * Ce face diferit față de o grilă simplă de dreptunghiuri:
 *
 *  - loturile se decupează din conturul real al terenului, deci ies poligoane
 *    cu oricâte laturi, nu dreptunghiuri;
 *  - drumurile și clădirile existente se scad din teren înainte de împărțire,
 *    deci niciun lot nu cade peste o stradă sau peste o casă;
 *  - drumurile interioare ale parcelării sunt generate ca poligoane, ca să
 *    poată fi desenate, nu doar subînțelese din spațiile goale.
 */
import intersect from '@turf/intersect';
import difference from '@turf/difference';
import union from '@turf/union';
import buffer from '@turf/buffer';
import area from '@turf/area';
import simplify from '@turf/simplify';
import { featureCollection, polygon, multiPolygon, lineString } from '@turf/helpers';

const R_PAMANT = 6371008.8;
const RAD = Math.PI / 180;

/** Lățimea de gardă a fiecărui tip de drum, în metri de o parte și de alta a axei. */
export const LATIME_DRUM = {
  motorway: 14,
  trunk: 11,
  primary: 9,
  secondary: 8,
  tertiary: 7,
  minor: 5.5,
  residential: 5.5,
  unclassified: 5.5,
  service: 4,
  track: 4,
  path: 2.5,
  footway: 2.5,
};

/** Proiecție locală în metri, în jurul unui punct de referință. */
export function proiectieLocala([lon0, lat0]) {
  const kx = RAD * R_PAMANT * Math.cos(lat0 * RAD);
  const ky = RAD * R_PAMANT;
  return {
    laMetri: ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * ky],
    laWgs: ([x, y]) => [lon0 + x / kx, lat0 + y / ky],
  };
}

function centruInel(inel) {
  const pts = inel.slice(0, inel[0][0] === inel.at(-1)[0] && inel[0][1] === inel.at(-1)[1] ? -1 : undefined);
  const lon = pts.reduce((s, c) => s + c[0], 0) / pts.length;
  const lat = pts.reduce((s, c) => s + c[1], 0) / pts.length;
  return [lon, lat];
}

function inchide(inel) {
  const a = inel[0];
  const b = inel[inel.length - 1];
  return a[0] === b[0] && a[1] === b[1] ? inel : [...inel, a];
}

/** Toate poligoanele dintr-un Feature, indiferent că e Polygon sau MultiPolygon. */
function poligoane(f) {
  if (!f) return [];
  const g = f.geometry ?? f;
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  return [];
}

function caFeature(parti) {
  if (!parti.length) return null;
  return parti.length === 1 ? polygon(parti[0]) : multiPolygon(parti);
}

/**
 * Scade obstacolele din teren. Obstacolele vin ca linii (drumuri) sau poligoane
 * (clădiri, ape) și sunt îngroșate cu marja cerută înainte de scădere.
 */
export function terenDisponibil(teren, obstacole = [], marja = 3) {
  let rezultat = teren;
  for (const o of obstacole) {
    const g = o.geometry ?? o;
    let zona;
    if (g.type === 'LineString' || g.type === 'MultiLineString') {
      const latime = (LATIME_DRUM[o.properties?.clasa] ?? 5) / 2 + marja;
      zona = buffer(o, latime, { units: 'meters' });
    } else if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
      zona = buffer(o, marja, { units: 'meters' });
    } else {
      continue;
    }
    if (!zona) continue;
    const nou = difference(featureCollection([rezultat, zona]));
    if (!nou) return null;
    rezultat = nou;
  }
  return rezultat;
}

/** Reunește o listă de features într-unul singur. Util pentru obstacole. */
export function reuneste(features) {
  const valide = features.filter(Boolean);
  if (!valide.length) return null;
  return valide.reduce((acc, f) => (acc ? union(featureCollection([acc, f])) : f), null);
}

/**
 * Împarte un teren în loturi.
 *
 * @param {object} cfg
 * @param {number[][]} cfg.teren        inelul exterior al terenului, lon/lat
 * @param {object[]}  [cfg.obstacole]   drumuri și clădiri de ocolit
 * @param {number}    cfg.azimut        direcția rândurilor, grade de la nord
 * @param {number}    [cfg.front]       deschiderea țintă a unui lot, metri
 * @param {number}    [cfg.adancime]    adâncimea lotului, metri
 * @param {number}    [cfg.drumInterior] lățimea drumului dintre cele două șiruri
 * @param {number}    [cfg.drumTransversal] lățimea străzilor perpendiculare
 * @param {number}    [cfg.pasTransversal]  la câți metri se pune o stradă perpendiculară
 * @param {number}    [cfg.retragere]   retragerea față de hotar
 * @param {number}    [cfg.minSuprafata] sub această suprafață lotul se aruncă
 * @param {number}    [cfg.maxBenzi]
 * @param {number}    [cfg.marjaObstacol]
 * @param {() => number} [cfg.rnd]      sursă de variație, ca să fie determinist
 */
export function genereazaParcelare(cfg) {
  const {
    teren,
    obstacole = [],
    azimut,
    front = 18,
    adancime = 33,
    drumInterior = 8,
    drumTransversal = 8,
    pasTransversal = 170,
    retragere = 5,
    minSuprafata = 250,
    maxBenzi = Infinity,
    marjaObstacol = 3,
    rnd = () => 0.5,
  } = cfg;

  const inel = inchide(teren.map((c) => [Number(c[0]), Number(c[1])]));
  const terenFeature = polygon([inel]);
  const disponibil = terenDisponibil(terenFeature, obstacole, marjaObstacol) ?? terenFeature;

  const origine = centruInel(inel);
  const pr = proiectieLocala(origine);

  const th = azimut * RAD;
  const ux = Math.sin(th);
  const uy = Math.cos(th);
  const nx = -uy;
  const ny = ux;

  const laUV = ([lon, lat]) => {
    const [x, y] = pr.laMetri([lon, lat]);
    return [x * ux + y * uy, x * nx + y * ny];
  };
  const laLonLat = (u, v) => pr.laWgs([u * ux + v * nx, u * uy + v * ny]);

  // Întinderea terenului în reperul rândurilor.
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const parte of poligoane(disponibil)) {
    for (const p of parte[0]) {
      const [u, v] = laUV(p);
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
  }

  const dreptunghi = (u0, u1, v0, v1) =>
    polygon([[laLonLat(u0, v0), laLonLat(u1, v0), laLonLat(u1, v1), laLonLat(u0, v1), laLonLat(u0, v0)]]);

  /** Cea mai mare parte a unei intersecții. Un lot e o bucată continuă. */
  function bucataMare(f) {
    const parti = poligoane(f);
    if (parti.length <= 1) return caFeature(parti);
    let cea = null;
    let max = -1;
    for (const p of parti) {
      const a = area(polygon(p));
      if (a > max) {
        max = a;
        cea = p;
      }
    }
    return cea ? polygon(cea) : null;
  }

  /** Deschiderea la stradă: cât din lot atinge banda drumului. */
  function deschidere(lotFeature, vFront) {
    const fasie = dreptunghi(uMin - 5, uMax + 5, vFront - 0.6, vFront + 0.6);
    const taiat = intersect(featureCollection([lotFeature, fasie]));
    if (!taiat) return 0;
    let a = Infinity;
    let b = -Infinity;
    for (const parte of poligoane(taiat)) {
      for (const p of parte[0]) {
        const [u] = laUV(p);
        if (u < a) a = u;
        if (u > b) b = u;
      }
    }
    return b > a ? Math.round((b - a) * 10) / 10 : 0;
  }

  const pasBanda = 2 * adancime + drumInterior;
  const loturi = [];
  const drumuri = [];
  let banda = 0;

  // Străzile perpendiculare, care leagă drumurile dintre benzi. Fără ele o
  // parcelare arată ca o miriște tăiată în felii și randamentul iese nerealist
  // de mare: în realitate drumurile mănâncă un sfert din teren.
  const taieturi = [];
  if (drumTransversal > 0 && pasTransversal > 0) {
    const lungime = uMax - uMin - 2 * retragere;
    const nr = Math.max(0, Math.floor(lungime / pasTransversal) - 1);
    for (let k = 1; k <= nr; k += 1) {
      const centru = uMin + retragere + (lungime * k) / (nr + 1);
      taieturi.push([centru - drumTransversal / 2, centru + drumTransversal / 2]);
    }
  }
  const inTaietura = (a, b) => taieturi.some(([t0, t1]) => a < t1 && b > t0);

  for (const [t0, t1] of taieturi) {
    const fasie = intersect(featureCollection([dreptunghi(t0, t1, vMin - 2, vMax + 2), disponibil]));
    if (!fasie) continue;
    for (const parte of poligoane(fasie)) {
      if (area(polygon(parte)) > 60) drumuri.push({ banda: -1, transversal: true, inel: parte });
    }
  }

  for (let v = vMin + retragere; v + pasBanda <= vMax - retragere + pasBanda && banda < maxBenzi; v += pasBanda, banda += 1) {
    const vDrum0 = v + adancime;
    const vDrum1 = vDrum0 + drumInterior;

    // Drumul interior al benzii, decupat pe teren.
    const fasieDrum = intersect(featureCollection([dreptunghi(uMin - 2, uMax + 2, vDrum0, vDrum1), disponibil]));
    if (fasieDrum) {
      for (const parte of poligoane(fasieDrum)) {
        if (area(polygon(parte)) > 40) drumuri.push({ banda, inel: parte });
      }
    }

    for (let sir = 0; sir < 2; sir += 1) {
      const v0 = sir === 0 ? v : vDrum1;
      const v1 = v0 + adancime;
      if (v1 > vMax + adancime) break;
      // Fața lotului dă spre drumul interior.
      const vFront = sir === 0 ? v1 : v0;

      let u = uMin + retragere;
      let pozitie = 0;
      let ghid = 0;
      while (u < uMax - retragere && ghid < 4000) {
        ghid += 1;
        const latime = front * (1 + (rnd() - 0.5) * 0.1);
        let u1 = u + latime;
        // Dacă lotul ar călca pe o stradă perpendiculară, sărim peste ea.
        const taietura = taieturi.find(([t0, t1]) => u < t1 && u1 > t0);
        if (taietura) {
          if (u < taietura[0] && taietura[0] - u > front * 0.55) {
            u1 = taietura[0];
          } else {
            u = taietura[1];
            continue;
          }
        }
        if (inTaietura(u, u1)) {
          u = u1;
          continue;
        }
        const brut = intersect(featureCollection([dreptunghi(u, u1, v0, v1), disponibil]));
        const lot = brut ? bucataMare(brut) : null;
        if (lot) {
          const supr = area(lot);
          if (supr >= minSuprafata) {
            loturi.push({
              banda,
              sir,
              pozitie,
              u: (u + u1) / 2,
              suprafata: Math.round(supr),
              front: deschidere(lot, vFront) || Math.round(latime * 10) / 10,
              inel: lot.geometry.coordinates[0].map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]),
              laturi: lot.geometry.coordinates[0].length - 1,
            });
            pozitie += 1;
          }
        }
        u = u1;
      }
    }
  }

  const suprafataTeren = area(terenFeature);
  const suprafataLoturi = loturi.reduce((s, l) => s + l.suprafata, 0);

  return {
    loturi,
    drumuri,
    terenDisponibil: disponibil,
    statistici: {
      benzi: banda,
      loturi: loturi.length,
      teren_ha: +(suprafataTeren / 1e4).toFixed(2),
      vandabil_ha: +(suprafataLoturi / 1e4).toFixed(2),
      randament: suprafataTeren ? +((suprafataLoturi / suprafataTeren) * 100).toFixed(1) : 0,
      laturi_max: loturi.reduce((m, l) => Math.max(m, l.laturi), 0),
      neregulate: loturi.filter((l) => l.laturi > 4).length,
    },
  };
}


/* ------------------------------------------------- operații pe loturi, manual */

/**
 * Taie un lot cu o linie. Linia trebuie să traverseze lotul dintr-o latură în
 * alta; altfel taie doar o bucată și rezultatul rămâne un singur poligon.
 *
 * Nu există o operație „split polygon by line" în turf, așa că îngroșăm linia
 * cu câțiva centimetri și o scădem: rezultatul e un MultiPolygon cu bucățile.
 *
 * @param {number[][]} inelLot   inelul lotului, lon/lat
 * @param {number[][]} linie     traseul tăieturii, lon/lat, minimum două puncte
 * @param {number} [grosime]     lățimea tăieturii în metri
 * @returns {number[][][]|null}  inelele rezultate, sau null dacă nu s-a tăiat
 */
export function imparteLot(inelLot, linie, grosime = 0.15) {
  if (!Array.isArray(linie) || linie.length < 2) return null;
  const lot = polygon([inchide(inelLot)]);
  const taietura = buffer(lineString(linie), grosime, { units: 'meters' });
  if (!taietura) return null;
  const rest = difference(featureCollection([lot, taietura]));
  const parti = poligoane(rest).filter((p) => area(polygon(p)) > 5);
  if (parti.length < 2) return null;
  return parti.map((p) => p[0]);
}

/**
 * Unește două loturi. Merge doar dacă se ating; altfel ar ieși un lot din două
 * bucăți separate, ceea ce nu e un lot.
 *
 * @returns {number[][]|null} inelul rezultat, sau null dacă nu sunt alăturate
 */
export function unesteLoturi(inelA, inelB, toleranta = 0.3) {
  const a = polygon([inchide(inelA)]);
  const b = polygon([inchide(inelB)]);

  const direct = union(featureCollection([a, b]));
  if (poligoane(direct).length === 1) return poligoane(direct)[0][0];

  // Loturile pot fi despărțite de câțiva centimetri, de exemplu după o
  // împărțire. Le îngroșăm, le unim, apoi dăm grosimea înapoi.
  const gros = union(
    featureCollection([
      buffer(a, toleranta, { units: 'meters' }),
      buffer(b, toleranta, { units: 'meters' }),
    ]),
  );
  if (!gros || poligoane(gros).length !== 1) return null;
  const subtire = buffer(gros, -toleranta, { units: 'meters' });
  const parti = poligoane(subtire);
  if (parti.length !== 1) return null;
  // Îngroșarea rotunjește colțurile și lasă zeci de puncte pe arce. Un lot are
  // câteva laturi drepte, deci curățăm punctele aproape coliniare.
  const curat = simplify(polygon(parti[0]), { tolerance: 0.000004, highQuality: true });
  const rezultatCurat = poligoane(curat);
  return rezultatCurat.length === 1 ? rezultatCurat[0][0] : parti[0][0];
}

/** Suprafața unui inel, în metri pătrați. */
export function suprafataInel(inel) {
  return Math.round(area(polygon([inchide(inel)])));
}

/**
 * Deschiderea unui lot desenat manual: latura cea mai apropiată de un drum dat.
 * Fără un drum de referință, întoarce cea mai scurtă latură, care e aproximarea
 * uzuală pentru un lot dreptunghiular.
 */
export function deschidereInel(inel) {
  const puncte = inchide(inel);
  const pr = proiectieLocala(centruInel(puncte));
  let minim = Infinity;
  for (let i = 0; i < puncte.length - 1; i += 1) {
    const a = pr.laMetri(puncte[i]);
    const b = pr.laMetri(puncte[i + 1]);
    minim = Math.min(minim, Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return Number.isFinite(minim) ? Math.round(minim * 10) / 10 : 0;
}

/** Retrageri uzuale în Ilfov pentru locuințe individuale, în metri. */
export const RETRAGERI = { fata: 3, spate: 5, lateral: 3 };

/** Înălțimea aproximativă a unei case, după regimul de înălțime. */
export function inaltimeRegim(regim = '') {
  const r = regim.toUpperCase().replace(/\s/g, '');
  if (r.includes('P+2')) return 10.5;
  if (r.includes('P+1') && r.includes('M')) return 9;
  if (r.includes('P+1')) return 7.5;
  if (r.includes('P+M')) return 6;
  return 4;
}

/**
 * Suprafața edificabilă: ce rămâne din lot după retragerile obligatorii.
 * Se lucrează în reperul frontului, pentru că retragerea față de stradă, cea
 * din spate și cele laterale sunt diferite.
 *
 * @param {number[][]} inel        conturul lotului, lon/lat
 * @param {number} azimutSpreLot   direcția dinspre stradă către lot, grade
 * @param {object} [retrageri]
 * @returns {{inel: number[][], suprafata: number}|null}
 */
export function edificabilLot(inel, azimutSpreLot, retrageri = RETRAGERI) {
  const puncte = inchide(inel.map((c) => [Number(c[0]), Number(c[1])]));
  const lot = polygon([puncte]);
  const pr = proiectieLocala(centruInel(puncte));

  const th = (azimutSpreLot * RAD);
  // v pe direcția dinspre stradă spre lot, u de-a lungul frontului
  const vx = Math.sin(th);
  const vy = Math.cos(th);
  const ux = vy;
  const uy = -vx;

  const laUV = ([lon, lat]) => {
    const [x, y] = pr.laMetri([lon, lat]);
    return [x * ux + y * uy, x * vx + y * vy];
  };
  const laLonLat = (u, v) => pr.laWgs([u * ux + v * vx, u * uy + v * vy]);

  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const p of puncte) {
    const [u, v] = laUV(p);
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }

  const u0 = uMin + retrageri.lateral;
  const u1 = uMax - retrageri.lateral;
  const v0 = vMin + retrageri.fata;
  const v1 = vMax - retrageri.spate;
  if (u1 - u0 < 2 || v1 - v0 < 2) return null;

  const cadru = polygon([[laLonLat(u0, v0), laLonLat(u1, v0), laLonLat(u1, v1), laLonLat(u0, v1), laLonLat(u0, v0)]]);
  const taiat = intersect(featureCollection([lot, cadru]));
  const parti = poligoane(taiat);
  if (!parti.length) return null;
  let cea = parti[0];
  let max = -1;
  for (const p of parti) {
    const a = area(polygon(p));
    if (a > max) { max = a; cea = p; }
  }

  // Dimensiunile utile: cât de lată și cât de adâncă poate fi casa. Ăsta e
  // numărul pe care cumpărătorul îl caută și nu îl găsește nicăieri.
  let lu0 = Infinity, lu1 = -Infinity, lv0 = Infinity, lv1 = -Infinity;
  for (const c of cea[0]) {
    const [u, v] = laUV(c);
    if (u < lu0) lu0 = u;
    if (u > lu1) lu1 = u;
    if (v < lv0) lv0 = v;
    if (v > lv1) lv1 = v;
  }

  return {
    inel: cea[0],
    suprafata: Math.round(area(polygon(cea))),
    latime: Math.round((lu1 - lu0) * 10) / 10,
    adancime: Math.round((lv1 - lv0) * 10) / 10,
    laWgs: (u, v) => laLonLat(lu0 + u, lv0 + v),
  };
}

/**
 * Silueta casei maxime: dreptunghiul care încape în edificabil și respectă
 * amprenta din POT. Se așază lipit de retragerea din față, cum se construiește
 * în realitate, ca să rămână curte în spate.
 */
export function silueta(edificabil, amprentaMaxima) {
  if (!edificabil || amprentaMaxima <= 0) return null;
  const { latime, adancime } = edificabil;
  let l = latime;
  let a = amprentaMaxima / l;
  if (a > adancime) {
    a = adancime;
    l = Math.min(latime, amprentaMaxima / a);
  }
  const marginel = (latime - l) / 2;
  const inel = [
    edificabil.laWgs(marginel, 0),
    edificabil.laWgs(marginel + l, 0),
    edificabil.laWgs(marginel + l, a),
    edificabil.laWgs(marginel, a),
  ];
  return {
    inel: [...inel, inel[0]],
    latime: Math.round(l * 10) / 10,
    adancime: Math.round(a * 10) / 10,
    suprafata: Math.round(l * a),
  };
}

/**
 * Ce se poate construi pe un lot. Amprenta maximă e minimul dintre limita din
 * POT și cât încape geometric între retrageri; care dintre ele leagă e
 * informația care contează pentru cumpărător, pentru că pe loturile înguste
 * POT-ul nu se poate atinge niciodată.
 */
export function potentialConstruire(suprafata, { pot, cut, regim }, suprafataEdificabila = null) {
  const dinPot = Math.round((suprafata * pot) / 100);
  const amprenta = suprafataEdificabila === null ? dinPot : Math.min(dinPot, suprafataEdificabila);
  const leaga = suprafataEdificabila !== null && suprafataEdificabila < dinPot ? 'retragerile' : 'POT';
  const desfasurata = Math.round(suprafata * cut);
  const niveluri = amprenta > 0 ? Math.max(1, Math.round(desfasurata / amprenta)) : 1;
  return {
    amprenta,
    dinPot,
    edificabil: suprafataEdificabila,
    leaga,
    desfasurata,
    niveluri,
    regim,
    inaltime: inaltimeRegim(regim),
  };
}


/** Cele opt sectoare de busolă, pentru orientarea lotului. */
const SECTOARE = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-vest', 'vest', 'nord-vest'];

export function sector(azimut) {
  return SECTOARE[Math.round((((azimut % 360) + 360) % 360) / 45) % 8];
}

/**
 * Unde dă strada și unde cade curtea din spate. E întrebarea pusă pe forumuri
 * la care nu răspunde niciun anunț, și e singurul lucru care diferențiază două
 * loturi cu aceeași suprafață și același preț.
 */
export function orientare(azimutSpreLot) {
  const spreStrada = (azimutSpreLot + 180) % 360;
  const curte = azimutSpreLot % 360;
  const s = sector(spreStrada);
  const c = sector(curte);
  const comentarii = {
    sud: 'curte însorită toată ziua',
    'sud-est': 'soare de dimineață și până după-amiaza în curte',
    'sud-vest': 'soare de după-amiază pe terasă',
    est: 'soare de dimineață în curte',
    vest: 'soare de după-amiază, se încălzește vara',
    nord: 'curte la umbră cea mai mare parte a zilei',
    'nord-est': 'curte răcoroasă, soare doar dimineața',
    'nord-vest': 'curte răcoroasă, soare spre seară',
  };
  return { strada: s, curte: c, comentariu: comentarii[c] ?? '' };
}
