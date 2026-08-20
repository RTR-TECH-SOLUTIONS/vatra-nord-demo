/**
 * Amplasamentele parcelărilor. Definiția e separată de generator pentru că o
 * folosesc două scripturi: cel care descarcă obstacolele din OSM și cel care
 * generează datele.
 *
 * `teren` e hotarul real, trasat pe imaginea satelitară; unde o latură e un
 * drum, punctele vin din geometria OSM a drumului. `ancora` e indicele laturii
 * de care se aliniază rândurile de loturi.
 */
export const PARCELARI = [
  {
    slug: 'corbeanca-nord',
    nume: 'Corbeanca Nord',
    localitate: 'Corbeanca',
    judet: 'Ilfov',
    // Hotarul tarlalei, trasat pe imaginea satelitară: latura 0 e limita dintre
    // câmpul verde și cel arat, latura 2 e drumul comunal (way OSM 27861542),
    // de care se lipesc rândurile.
    teren: [
      [26.041143, 44.611126],
      [26.047625, 44.613346],
      [26.04953, 44.610274],
      [26.043459, 44.608253],
    ],
    ancora: 2,
    front: 17,
    adancime: 32,
    drumInterior: 8,
    seed: 1071,
    mix: { vandut: 0.58, rezervat: 0.06, in_pregatire: 0.04 },
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
      { tip: 'Gaz', stare: 'în stradă', detaliu: 'conductă pe drumul principal, racordul rămâne în sarcina cumpărătorului' },
      { tip: 'Apă', stare: 'la lot', detaliu: 'rețea proprie, foraj de 82 m, contorizare individuală' },
      { tip: 'Canalizare', stare: 'proiectat', detaliu: 'stație de epurare proprie, recepție estimată în trimestrul 4 din 2026' },
      { tip: 'Internet', stare: 'în zonă', detaliu: 'fibră optică pe drumul de acces' },
      { tip: 'Drum', stare: 'la lot', detaliu: '8 m lățime, piatră concasată compactată, deszăpezire inclusă' },
    ],
    descriere: [
      'Corbeanca Nord e cea mai veche parcelare din portofoliu. Terenul a fost dezmembrat în 2024, imediat după aprobarea PUZ-ului, iar drumurile interioare au fost trasate și compactate în două etape, în vara lui 2025 și în primăvara lui 2026.',
      'Loturile sunt orientate pe axa drumului comunal, deci fiecare are deschidere directă la stradă și niciunul nu depinde de servitute de trecere. Prima bandă, cea dinspre intrare, s-a vândut integral în 2025.',
      'Stocul rămas e concentrat în benzile dinspre vest. Ultima bandă intră în vânzare după recepția stației de epurare.',
    ],
  },
  {
    slug: 'saftica',
    nume: 'Săftica',
    localitate: 'Balotești',
    judet: 'Ilfov',
    // Hotarul tarlalei, trasat pe imaginea satelitară. Latura 5 e limita de vest;
    // de ea se lipesc rândurile, pentru că pe direcția aia tarlaua e cea mai
    // regulată și se pierde cel mai puțin teren la decupare.
    teren: [
      [26.05886, 44.618604],
      [26.06208, 44.618789],
      [26.063088, 44.617863],
      [26.066178, 44.615317],
      [26.061235, 44.615108],
      [26.058698, 44.616081],
    ],
    ancora: 5,
    front: 18,
    adancime: 33,
    drumInterior: 9,
    seed: 2264,
    mix: { vandut: 0.12, rezervat: 0.09, in_pregatire: 0.11 },
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
      { tip: 'Gaz', stare: 'la lot', detaliu: 'conductă de distribuție pe toate drumurile interioare' },
      { tip: 'Apă', stare: 'în stradă', detaliu: 'racord la rețeaua comunei Balotești' },
      { tip: 'Canalizare', stare: 'în stradă', detaliu: 'racord la rețeaua comunei, cămine individuale turnate' },
      { tip: 'Internet', stare: 'în zonă', detaliu: null },
      { tip: 'Drum', stare: 'la lot', detaliu: '9 m lățime, asfaltat pe tronsonul de intrare, restul piatră compactată' },
    ],
    descriere: [
      'Săftica e la 600 de metri de DN1, pe partea dinspre Therme, într-o zonă în care comuna Balotești a extins deja rețelele de apă și canalizare. Parcelarea s-a deschis în iulie 2026.',
      'Loturile au front de minimum 16 metri liniari, ceea ce permite regimul P+1E+M fără derogare. Drumurile interioare au 9 metri, iar tronsonul de intrare a fost asfaltat înainte de prima vânzare.',
      'Fiind la începutul vânzării, stocul e aproape complet. Ultimele două benzi, cele dinspre limita de nord, se deschid după finalizarea branșamentelor electrice.',
    ],
  },
  {
    slug: 'lacul-vlasiei',
    nume: 'Lacul Vlăsiei',
    localitate: 'Balotești',
    judet: 'Ilfov',
    // Aici nu e drum la limită, ci hotarul tarlalei, trasat pe imaginea
    // satelitară: latura de nord, apoi perdeaua de arbori la vest și drumul de
    // exploatare la sud. Rândurile se aliniază la latura 0.
    teren: [
      [26.083528, 44.632241],
      [26.091636, 44.632355],
      [26.092677, 44.629035],
      [26.089193, 44.628152],
      [26.08553, 44.62647],
      [26.083447, 44.627154],
    ],
    ancora: 0,
    benzi: 5,
    front: 19,
    adancime: 35,
    drumInterior: 8,
    seed: 3389,
    mix: { vandut: 0.05, rezervat: 0.04, in_pregatire: 0.58 },
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
      { tip: 'Drum', stare: 'la lot', detaliu: '8 m lățime, piatră concasată, două intrări din drumul județean' },
    ],
    descriere: [
      'Lacul Vlăsiei are cele mai mari loturi din portofoliu și e singura parcelare unde frontul minim de 18 metri liniari e regulă, nu excepție. Terenul coboară lin către salba de lacuri de pe valea Cociovaliștei.',
      'POT-ul de 25% și CUT-ul de 0,9 sunt mai restrictive decât în celelalte parcelări, ceea ce ține densitatea jos și păstrează curțile generoase.',
      'Vânzarea e la început. Majoritatea loturilor sunt încă în pregătire, în așteptarea recepției drumurilor interioare, programată pentru toamna lui 2026.',
    ],
  },
];
