/**
 * Testimonialele de demo.
 *
 * Textele sunt scrise ca să semene cu ce spune un om real, nu cu ce scrie într-o
 * secțiune de „păreri”: pomenesc lucruri concrete (unde se oprea conducta, când
 * s-a turnat fundația, ce a cerut la notar) și spun și ce a fost greu. Un
 * testimonial în care totul a fost perfect nu e crezut de nimeni.
 *
 * Fiecare recomandare e legată de un lot real din inventar, prin `lotId`. De
 * acolo iese butonul „Vezi lotul pe hartă”, care duce exact pe parcela cumpărată.
 * Asta e diferența față de secțiunile de păreri din piață: acolo scrie „client
 * mulțumit din Ilfov” și nu se poate verifica nimic; aici omul vede pe hartă
 * lotul, vecinii lui și ce mai e liber lângă el — adică fix ce urmează să
 * cumpere. Loturile alese sunt cele marcate vândute, ca povestea și inventarul
 * să spună același lucru.
 *
 * Fotografiile lipsesc intenționat. Într-un demo, o poză de stoc cu un cuplu
 * care zâmbește în cameră spune „site făcut de-a gata” mai tare decât spune
 * orice text, iar aici tocmai credibilitatea se vinde. Locurile rămân goale, cu
 * o notă în ele, și se umplu din panou cu pozele adevărate de la cumpărători:
 * ei pe teren, la borne, la semnat, sau casa ridicată după un an.
 */
export const TESTIMONIALE = [
  {
    id: 'familia-ionescu',
    nume: 'Familia Ionescu',
    localitate: 'București, sectorul 1',
    proiect: 'corbeanca-nord',
    lotId: 'corbeanca-nord-1',
    lot: '1',
    suprafata: 773,
    data: '2024-11',
    text:
      'Când am semnat, acolo era arătură și un drum de pământ. Ne-a arătat pe hartă unde se oprea atunci conducta de gaz și cât aveam de tras până la noi, nu ne-a spus „utilități la poartă” ca ceilalți. Fundația am turnat-o în martie, iar branșamentul de curent l-au pus în vara următoare, cum ziseseră.',
    poze: [null, null, null],
    legendaPoza: null,
  },
  {
    id: 'andrei-m',
    nume: 'Andrei M.',
    localitate: 'Otopeni',
    proiect: 'corbeanca-nord',
    lotId: 'corbeanca-nord-3',
    lot: '3',
    suprafata: 728,
    data: '2025-03',
    text:
      'Căutam de vreo jumătate de an și mă săturasem de anunțuri cu poze de acum trei ani. Aici am putut să văd lotul pe satelit înainte să mă duc pe teren, cu deschiderea scrisă pe el. Am mers cu un topograf de-al meu să verific bornele și a ieșit cum scria. Prețul nu s-a mișcat între telefon și notar.',
    poze: [null, null, null],
    legendaPoza: null,
  },
  {
    id: 'familia-dobre',
    nume: 'Familia Dobre',
    localitate: 'Voluntari',
    proiect: 'corbeanca-nord',
    lotId: 'corbeanca-nord-2',
    lot: '2',
    suprafata: 759,
    data: '2025-06',
    text:
      'Ne-a plăcut că ne-a zis din prima ce nu e gata: canalizarea nu era, era doar proiectată, și ne-a spus și pe cât timp. Am luat lotul știind asta și ne-am făcut fosă până se face rețeaua. Am pierdut vreo două luni cu certificatul de urbanism, dar aia nu ține de dânsul.',
    poze: [null, null, null],
    legendaPoza: null,
  },
  {
    id: 'cristina-si-radu',
    nume: 'Cristina și Radu',
    localitate: 'Ploiești',
    proiect: 'saftica',
    lotId: 'saftica-1',
    lot: '1',
    suprafata: 722,
    data: '2026-07',
    text:
      'Am cumpărat de la distanță, din Ploiești, la două săptămâni după ce au scos fâșia la vânzare. Ne-a ajutat mult că vedeam pe hartă exact ce lot e liber și la ce preț, fără să sunăm de fiecare dată. Am venit o singură dată pe teren înainte de contract. Construim la anul, deocamdată am pus doar bornele.',
    poze: [null, null, null],
    legendaPoza: null,
  },
];
