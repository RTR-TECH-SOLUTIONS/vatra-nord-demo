/**
 * Pinul de preț al unui lot.
 *
 * Semnul ăsta face treaba pe care harta nu o făcea: spune cât costă înainte de
 * orice click. Referința din piață pune un asemenea semn pe fiecare lot și e
 * exact partea care funcționează la ea, pentru că prima întrebare a omului nu
 * e „ce cod are lotul”, e „cât”.
 *
 * Culorile sunt deliberat mai vii decât ale poligoanelor. Umplutura lotului e
 * fond, semnul e semnal: dacă amândouă ar avea aceeași saturație, harta ar fi
 * o pată uniformă. Ierarhia asta e și motivul pentru care vândutul nu strigă:
 * are culoare tare, dar suprafață mică și fără preț.
 */
import { STATUSURI, euro, type StatusLot, type ProprietatiLot } from './loturi';

interface CuloarePin {
  fond: string;
  text: string;
  /** Muchia de jos, cu o nuanță mai închisă: dă semnului grosime, nu umbră. */
  talpa: string;
}

export const CULORI_PRET: Record<StatusLot, CuloarePin> = {
  disponibil: { fond: '#17a05a', text: '#ffffff', talpa: '#0e7440' },
  rezervat: { fond: '#eda01b', text: '#1c1a14', talpa: '#b87608' },
  in_pregatire: { fond: '#2b86ad', text: '#ffffff', talpa: '#1c6183' },
  vandut: { fond: '#d8402f', text: '#ffffff', talpa: '#9e2a1d' },
};

/** Ce scrie pe rândul de jos. Vândutul nu poartă preț: nu mai e o ofertă. */
export function valoarePin(p: ProprietatiLot): string {
  if (p.status === 'vandut') return 'Vândut';
  if (p.status === 'in_pregatire') return 'În curând';
  return euro(p.pret_total);
}

export function elementPinPret(p: ProprietatiLot): HTMLElement {
  const c = CULORI_PRET[p.status] ?? CULORI_PRET.disponibil;

  const nod = document.createElement('button');
  nod.type = 'button';
  nod.className = 'pin-pret';
  nod.dataset.lot = p.id;
  nod.dataset.stare = p.status;
  nod.style.setProperty('--fond', c.fond);
  nod.style.setProperty('--text', c.text);
  nod.style.setProperty('--talpa', c.talpa);
  nod.setAttribute(
    'aria-label',
    `Lotul ${p.cod}, ${STATUSURI[p.status].eticheta}, ${euro(p.pret_total)} plus TVA, ${p.suprafata} m²`,
  );

  const cod = document.createElement('span');
  cod.className = 'pin-pret__cod';
  cod.textContent = `Lotul ${p.cod}`;
  cod.setAttribute('aria-hidden', 'true');

  const val = document.createElement('span');
  val.className = 'pin-pret__val';
  val.textContent = valoarePin(p);
  val.setAttribute('aria-hidden', 'true');

  const ac = document.createElement('span');
  ac.className = 'pin-pret__ac';
  ac.setAttribute('aria-hidden', 'true');

  nod.append(cod, val, ac);
  return nod;
}
