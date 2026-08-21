/**
 * Amplasamentele parcelărilor. Definiția e separată de generator pentru că o
 * folosesc două scripturi: cel care descarcă obstacolele din OSM și cel care
 * generează datele.
 *
 * `teren` e tarlaua întreagă, trasată pe imaginea satelitară. Din ea se vinde
 * doar o felie: `felie` spune de care drum real se lipește parcelarea și cât
 * ține de-a lungul lui. Un dezvoltator mic nu scoate la vânzare cinci hectare
 * deodată, scoate o fâșie cu deschidere la drum, cu cinci-șapte loturi. Prima
 * variantă tăia toată tarlaua în două sute de dreptunghiuri și harta devenea
 * ilizibilă exact acolo unde trebuia să convingă.
 *
 * `ancora` a rămas pentru că din ea se deduce în ce parte a drumului e câmpul.
 */
export const PARCELARI = [
  {
    slug: 'corbeanca-nord',
    nume: 'Corbeanca Nord',
    localitate: 'Corbeanca',
    judet: 'Ilfov',
    // Hotarul tarlalei, trasat pe imaginea satelitară: latura 0 e limita dintre
    // câmpul verde și cel arat, latura 2 e drumul comunal (way OSM 27861542),
    // de care se lipesc loturile.
    teren: [
      [26.041143, 44.611126],
      [26.047625, 44.613346],
      [26.04953, 44.610274],
      [26.043459, 44.608253],
    ],
    ancora: 2,
    // Fâșia scoasă la vânzare: 144 m de front la drumul comunal.
    felie: { punct: [26.046494, 44.609263], clase: ['residential'], lungime: 144, retras: 9 },
    front: 20,
    adancime: 38,
    retragere: 2,
    seed: 1071,
    mix: { vandut: 0.43, rezervat: 0.14, in_pregatire: 0 },
    pretMp: [65, 85],
    bearingCamera: -32,
    distante: [
      { reper: 'Piața Victoriei', km: 18.0 },
      { reper: 'DN1', km: 2.0 },
      { reper: 'A0, centura București', km: 2.2 },
    ],
    finantare: { avans: 25, luni: 36, dobanda: 0 },
    urbanism: { instrument: 'PUZ aprobat prin HCL 41/2024', pot: 30, cut: 1.0, regim: 'P+1E+M', frontMinim: 14 },
    utilitati: [
      { tip: 'Curent electric', stare: 'la lot', detaliu: 'branșament individual de 15 kW, rețea pusă în funcțiune în martie 2026' },
      { tip: 'Gaz', stare: 'în stradă', detaliu: 'conductă pe drumul comunal, racordul rămâne în sarcina cumpărătorului' },
      { tip: 'Apă', stare: 'la lot', detaliu: 'rețea proprie, foraj de 82 m, contorizare individuală' },
      { tip: 'Canalizare', stare: 'proiectat', detaliu: 'stație de epurare proprie, recepție estimată în trimestrul 4 din 2026' },
      { tip: 'Internet', stare: 'în zonă', detaliu: 'fibră optică pe drumul de acces' },
      { tip: 'Drum', stare: 'la lot', detaliu: 'drum comunal asfaltat, cu deschidere directă din fiecare lot' },
    ],
    descriere: [
      'Corbeanca Nord e cea mai veche fâșie din portofoliu. Terenul a fost dezmembrat în 2024, imediat după aprobarea PUZ-ului, iar loturile au ieșit toate cu deschidere directă la drumul comunal, fără servitute de trecere și fără drum interior de întreținut.',
      'Sunt șapte loturi, nu o parcelare de sute. Fiecare are între 700 și 800 de metri pătrați, cu front de circa 20 de metri liniari, adică fix cât cere regimul P+1E+M fără derogare.',
      'Primele loturi s-au vândut în 2025, la vecinii care voiau să-și mărească curtea. Ce a rămas e capătul dinspre vest, cel mai apropiat de intrarea în sat.',
    ],
  },
  {
    slug: 'saftica',
    nume: 'Săftica',
    localitate: 'Balotești',
    judet: 'Ilfov',
    // Hotarul tarlalei. Latura 3 merge de-a lungul drumului dinspre sat, de care
    // se lipește fâșia scoasă la vânzare.
    teren: [
      [26.05886, 44.618604],
      [26.06208, 44.618789],
      [26.063088, 44.617863],
      [26.066178, 44.615317],
      [26.061235, 44.615108],
      [26.058698, 44.616081],
    ],
    ancora: 3,
    // Deplasarea de 30 m ocolește accesul care taie fâșia în dreptul punctului
    // de reper: fără ea, un lot ieșea cu șase laturi și nouă metri la stradă,
    // adică un lot pe care nu-l cumpără nimeni.
    felie: { punct: [26.063706, 44.615212], clase: ['residential'], lungime: 124, retras: 9, deplasare: 30 },
    front: 20,
    adancime: 36,
    retragere: 2,
    seed: 2264,
    mix: { vandut: 0.17, rezervat: 0.17, in_pregatire: 0 },
    pretMp: [55, 70],
    bearingCamera: 0,
    distante: [
      { reper: 'Piața Victoriei', km: 18.5 },
      { reper: 'DN1', km: 0.6 },
      { reper: 'A0, centura București', km: 2.5 },
    ],
    finantare: { avans: 20, luni: 24, dobanda: 0 },
    urbanism: { instrument: 'PUZ aprobat prin HCL 118/2025', pot: 30, cut: 1.0, regim: 'P+1E+M', frontMinim: 16 },
    utilitati: [
      { tip: 'Curent electric', stare: 'în stradă', detaliu: 'post de transformare montat, branșamentele sunt în execuție' },
      { tip: 'Gaz', stare: 'la lot', detaliu: 'conductă de distribuție pe drumul din fața loturilor' },
      { tip: 'Apă', stare: 'în stradă', detaliu: 'racord la rețeaua comunei Balotești' },
      { tip: 'Canalizare', stare: 'în stradă', detaliu: 'racord la rețeaua comunei, cămine individuale turnate' },
      { tip: 'Internet', stare: 'în zonă', detaliu: null },
      { tip: 'Drum', stare: 'la lot', detaliu: 'drum sătesc, asfaltat pe tronsonul dinspre DN1' },
    ],
    descriere: [
      'Săftica e la 600 de metri de DN1, pe partea dinspre Therme, într-o zonă în care comuna Balotești a extins deja rețelele de apă și canalizare. Fâșia s-a deschis la vânzare în iulie 2026.',
      'Sunt șase loturi așezate în linie, toate cu ieșire la drumul dinspre sat. Frontul e de minimum 16 metri liniari, deci regimul P+1E+M se obține fără derogare.',
      'Fiind la începutul vânzării, aproape tot stocul e liber. Restul tarlalei rămâne câmp: se scoate la vânzare abia după ce se închide fâșia asta.',
    ],
  },
  {
    slug: 'lacul-vlasiei',
    nume: 'Lacul Vlăsiei',
    localitate: 'Balotești',
    judet: 'Ilfov',
    // Latura 5 merge de-a lungul drumului de exploatare dinspre vale, care e și
    // accesul fâșiei scoase la vânzare.
    teren: [
      [26.083528, 44.632241],
      [26.091636, 44.632355],
      [26.092677, 44.629035],
      [26.089193, 44.628152],
      [26.08553, 44.62647],
      [26.083447, 44.627154],
    ],
    ancora: 5,
    felie: { punct: [26.08442, 44.62932], clase: ['track', 'residential'], lungime: 121, retras: 8, deplasare: 30 },
    front: 23,
    adancime: 42,
    retragere: 2,
    seed: 3389,
    mix: { vandut: 0, rezervat: 0.2, in_pregatire: 0.2 },
    pretMp: [45, 60],
    bearingCamera: -32,
    distante: [
      { reper: 'Piața Victoriei', km: 19.9 },
      { reper: 'DN1', km: 1.5 },
      { reper: 'A3, nod Balotești', km: 7.7 },
    ],
    finantare: null,
    urbanism: { instrument: 'PUZ aprobat prin HCL 62/2025', pot: 25, cut: 0.9, regim: 'P+1E+M', frontMinim: 18 },
    utilitati: [
      { tip: 'Curent electric', stare: 'în stradă', detaliu: 'rețea aeriană pe drumul de acces' },
      { tip: 'Gaz', stare: 'proiectat', detaliu: 'cerere de extindere depusă la Distrigaz, termen estimat 2027' },
      { tip: 'Apă', stare: 'la lot', detaliu: 'foraj propriu de 74 m, rezervor tampon de 40 mc' },
      { tip: 'Canalizare', stare: 'proiectat', detaliu: 'fose ecologice individuale până la extinderea rețelei comunei' },
      { tip: 'Internet', stare: 'în zonă', detaliu: null },
      { tip: 'Drum', stare: 'la lot', detaliu: 'drum de exploatare pietruit, lățit la 8 m în primăvara lui 2026' },
    ],
    descriere: [
      'Lacul Vlăsiei are cele mai mari loturi din portofoliu, aproape o mie de metri pătrați fiecare, și e singurul loc unde frontul de 18 metri liniari e regulă, nu excepție. Terenul coboară lin către salba de lacuri de pe valea Cociovaliștei.',
      'Sunt cinci loturi, așezate pe drumul de exploatare pe care l-am lățit la 8 metri și l-am pietruit în primăvara lui 2026. POT-ul de 25% și CUT-ul de 0,9 sunt mai restrictive decât în rest, ceea ce ține densitatea jos și păstrează curțile generoase.',
      'Vânzarea e la început. Două loturi sunt încă în pregătire, în așteptarea recepției drumului, programată pentru toamna lui 2026.',
    ],
  },
];
