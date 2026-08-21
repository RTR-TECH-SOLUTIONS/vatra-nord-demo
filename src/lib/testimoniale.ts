/**
 * Testimoniale.
 *
 * Deliberat altfel decât tiparul obișnuit de pe web: fără avatar rotund, fără
 * cinci steluțe, fără carusel. Alea trei sunt semnele după care se recunoaște
 * un site făcut de-a gata, iar aici ar strica exact ce vinde site-ul.
 *
 * Ce convinge la un teren nu e „servicii excelente, recomand”, ci fotografia a
 * ce a ieșit pe lot plus datele concrete: care lot, câți metri, când s-a
 * cumpărat. De aia fiecare testimonial cară și lotul, și suprafața, și data —
 * sunt legate de inventarul real, nu sunt text liber.
 */

export interface Testimonial {
  id: string;
  /** Cum semnează: „Familia Ionescu”, „Andrei M.”. */
  nume: string;
  /** De unde a venit cumpărătorul, nu unde e lotul. */
  localitate: string | null;
  /** Slug de parcelare, ca testimonialul să apară pe pagina ei. */
  proiect: string | null;
  /** Codul lotului cumpărat, dacă vrea să apară. */
  lot: string | null;
  /**
   * Id-ul lotului din inventar. Din el iese butonul care duce pe hartă exact
   * pe parcela cumpărată: o recomandare care se poate verifica pe teren
   * cântărește altfel decât una semnată „client din Ilfov”.
   */
  lotId?: string | null;
  suprafata: number | null;
  /** Luna cumpărării, „2025-05”. Anul singur e prea vag ca să conteze. */
  data: string | null;
  text: string;
  /** Cale către fișier sau, pentru pozele puse din panou, data URL. */
  poza: string | null;
  legendaPoza: string | null;
}

const LUNI = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

/** „2025-05” devine „mai 2025”. Data goală nu inventează nimic. */
export function lunaRo(data: string | null): string | null {
  if (!data) return null;
  const [an, luna] = data.split('-');
  const i = Number(luna) - 1;
  if (!an || Number.isNaN(i) || i < 0 || i > 11) return an || null;
  return `${LUNI[i]} ${an}`;
}

/**
 * Linia cu datele lotului: numai bucățile care chiar există.
 *
 * Numele și orașul nu intră aici, pentru că stau deja în capul cardului. Cât
 * timp linia era singura, le purta pe toate; acum ar fi al doilea rând care
 * repetă primul.
 */
export function randDate(t: Testimonial, numeParcelare?: string | null): string {
  const bucati: string[] = [];
  if (t.lot) bucati.push(numeParcelare ? `Lotul ${t.lot}, ${numeParcelare}` : `Lotul ${t.lot}`);
  if (t.suprafata) bucati.push(`${t.suprafata} m²`);
  const cand = lunaRo(t.data);
  if (cand) bucati.push(`cumpărat în ${cand}`);
  return bucati.join(' · ');
}
