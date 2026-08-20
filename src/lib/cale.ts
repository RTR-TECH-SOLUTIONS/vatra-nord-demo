/**
 * Căile interne trec toate pe aici.
 *
 * Site-ul real va sta în rădăcina domeniului clientului, dar copia de
 * previzualizare stă într-un subfolder pe GitHub Pages. Fără helper-ul ăsta,
 * fiecare `/date/loturi.geojson` și fiecare `href="/parcelari"` s-ar rupe pe
 * preview, iar harta ar rămâne goală fără nicio eroare vizibilă.
 */
export function cale(drum: string) {
  const baza = import.meta.env.BASE_URL || '/';
  return `${baza}/${drum}`.replace(/\/{2,}/g, '/');
}
