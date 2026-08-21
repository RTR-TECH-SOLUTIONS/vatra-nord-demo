/**
 * Planul unui lot, desenat vectorial.
 *
 * Înlocuiește decupajul din imaginea satelitară. Peste un câmp arabil din
 * Ilfov, satelitul nu are destui pixeli pe metru: mărit pe un lot de douăzeci
 * pe treizeci de metri iese o pată verde neclară, adică exact opusul unei
 * planșe. Desenul spune în schimb tot ce contează și rămâne clar la orice
 * mărime: forma reală a lotului, unde e strada, cât se retrage construcția și
 * ce casă încape între retrageri.
 *
 * Referința din piață pune aici un dreptunghi generic, același pentru toate
 * loturile. Aici fiecare lot își are conturul lui, măsurat.
 */
import { proiectieLocala } from './parcelare.js';

export interface OptiuniPlan {
  /** Inelul lotului, lon/lat. */
  inel: [number, number][];
  /** Direcția dinspre lot spre stradă, grade de la nord. */
  azimutStrada: number;
  edificabil?: [number, number][] | null;
  casa?: [number, number][] | null;
  /**
   * Loturile vecine, desenate stins în spate. Cu ele planul răspunde și la
   * „unde e lotul în parcelare”, întrebare pe care fișa de referință o lasă
   * complet fără răspuns. Tot ele dau desenului proporția bună: un lot singur,
   * de douăzeci pe treizeci și opt de metri, e o fâșie într-o casetă lată.
   */
  vecini?: { inel: [number, number][]; culoare: string; contur: string }[];
  latime?: number;
  inaltime?: number;
  culoare?: string;
  contur?: string;
  /** Cotele scrise pe desen. Fără ele planul rămâne o siluetă. */
  deschidere?: string | null;
  adancime?: string | null;
  strada?: string | null;
  /** Varianta mică, pentru fișa de pe hartă: fără cote, fără roza vânturilor. */
  compact?: boolean;
}

const rad = Math.PI / 180;

function centru(inel: [number, number][]): [number, number] {
  const pts = inel.slice(0, -1).length ? inel.slice(0, -1) : inel;
  return [
    pts.reduce((s, c) => s + c[0], 0) / pts.length,
    pts.reduce((s, c) => s + c[1], 0) / pts.length,
  ];
}

export function planLot(o: OptiuniPlan): string {
  const W = o.latime ?? 300;
  const compact = o.compact ?? false;
  const culoare = o.culoare ?? '#2f8f57';
  const contur = o.contur ?? '#1d5c37';

  const pr = proiectieLocala(centru(o.inel));
  const az = o.azimutStrada * rad;
  // `t` arată spre stradă, `n` e perpendiculara. Desenul se așază pe ele, ca
  // strada să cadă mereu jos, oricum ar fi orientat lotul pe glob.
  const t: [number, number] = [Math.sin(az), Math.cos(az)];
  const n: [number, number] = [Math.cos(az), -Math.sin(az)];
  const laPlan = (c: [number, number]): [number, number] => {
    const [x, y] = pr.laMetri(c);
    return [x * n[0] + y * n[1], x * t[0] + y * t[1]];
  };

  let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
  const masoara = (inel: [number, number][]) => {
    for (const c of inel) {
      const [a, b] = laPlan(c);
      if (a < aMin) aMin = a;
      if (a > aMax) aMax = a;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
    }
  };
  masoara(o.inel);
  const lotA: [number, number] = [aMin, aMax];
  const lotB: [number, number] = [bMin, bMax];
  for (const v of o.vecini ?? []) masoara(v.inel);

  const margine = compact ? 12 : 30;
  const banda = compact ? 16 : 26;
  const gol = compact ? 5 : 24;
  const jos = compact ? 6 : 26;
  const utilL = W - 2 * margine;
  const latimeReala = aMax - aMin || 1;
  const inaltimeReala = bMax - bMin || 1;

  // Fără înălțime dată, caseta se strânge pe desen. Altfel o fâșie lată de
  // parcelare lasă sub ea un sfert de casetă gol, ceea ce arată a greșeală.
  let H = o.inaltime ?? 0;
  let scara: number;
  if (H > 0) {
    scara = Math.min(utilL / latimeReala, (H - margine - banda - gol - jos) / inaltimeReala);
  } else {
    scara = utilL / latimeReala;
    H = Math.round(margine + inaltimeReala * scara + gol + banda + jos);
    const plafon = compact ? 320 : 560;
    if (H > plafon) {
      H = plafon;
      scara = Math.min(scara, (H - margine - banda - gol - jos) / inaltimeReala);
    }
  }
  const utilI = H - margine - banda - gol - jos;
  const latDesen = (aMax - aMin) * scara;
  const inaltDesen = (bMax - bMin) * scara;
  const x0 = (W - latDesen) / 2;
  const y0 = margine + (utilI - inaltDesen) / 2;

  const laPixel = ([a, b]: [number, number]) =>
    `${(x0 + (a - aMin) * scara).toFixed(1)},${(y0 + (b - bMin) * scara).toFixed(1)}`;
  const poligon = (inel: [number, number][]) => inel.map((c) => laPixel(laPlan(c))).join(' ');

  const yStrada = y0 + inaltDesen;
  // Cotele se scriu pe lotul în cauză, nu pe tot desenul: cu vecinii în cadru,
  // lățimea desenului e a parcelării, nu deschiderea lotului.
  const xLot0 = x0 + (lotA[0] - aMin) * scara;
  const xLot1 = x0 + (lotA[1] - aMin) * scara;
  const yLot0 = y0 + (lotB[0] - bMin) * scara;
  const yLot1 = y0 + (lotB[1] - bMin) * scara;
  const parti: string[] = [];

  // Banda de stradă, sub lot. Fără ea desenul e un poligon plutind în alb și
  // nu se înțelege pe ce latură dai cu mașina.
  const yBanda = yStrada + gol;
  parti.push(
    `<rect x="0" y="${yBanda.toFixed(1)}" width="${W}" height="${banda}" fill="#ddd6c6" />`,
    `<line x1="0" y1="${yBanda.toFixed(1)}" x2="${W}" y2="${yBanda.toFixed(1)}" stroke="#b9ae97" stroke-width="1" />`,
  );
  if (o.strada && !compact) {
    parti.push(
      `<text class="plan-lot__adnotare" x="${W / 2}" y="${(yBanda + banda / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#6b6353" letter-spacing="0.02em">${o.strada}</text>`,
    );
  }

  for (const v of o.vecini ?? []) {
    parti.push(
      `<polygon points="${poligon(v.inel)}" fill="${v.culoare}" fill-opacity="0.14" stroke="${v.contur}" stroke-opacity="0.4" stroke-width="1" stroke-linejoin="round" />`,
    );
  }

  parti.push(
    `<polygon points="${poligon(o.inel)}" fill="${culoare}" fill-opacity="0.34" stroke="${contur}" stroke-width="2" stroke-linejoin="round" />`,
  );

  if (o.edificabil?.length) {
    parti.push(
      `<polygon points="${poligon(o.edificabil)}" fill="none" stroke="${contur}" stroke-opacity="0.7" stroke-width="1" stroke-dasharray="4 3" />`,
    );
  }
  if (o.casa?.length) {
    parti.push(
      `<polygon points="${poligon(o.casa)}" fill="#15181a" fill-opacity="0.72" stroke="#15181a" stroke-width="1" />`,
    );
  }

  if (!compact) {
    // Cotele și roza vânturilor intră într-un grup propriu: pe ecran îngust
    // desenul se micșorează până când scrisul de pe el nu se mai citește, iar
    // atunci grupul se stinge din CSS. Cifrele oricum sunt scrise sub desen.
    parti.push('<g class="plan-lot__adnotari">');
    // Cota deschiderii, sub latura dinspre stradă: e cifra pe care o cere
    // primul telefon, „cât are la drum”.
    if (o.deschidere) {
      const y = yLot1 + gol / 2;
      const mij = (xLot0 + xLot1) / 2;
      // Caseta se croiește pe text, altfel linia de cotă trece prin cuvinte.
      const latEtich = Math.round(o.deschidere.length * 6.7 + 14);
      parti.push(
        `<line x1="${xLot0.toFixed(1)}" y1="${y.toFixed(1)}" x2="${xLot1.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#8a9095" stroke-width="1" />`,
        `<line x1="${xLot0.toFixed(1)}" y1="${(y - 4).toFixed(1)}" x2="${xLot0.toFixed(1)}" y2="${(y + 4).toFixed(1)}" stroke="#8a9095" stroke-width="1" />`,
        `<line x1="${xLot1.toFixed(1)}" y1="${(y - 4).toFixed(1)}" x2="${xLot1.toFixed(1)}" y2="${(y + 4).toFixed(1)}" stroke="#8a9095" stroke-width="1" />`,
        `<rect x="${(mij - latEtich / 2).toFixed(1)}" y="${(y - 9).toFixed(1)}" width="${latEtich}" height="18" rx="3" fill="#f4f1ea" />`,
        `<text x="${mij.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-family="ui-monospace,monospace" fill="#565d62">${o.deschidere}</text>`,
      );
    }
    if (o.adancime) {
      const x = Math.min(xLot1 + 12, W - 12);
      const mij = (yLot0 + yLot1) / 2;
      const inaltEtich = Math.round(o.adancime.length * 6.7 + 14);
      parti.push(
        `<line x1="${x.toFixed(1)}" y1="${yLot0.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yLot1.toFixed(1)}" stroke="#8a9095" stroke-width="1" />`,
        `<line x1="${(x - 4).toFixed(1)}" y1="${yLot0.toFixed(1)}" x2="${(x + 4).toFixed(1)}" y2="${yLot0.toFixed(1)}" stroke="#8a9095" stroke-width="1" />`,
        `<line x1="${(x - 4).toFixed(1)}" y1="${yLot1.toFixed(1)}" x2="${(x + 4).toFixed(1)}" y2="${yLot1.toFixed(1)}" stroke="#8a9095" stroke-width="1" />`,
        `<rect x="${(x - 9).toFixed(1)}" y="${(mij - inaltEtich / 2).toFixed(1)}" width="18" height="${inaltEtich}" rx="3" fill="#f4f1ea" />`,
        `<text x="${x.toFixed(1)}" y="${mij.toFixed(1)}" font-size="11" font-family="ui-monospace,monospace" fill="#565d62" transform="rotate(-90 ${x.toFixed(1)} ${mij.toFixed(1)})" text-anchor="middle" dominant-baseline="middle">${o.adancime}</text>`,
      );
    }

    // Roza vânturilor: nordul real, rotit odată cu desenul.
    const nordA = -Math.sin(az);
    const nordB = Math.cos(az);
    const cx = W - 30;
    const cy = 26;
    const l = 11;
    parti.push(
      `<line x1="${(cx - nordA * l).toFixed(1)}" y1="${(cy - nordB * l).toFixed(1)}" x2="${(cx + nordA * l).toFixed(1)}" y2="${(cy + nordB * l).toFixed(1)}" stroke="#8a9095" stroke-width="1.2" />`,
      `<circle cx="${(cx + nordA * l).toFixed(1)}" cy="${(cy + nordB * l).toFixed(1)}" r="2.4" fill="#565d62" />`,
      `<text x="${(cx + nordA * (l + 9)).toFixed(1)}" y="${(cy + nordB * (l + 9) + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#565d62">N</text>`,
    );
    parti.push('</g>');
  }

  return `<svg class="plan-lot" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" xmlns="http://www.w3.org/2000/svg">${parti.join('')}</svg>`;
}
