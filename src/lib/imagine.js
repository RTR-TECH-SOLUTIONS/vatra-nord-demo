/**
 * Încadrarea vederii aeriene a unei parcelări. Aceeași funcție e folosită de
 * scriptul care descarcă imaginea și de pagina de lot care desenează conturul
 * lotului peste ea; altfel conturul ar cădea alături.
 */
export const LATIME_IMAGINE = 1600;
export const INALTIME_IMAGINE = 900;
const MARGINE = 0.35;
/**
 * Lățimea minimă a cadrului, în metri. O fâșie de șase loturi are vreo 150 m;
 * încadrată strâns pe ea, imaginea satelitară iese o pată verde neclară, pentru
 * că sursa nu are atâția pixeli pe metru deasupra câmpului. Cu un cadru de
 * cadru de șapte sute de metri se văd și drumul, și satul, și rămâne clară.
 */
const LATIME_MINIMA = 700;
const METRI_PE_GRAD = 111320;

/** Extinde bbox-ul parcelării la raportul imaginii, cu marjă de context. */
export function cadruImagine([minLon, minLat, maxLon, maxLat]) {
  const lonC = (minLon + maxLon) / 2;
  const latC = (minLat + maxLat) / 2;
  const cos = Math.cos((latC * Math.PI) / 180);
  let dLon = ((maxLon - minLon) / 2) * (1 + MARGINE);
  let dLat = ((maxLat - minLat) / 2) * (1 + MARGINE);
  const minDLon = LATIME_MINIMA / 2 / (METRI_PE_GRAD * cos);
  if (dLon < minDLon) dLon = minDLon;
  const raport = LATIME_IMAGINE / INALTIME_IMAGINE;
  if ((dLon * cos) / dLat < raport) dLon = (dLat * raport) / cos;
  else dLat = (dLon * cos) / raport;
  return [lonC - dLon, latC - dLat, lonC + dLon, latC + dLat];
}

/** Coordonate lon/lat în pixeli pe imaginea aeriană. */
export function laPixeli(cadru, [lon, lat]) {
  const [minLon, minLat, maxLon, maxLat] = cadru;
  const x = ((lon - minLon) / (maxLon - minLon)) * LATIME_IMAGINE;
  const y = ((maxLat - lat) / (maxLat - minLat)) * INALTIME_IMAGINE;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}
