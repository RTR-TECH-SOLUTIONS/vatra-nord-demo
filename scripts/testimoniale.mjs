/**
 * Testimonialele de demo.
 *
 * Textele sunt scrise ca să semene cu ce spune un om real, nu cu ce scrie într-o
 * secțiune de „păreri”: pomenesc lucruri concrete (unde se oprea conducta, când
 * s-a turnat fundația, ce a cerut la notar) și spun și ce a fost greu. Un
 * testimonial în care totul a fost perfect nu e crezut de nimeni.
 *
 * Fotografiile sunt brandless, de pe Pexels, alese documentar: casa ridicată pe
 * lot, șantierul, oamenii văzuți de departe pe teren. Niciun portret de studio,
 * pentru că exact acolo se vede că poza e luată de undeva.
 */
export const TESTIMONIALE = [
  {
    id: 'familia-ionescu',
    nume: 'Familia Ionescu',
    localitate: 'București, sectorul 1',
    proiect: 'saftica',
    lot: 'F31',
    suprafata: 614,
    data: '2025-05',
    text:
      'Când am semnat, acolo era arătură și un drum de pământ. Ne-a arătat pe hartă unde se oprea atunci conducta de gaz și cât aveam de tras până la noi, nu ne-a spus „utilități la poartă” ca ceilalți. Fundația am turnat-o în septembrie, iar drumul l-au pietruit până la casă în noiembrie, cum ziseseră.',
    poza: '/imagini/testimoniale/santier-din-aer.jpg',
    legendaPoza: 'Casa familiei Ionescu pe lotul F31, la un an de la cumpărare.',
  },
  {
    id: 'andrei-m',
    nume: 'Andrei M.',
    localitate: 'Otopeni',
    proiect: 'corbeanca-nord',
    lot: 'D8',
    suprafata: 539,
    data: '2024-09',
    text:
      'Căutam de vreo jumătate de an și mă săturasem de anunțuri cu poze de acum trei ani. Aici am putut să văd lotul pe satelit înainte să mă duc pe teren, cu dimensiunile pe el. Am mers cu un topograf de-al meu să verific bornele și a ieșit cum scria. Prețul nu s-a mișcat între telefon și notar.',
    poza: '/imagini/testimoniale/cuplu-pe-camp.jpg',
    legendaPoza: 'Lotul D8 în toamna lui 2024, înainte de împrejmuire.',
  },
  {
    id: 'familia-dobre',
    nume: 'Familia Dobre',
    localitate: 'Voluntari',
    proiect: 'saftica',
    lot: 'D19',
    suprafata: 613,
    data: '2025-02',
    text:
      'Ne-a plăcut că ne-a zis din prima ce nu e gata: canalizarea nu era, era doar proiectată, și ne-a spus și pe cât timp. Am luat lotul știind asta și ne-am făcut fosă până se face rețeaua. Am pierdut vreo două luni cu certificatul de urbanism, dar aia nu ține de dânsul.',
    poza: '/imagini/testimoniale/sarpanta.jpg',
    legendaPoza: 'Lotul D19, șarpanta pusă în primăvara asta.',
  },
  {
    id: 'cristina-si-radu',
    nume: 'Cristina și Radu',
    localitate: 'Ploiești',
    proiect: 'lacul-vlasiei',
    lot: 'B14',
    suprafata: 648,
    data: '2024-11',
    text:
      'Am cumpărat de la distanță, din Ploiești, și ne-a ajutat mult că vedeam pe hartă exact ce lot e liber și la ce preț, fără să sunăm de fiecare dată. Am venit o singură dată pe teren înainte de contract. Zidăria am ridicat-o vara asta.',
    // Fără poză, ca la viața reală: nu orice cumpărător trimite una, iar
    // secțiunea trebuie să arate bine și așa.
    poza: null,
    legendaPoza: null,
  },
];
