const R_PAMANT = 6371.0088;

/** Distanță geodezică aproximativă, în km. Suficientă la scara Ilfovului. */
export function km(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const latMed = ((a[1] + b[1]) / 2) * rad;
  const dx = (b[0] - a[0]) * rad * R_PAMANT * Math.cos(latMed);
  const dy = (b[1] - a[1]) * rad * R_PAMANT;
  return Math.hypot(dx, dy);
}

/** Timp orientativ cu mașina, la 42 km/h medie pe drum de Ilfov. */
export function minute(distantaKm: number): number {
  return Math.max(2, Math.round((distantaKm / 42) * 60));
}

export function kmRo(valoare: number): string {
  return `${valoare.toLocaleString('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
