export type StatusLot = 'disponibil' | 'rezervat' | 'vandut' | 'in_pregatire';

export interface ProprietatiLot {
  id: string;
  cod: string;
  proiect: string;
  /** 0 sau 1: rândul din bandă. Din el se deduce pe ce latură a lotului e strada. */
  sir: 0 | 1;
  status: StatusLot;
  suprafata: number;
  front: number;
  pret_total: number;
  pret_mp: number;
  tva_inclus: boolean;
  observatii: string | null;
  actualizat: string;
}

export interface Utilitate {
  tip: string;
  stare: string;
  detaliu: string | null;
}

export interface Proiect {
  slug: string;
  nume: string;
  localitate: string;
  judet: string;
  azimut: number;
  /** Azimutul normalei la ancoră, adică direcția spre interiorul tarlalei. */
  azimutNormala: number;
  lotTipic: { front: number; adancime: number; drumInterior: number };
  pretMp: [number, number];
  camera: { center: [number, number]; zoom: number; bearing: number; pitch: number };
  bbox: [number, number, number, number];
  /** Hotarul real al tarlalei, trasat pe imaginea satelitară sau pe drumul din OSM. */
  hotar: [number, number][];
  tarlaHa: number;
  distante: { reper: string; km: number }[];
  finantare: { avans: number; luni: number; dobanda: number } | null;
  urbanism: { instrument: string; pot: number; cut: number; regim: string; frontMinim: number };
  utilitati: Utilitate[];
  descriere: string[];
  actualizat: string;
  statistici: {
    total: number;
    disponibile: number;
    rezervate: number;
    vandute: number;
    in_pregatire: number;
    benzi: number;
    siruri: number;
    suprafata_min: number;
    suprafata_max: number;
    suprafata_totala_ha: number;
    front_min: number;
    pret_mp_min: number;
    pret_mp_max: number;
    pret_total_min: number | null;
  };
}

interface ConfigStatus {
  eticheta: string;
  scurt: string;
  culoare: string;
  contur: string;
  opacitate: number;
  vandabil: boolean;
}

/**
 * Culorile de status sunt un cod de semnalizare, nu paleta de brand. Sunt
 * desaturate față de referință, ca să stea peste satelit fără să pară semafor,
 * dar păstrează aceeași citire: verde se poate cumpăra, roșu nu.
 */
export const STATUSURI: Record<StatusLot, ConfigStatus> = {
  disponibil: {
    eticheta: 'Disponibil',
    scurt: 'Disponibile',
    culoare: '#2f8f57',
    contur: '#1d5c37',
    opacitate: 0.62,
    vandabil: true,
  },
  rezervat: {
    eticheta: 'Rezervat',
    scurt: 'Rezervate',
    culoare: '#c08a2a',
    contur: '#8a6114',
    opacitate: 0.6,
    vandabil: true,
  },
  vandut: {
    eticheta: 'Vândut',
    scurt: 'Vândute',
    culoare: '#b4483a',
    contur: '#7d2c22',
    opacitate: 0.52,
    vandabil: false,
  },
  in_pregatire: {
    eticheta: 'În pregătire',
    scurt: 'În pregătire',
    culoare: '#3e6b7a',
    contur: '#284b57',
    opacitate: 0.48,
    vandabil: false,
  },
};

export const ORDINE_STATUS: StatusLot[] = ['disponibil', 'rezervat', 'in_pregatire', 'vandut'];

const nfEur = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 });
const nfZec = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const euro = (n: number) => `${nfEur.format(n)} €`;
export const mp = (n: number) => `${nfEur.format(n)} m²`;
export const ml = (n: number) => `${nfZec.format(n)} ml`;

export function dataRo(iso: string): string {
  const luni = [
    'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
  ];
  const [an, luna, zi] = iso.split('-').map(Number);
  return `${zi} ${luni[luna - 1]} ${an}`;
}
