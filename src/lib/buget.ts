/**
 * Benzile de buget.
 *
 * Sliderul dublu de preț arăta bine și nu era folosit: cere două gesturi fine
 * ca să răspundă la o întrebare pe care omul o are deja formulată în cap („am
 * cincizeci de mii”). Benzile o iau exact așa cum e pusă, dintr-un click.
 *
 * Pragurile nu sunt scrise de mână: se calculează din prețurile reale ale
 * loturilor rămase, altfel prima bandă ar fi goală de fiecare dată când se
 * schimbă stocul. Sunt rotunjite, pentru că „sub 47.318 €” nu e un buget, e
 * un rezultat de calcul.
 */
import { euro } from './loturi';

export interface BandaBuget {
  id: string;
  eticheta: string;
  /** Interval semiînchis [min, max): așa se citesc și etichetele. */
  min: number;
  max: number;
}

/** Cel mai mare pas rotund care încape în valoare: 1, 2, 2,5 sau 5 × 10^k. */
function pasRotund(x: number): number {
  if (!(x > 0)) return 1;
  const k = Math.floor(Math.log10(x));
  const zecime = 10 ** k;
  const m = x / zecime;
  const trepte = [1, 2, 2.5, 5];
  let ales = 1;
  for (const t of trepte) if (t <= m) ales = t;
  return ales * zecime;
}

export function benziBuget(preturi: number[]): BandaBuget[] {
  if (preturi.length < 2) return [];
  const min = Math.min(...preturi);
  const max = Math.max(...preturi);
  if (max - min < 1) return [];

  const pas = pasRotund((max - min) / 4);
  const praguri: number[] = [];
  for (let k = 1; k <= 3; k += 1) {
    const p = Math.round((min + ((max - min) * k) / 4) / pas) * pas;
    if (p > min && p < max && !praguri.includes(p)) praguri.push(p);
  }
  if (!praguri.length) return [];

  const benzi: BandaBuget[] = [];
  let jos = 0;
  for (const p of praguri) {
    benzi.push({
      id: `b${benzi.length}`,
      eticheta: jos === 0 ? `sub ${euro(p)}` : `${euro(jos)} – ${euro(p)}`,
      min: jos,
      max: p,
    });
    jos = p;
  }
  benzi.push({ id: `b${benzi.length}`, eticheta: `peste ${euro(jos)}`, min: jos, max: Infinity });
  return benzi;
}
