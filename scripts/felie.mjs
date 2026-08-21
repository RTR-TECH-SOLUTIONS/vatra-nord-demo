/**
 * Fâșia scoasă la vânzare, lipită de un drum real.
 *
 * Stă în modul propriu pentru că are nevoie de reglaj: la unele amplasamente
 * o clădire sau un drum de acces cade fix peste fâșie și taie un lot, iar
 * atunci fâșia se mută câțiva zeci de metri de-a lungul drumului. Cu funcția
 * separată, mutarea se poate căuta automat, fără să rulezi tot generatorul.
 */
import { proiectieLocala } from '../src/lib/parcelare.js';

/**
 * Un dezvoltator mic nu taie toată tarlaua deodată: scoate o fâșie cu
 * deschidere la drum și o vinde lot cu lot. Aici fâșia se construiește chiar pe
 * geometria drumului din OpenStreetMap, nu pe o latură desenată de mână, ca
 * fiecare lot să aibă ieșire adevărată la stradă și nu una presupusă.
 *
 * Întoarce și azimutul cu care trebuie hrănit motorul: `v` trebuie să crească
 * spre drum, pentru că fața lotului e la `v` mare.
 */
export function felieLaDrum(cfg, obstacole) {
  const pr = proiectieLocala(cfg.felie.punct);
  const clase = new Set(cfg.felie.clase ?? ['residential']);
  const linii = obstacole
    .filter((f) => f.geometry?.type === 'LineString' && clase.has(f.properties?.clasa))
    .map((f) => f.geometry.coordinates.map(pr.laMetri));

  // Punctul de pe drum cel mai apropiat de reperul din configurație.
  let cel = null;
  for (const pts of linii) {
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const L2 = dx * dx + dy * dy;
      if (!L2) continue;
      const t = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / L2));
      const p = [a[0] + dx * t, a[1] + dy * t];
      const d = Math.hypot(p[0], p[1]);
      if (!cel || d < cel.d) cel = { d, pts, i, t };
    }
  }
  if (!cel) throw new Error(`${cfg.slug}: niciun drum din clasele cerute lângă punctul de front`);
  if (cel.d > 60) throw new Error(`${cfg.slug}: cel mai apropiat drum e la ${cel.d.toFixed(0)} m de punctul de front`);

  // Parcurgem drumul de la punctul găsit, jumătate de lungime în fiecare parte.
  const pts = cel.pts;
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const laS = (s) => {
    const lim = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < lim) i += 1;
    const seg = cum[i] - cum[i - 1] || 1;
    const t = (lim - cum[i - 1]) / seg;
    return [
      pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
      pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
    ];
  };
  // `deplasare` mută fâșia de-a lungul drumului, ca să ocolească o clădire
  // sau un acces care ar tăia un lot în două.
  const s0 = cum[cel.i - 1] + cel.t * (cum[cel.i] - cum[cel.i - 1]) + (cfg.felie.deplasare ?? 0);
  const p0 = laS(s0 - cfg.felie.lungime / 2);
  const p1 = laS(s0 + cfg.felie.lungime / 2);

  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const L = Math.hypot(dx, dy);
  if (L < cfg.felie.lungime * 0.7) {
    throw new Error(`${cfg.slug}: drumul e prea scurt pentru o fâșie de ${cfg.felie.lungime} m`);
  }
  const d = [dx / L, dy / L];

  // Normala dinspre drum spre câmp: partea în care e centrul tarlalei.
  let n = [-d[1], d[0]];
  const C = cfg.teren.map(pr.laMetri).reduce(
    (a, p, _i, arr) => [a[0] + p[0] / arr.length, a[1] + p[1] / arr.length],
    [0, 0],
  );
  if ((C[0] - p0[0]) * n[0] + (C[1] - p0[1]) * n[1] < 0) n = [-n[0], -n[1]];

  const retras = cfg.felie.retras ?? 9;
  const adanc = (cfg.retragere ?? 2) + cfg.adancime;
  const colt = (p, k) => [p[0] + n[0] * k, p[1] + n[1] * k];
  const inel = [colt(p0, retras), colt(p1, retras), colt(p1, retras + adanc), colt(p0, retras + adanc)]
    .map(pr.laWgs)
    .map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);

  // Motorul citește `v` ca (-uy, ux). Îl vrem îndreptat spre drum, adică `-n`,
  // pentru că fața lotului iese la `v` mare.
  const rotit = [-d[1], d[0]];
  const spreDrum = rotit[0] * -n[0] + rotit[1] * -n[1] > 0;
  const u = spreDrum ? d : [-d[0], -d[1]];
  const grade = (v) => ((Math.atan2(v[0], v[1]) * 180) / Math.PI + 360) % 360;

  return { inel, azimut: grade(u), azimutNormala: grade(n), distantaDrum: cel.d };
}
