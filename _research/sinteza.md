# SINTEZĂ DECIZIONALĂ: site vânzare loturi, nordul Bucureștiului

---

## 1. NUMITORUL COMUN AL PIEȚEI

### 1.1 Ce fac efectiv site-urile RO din nișă

Eșantion analizat: 12 site-uri nord București (Tier A/B/C) plus 7 vânzători de loturi la nivel național. Frecvențele de mai jos sunt din analiza pe cod/HTML, nu estimate.

**Secțiuni, în ordinea în care apar (numitorul comun, 7 site-uri de vânzători de loturi):**

| # | Secțiune | Frecvență |
|---|---|---|
| 1 | Header sticky: logo + nav + telefon ca buton | 5/7 telefon în header |
| 2 | Hero: nume proiect + localitate + distanță în km/minute + „de la X €" | 7/7 |
| 3 | Rezumat în cifre (nr. loturi, suprafețe de la-la, preț de la, distanță) | 6/7 |
| 4 | Despre proiect / de ce zona asta | 6/7 |
| 5 | **Utilități și infrastructură** (curent, gaz, apă, canalizare, fibră, drum) | **7/7** |
| 6 | **Regim urbanistic și acte** (intravilan, PUZ/PUG, POT, CUT, regim înălțime, front minim, cadastru + intabulare) | 5/7 |
| 7 | **Plan de parcelare + listă/hartă de loturi cu status și preț** | 6/7 plan, 5/7 inventar |
| 8 | Localizare: hartă, timpi de acces, transport, facilități nominale (Lidl, școli, microbuze) | 7/7 hartă, 4/7 facilități |
| 9 | Finanțare / rate la dezvoltator | 3/7 (dar 3 din 4 mass-market) |
| 10 | Servicii: proiect de casă, autorizație, ofertă de construcție | 5/7 |
| 11 | Galerie foto (dronă, teren brut, infrastructură, progres) | 7/7 |
| 12 | CTA final + contact cu telefon vizibil | 7/7 |
| 13 | Footer: date firmă, legal, ANPC | 5/7 |

**Nav, media 4-6 iteme.** Nucleu: Acasă (5/7) · Loturi/Terenuri (7/7, sub diverse nume) · Contact (7/7). Frecvent: Despre proiect (4/7), Case/Proiecte de casă (5/7), Finanțare (3/7), Galerie (2/7), arhivă „Vândute" (3/7, funcționează ca dovadă socială specifică nișei).

**Ce NU e standard în nișă și deci nu punem:** testimoniale (1/7), FAQ (1/7), blog (2/7), formular în hero (0/7, formularul stă mereu în /contact), WhatsApp (0/7 la vânzătorii de loturi, apare doar la cei care vând case finite).

**CTA dominant: telefonul, 7/7.** Două site-uri (tei.ro, intrareacutei.ro) nu au deloc formular pe fluxul de vânzare. Micro-copy repetat lângă preț: „prețurile nu conțin TVA", „fără comision, direct de la dezvoltator", „vizionări doar cu programare".

### 1.2 Poziția hărții în piață (argumentul comercial al proiectului)

Din 12 site-uri nord București: **una singură are hartă interactivă adevărată** (dumbravavlasiei.ro, Mapbox GL, ruta `/harta/loturi`). Una are grilă HTML de disponibilitate fără click (the8residencebalotesti.ro, cu contorul live „101 case, rezervate/vândute 93, gradul de ocupare 92%"). Restul, adică 10 din 12, au JPG static sau PDF de descărcat. La nivel național pattern-ul dominant e JPG cu lupă jQuery (tei.ro, intrareacutei.ro).

Concluzie: harta clicabilă cu status pe lot nu e un standard pe care îl copiem, e **diferențiatorul care pune demo-ul instant deasupra întregii piețe locale**. Exact ce cere clientul.

### 1.3 Cele două tonuri din piață

- **(a) Comunitate/arhitectură:** Dumbrava Vlăsiei, Delta Snagov, Marina Snagov. Vând apartenență, prețul e ascuns sau discret, invocă regulament de urbanism, arhitecți premiați, pădure/lac. Zero „rate", zero „avans", zero €/mp.
- **(b) Investiție/rate:** Mega Parc, e-snagov, Ideal Forest. Preț/mp în titlu, avans 20%, dobândă 0%, PUZ aprobat, ROI.

**Recomandarea mea: tonul (b) ca substanță, execuția (a) ca formă.** Adică densitatea factuală și transparența de preț a taberei investiție, dar cu calmul vizual și editorialul taberei premium. Asta e exact golul din piață: tabăra (b) e pe WordPress 2012 cu emoji în titluri, tabăra (a) are design bun dar ascunde prețurile.

---

## 2. STRUCTURA PROPUSĂ

Landing-ul **este** harta, ca la comunaberceni.ro. Restul numitorului comun se mută în pagina de proiect, care preia scroll-ul clasic al nișei. Rezultat: 3 tipuri de pagină, nav de 4 iteme (în media pieței).

**Nav:** Harta · Proiecte · Finanțare · Contact + buton telefon în dreapta (numărul afișat, nu doar iconiță).

### `/` Harta (aplicație pe tot ecranul, fără scroll)

- Header flotant peste hartă, translucid dar **fără backdrop-blur** (blur-ul e semn de AI), înălțime fixă `--header-h`, harta primește `padding-top` egal.
- Canvas hartă full-bleed, satelit, top-down.
- **Sidebar stânga (desktop), bottom-sheet (mobil):**
  - Selector proiect (3 proiecte + „Toate")
  - Status: 4 comutatoare care sunt în același timp **legenda și filtrul** (un singur element cu două roluri, detaliu de om, nu de generator)
  - Suprafață: range dublu 350-1000 mp
  - Preț total: range dublu
  - Buton „Resetează"
  - Contor live: „147 loturi disponibile din 787" plus „Actualizat 12 august 2026" (semnalul de credibilitate specific nișei, preluat de la tei.ro/eForest)
- **Popup pe click pe lot** (max-width 320px): cod lot, proiect, suprafață mp, deschidere ml, preț total, preț/mp, linie de status, mențiunea „prețul nu conține TVA", butoane: Sună, Copiază link, Vezi proiectul. Deep-link `?proiect=X&lot=Y`, citit înapoi la încărcare.
- Hover: contur îngroșat + tooltip mic cu cod și suprafață.
- Control discret dreapta-jos: Satelit / Hartă, zoom +/-, „Reîncadrează".
- Nota obligatorie în colț: „Parcelare ilustrativă. Limitele afișate au caracter informativ și nu înlocuiesc măsurătoarea cadastrală."

### `/proiect/[slug]` (scroll clasic, aici trăiește numitorul comun)

În ordinea pieței, adaptată:
1. Hero cu fotografie reală (dronă): nume proiect, comună/județ, „X km de Piața Victoriei, Y km de A0", „de la Z €/lot"
2. Cifre: nr. loturi, suprafețe de la-la, front minim, preț de la, suprafață totală parcelare
3. Despre parcelare: 2-3 paragrafe specifice, cu detaliu concret de proces (ce lucrări s-au făcut, când)
4. **Utilități**, cu cifre nu bife: „curent 15 kW la limita lotului", „gaz în stradă", „stație de epurare proprie", „drum 8 m, piatră concasată compactată, deszăpezire iarna"
5. **Regim urbanistic și acte:** intravilan prin PUZ aprobat, POT, CUT, regim înălțime, front minim, cadastru și intabulare individuală, extras CF fără sarcini
6. **Loturi disponibile:** tabel Lot | Suprafață | Deschidere | Preț | Preț/mp | Status, sortabil și filtrabil, fiecare rând cu „Vezi pe hartă" care duce în `/?proiect=...&lot=...`. Tabelul e legat bidirecțional cu harta, pattern-ul de la zorisenine.ro. Rol dublu: e conținut crawlabil (harta nu e) și e alternativa accesibilă la hartă.
7. Localizare: mini-hartă statică, timpi de acces (DN1, A3, A0, Centura), facilități în zonă enumerate nominal
8. Finanțare, dacă proiectul are (avans, luni, dobândă)
9. Galerie: dronă, teren, infrastructură reală (stâlpi, cutii de gaz, țăruși de hotar, drum). 4/7 site-uri din nișă au poze de infrastructură brută, e „dovada" că utilitățile există.
10. CTA final: telefon + programare vizionare

### `/contact`

Telefon cu nume de persoană (pattern verificat: „Ciprian Branișteanu, Direct Dezvoltator"), program, formular simplu (nume, telefon, lot/proiect de interes precompletat din deep-link, mesaj, GDPR), adresă și hartă de acces, mențiunea „vizionările se fac doar cu programare".

### La faza reală se adaugă

`/termeni`, `/confidentialitate`, `/cookies`, banner GDPR, credit „made by RTR" în footer. La demo, nu.

**Diferența față de numitorul comun: circa 10%.** Singura mutare structurală e că harta urcă din poziția 7 în poziția 1. Tot restul rămâne în ordinea pieței.

---

## 3. DIRECȚIA VIZUALĂ

### 3.1 Limbajul de obiect

Nu limbaj de landing. **Limbajul planului de situație și al extrasului de carte funciară**: hârtie ușor caldă, tuș aproape negru, hairline-uri de 1px, cifre monospațiate aliniate în coloană, cod de lot scris ca pe planșă. Piața are 5 din 7 site-uri pe WordPress 2010-2015, deci bara e joasă și diferențierea se obține din rigoare, nu din efecte.

### 3.2 Paletă

Numitorul comun al nișei e verde + alb (4-5 din 7: `#58b32b`, `#6cbd45`, `#4aa485`, iar Dumbrava premium `#367456` + auriu). Rămânem în familie, dar cu un verde desaturat, de plan topografic, nu de landing.

```css
:root {
  /* neutre */
  --paper:      #F4F1EA;  /* fundal panouri, secțiuni */
  --paper-2:    #EAE5DA;  /* fundal alternativ, rânduri de tabel */
  --hairline:   #D8D2C4;  /* linii 1px */
  --ink:        #15181A;  /* text principal, butoane primare */
  --ink-2:      #565D62;  /* text secundar, etichete */
  --ink-3:      #8A9095;  /* text terțiar, note */

  /* accent unic */
  --accent:     #2F5D46;  /* verde brad desaturat: linkuri, focus, hover, accente */
  --accent-alt: #244A38;  /* hover pe accent */
}
```

Un singur accent. Butonul primar e **ink** (negru), nu verde, nu colorat. Fără gradient nicăieri.

### 3.3 Culorile celor 4 statusuri

Statusurile nu sunt culori de brand, sunt un cod de semnalizare tehnic. Le ținem desaturate ca să trăiască peste satelit (imagine bogată, saturată) fără să pară semafor.

| Status | Fill | Fill opacity | Contur | Tratament suplimentar |
|---|---|---|---|---|
| `disponibil` | `#3F8F5D` | 0.42 | `#245F3B`, 1.5px | contur continuu |
| `rezervat` | `#C08A2A` | 0.38 | `#8A6114`, 1.5px | contur continuu |
| `in_pregatire` | `#3E6B7A` | 0.30 | `#2A4E5A`, 1.5px | **contur punctat** (`line-dasharray: [2,2]`) |
| `vandut` | `#5C6166` | 0.22 | `#43484C`, 1px | **hașură diagonală**, etichetă ștearsă |

Decizia importantă: **vândut nu e roșu.** În piață e roșu (casatei.ro `#ba2a41`), dar roșul atrage ochiul exact pe ce nu se poate cumpăra. Vândutul se retrage în gri cu hașură, exact ca pe o planșă reală unde parcelele ieșite din stoc se hașurează. Verdele disponibil devine automat singurul lucru viu pe hartă. Este și detaliul care spune „a desenat un om asta", nu „a generat un tool patru culori din paletă".

### 3.4 Basemap

**Satelit ca default**, cu toggle discret Satelit/Hartă.

Motiv: la zoom 16 peste un teren agricol din Corbeanca, basemap-ul de străzi e o suprafață goală beige, nu comunică nimic. Satelitul arată exact ce cumperi: dacă e plat, dacă are vecini construiți, cât de departe e pădurea, unde intră drumul. Clientul a cerut explicit „să se vadă exact unde e terenul".

Peste satelit punem un layer subțire doar cu drumuri și etichete (DN1, A3, A0, numele comunelor), altfel utilizatorul se pierde. Etichetele: `#FFFFFF` cu halo `rgba(0,0,0,0.55)`, IBM Plex Sans 500.

**Pitch 0, top-down.** Referința (berceni) folosește `pitch: 60`. Nu îl copiem: pe o parcelare plată, înclinarea deformează dreptunghiurile și nu adaugă informație, e efect de demo. Top-down citește ca un plan de situație, ceea ce e chiar limbajul nișei.

**Bearing rotit pe axa drumului**, ca parcelarea să stea dreaptă pe ecran, ca pe o planșă. Pentru Corbeanca-Ostratu (azimut drum 56°): `bearing: -34`.

### 3.5 Tipografie

- **Titluri: Newsreader** (Google Fonts), 400 și 500, optical size activ. Serif editorial, cu personalitate, dar nu Playfair (defaultul de landing). În tot eșantionul de vânzători de loturi, **zero site-uri folosesc serif pe titluri**, deci e diferențiere gratuită.
- **Body și UI: IBM Plex Sans**, 400/500/600. Are un ton tehnic-instituțional care se potrivește cu fișa de urbanism și nu cu landing-ul de startup.
- **Cifre: IBM Plex Mono**, 400/500. Coduri de lot, suprafețe, prețuri, POT/CUT, coordonate. `font-variant-numeric: tabular-nums` pe tabelul de loturi, ca să se alinieze coloanele.

`font-display: swap`, subset latin + latin-ext.

**De verificat la implementare:** redarea corectă a `ș` și `ț` cu virgulă dedesubt (nu cu sedilă) în Newsreader. Dacă Newsreader nu o are curat, fallback pe **Source Serif 4**, care o are sigur. Nu declar înainte să văd textul randat.

Scale cu `clamp()`, line-height 1.6 pe body, 1.15 pe titluri.

### 3.6 Cum evităm să pară făcut de AI (concret, pe acest proiect)

De evitat:
- Zero emoji, inclusiv în legendă și în butoane. Mega Parc are 📈🚇🌳 în titluri, e exact anti-pattern-ul.
- Fără glassmorphism/backdrop-blur pe panourile de peste hartă. Panou = hârtie opacă `--paper` + border 1px `--hairline` + umbră `0 1px 2px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.10)`.
- Fără carduri flotante cu cifre („0% dobândă", „PUZ aprobat") peste hero.
- Fără etichete uppercase cu letter-spacing deasupra secțiunilor. Titlurile de secțiune sunt propoziții: „Ce utilități ajung la lot", nu „UTILITĂȚI".
- Fără grilă de 4 carduri identice rotunjite pentru avantaje. Utilitățile se prezintă ca **listă de specificații cu valori**, două coloane, hairline între rânduri, ca o fișă tehnică.
- Fără poze stock cu familii zâmbind. Nișa are 0-1 din 7 poze cu oameni; fotografia standard e drona și infrastructura brută.
- Fără pill-uri colorate. Radius 8px pe butoane și panouri, 4px pe input-uri și badge-uri de status. Nimic peste 12px.
- Fără săgeți „→" în butoane.

De aplicat:
- Un singur CTA dominant per ecran, telefonul.
- Copy specific: nu „utilități complete", ci „curent 15 kW la limita fiecărui lot, branșament individual, contract Enel semnat în martie 2026".
- Data ultimei actualizări a disponibilității, vizibilă. Semnal de credibilitate propriu nișei.
- Diacritice corecte peste tot (3 din 12 site-uri analizate nu au deloc diacritice; e o diferență pe care clientul o vede imediat).
- Tranziții 150-200ms `ease-out`. `prefers-reduced-motion` respectat, inclusiv pe `flyTo` (înlocuit cu `jumpTo`).

---

## 4. STACK RECOMANDAT PENTRU HARTĂ

### Recomandare unică: **MapLibre GL JS + tiles MapTiler**, pe un site Astro static.

- **Demo:** MapLibre GL JS (BSD-3, fără cont, fără token) + cheie MapTiler **free** (planul lor permite explicit uz de evaluare). **Cost: 0 lei.**
- **Proiect real:** aceeași bază, se trece pe **MapTiler Flex, 30 USD/lună** (25.000 sesiuni, satelit inclus, uz comercial permis). Peste 25k sesiuni, 2,50 USD/1.000.
- Date: `loturi.geojson` servit static din `/public`, încărcat ca sursă `geojson`. **Fără backend.** Referința are API propriu, nu ne trebuie: la sub 1.000 de poligoane, un fișier static e mai rapid decât un API.
- Rulează pe Hostinger shared, output Astro static.

**De ce nu Mapbox GL JS v3**, deși e 0 lei până la 50.000 map loads: licența e proprietară din v2, se termină automat odată cu contul, interzice modificarea codului de billing, iar la 100.000 loads ajungi la 250 USD/lună. Cu MapLibre schimbi furnizorul de tiles printr-un singur URL (MapTiler, OpenFreeMap, self-host Protomaps) fără să atingi o linie din logica de poligoane, filtre sau popup.

**De ce nu Google Maps:** creditul de 200 USD a dispărut din 1 martie 2025, la 30.000 vizite plătești circa 140 USD/lună, iar ToS-ul interzice folosirea conținutului Google lângă o hartă non-Google, deci lock-in total.

**De ce nu Leaflet:** fără vector tiles, fără pitch/bearing, randare SVG care se împotmolește la mii de poligoane.

**De ce nu ANCPI ca basemap:** platformele ANCPI sunt oprite (anunț 18 august 2026, geoportal.ancpi.ro returnează NXDOMAIN), nu există WFS public, bulk download interzis, licența cere atribuire și limitează folosirea, iar lanțul SSL e rupt. Se poate oferi eventual ca layer opțional comutabil, la faza reală, doar după confirmare scrisă de la ANCPI.

**De confirmat înainte de contract:** că MapTiler Satellite e inclus pe Flex 30 USD (pagina de pricing nu detaliază per plan) și rezoluția reală a satelitului peste coordonatele exacte ale parcelării.

---

## 5. MODEL DE DATE

Inspirat din referință, curățat. Trei diferențe față de comunaberceni.ro: statusul devine string în loc de `0-3` (se citește singur în filtre și în CMS), preț/mp devine câmp calculat la build (nu se stochează două numere care pot diveghea), și adăugăm `front` (deschiderea în ml), care e în tabelul a 5 din 7 site-uri din nișă și lipsește din referință.

### `src/data/loturi.geojson` (FeatureCollection, Polygon, WGS84, 6 zecimale)

```jsonc
{
  "type": "Feature",
  "geometry": { "type": "Polygon", "coordinates": [[ /* lon, lat */ ]] },
  "properties": {
    "id":         "corbeanca-ostratu-a-014",  // string, stabil, cheie de deep-link
    "cod":        "A14",                      // string, ce vede omul
    "proiect":    "corbeanca-ostratu",        // string, slug, FK spre proiecte.json
    "status":     "disponibil",               // enum: disponibil | rezervat | vandut | in_pregatire
    "suprafata":  542,                        // number, mp, întreg
    "front":      18.4,                       // number, ml, 1 zecimală
    "pret_total": 37940,                      // number, EUR, întreg, fără TVA
    "pret_mp":    70,                         // number, EUR/mp, calculat la build
    "tva_inclus": false,                      // boolean
    "observatii": null,                       // string | null ("colț", "vecin pădure")
    "actualizat": "2026-08-12"                // string, ISO date
  }
}
```

### `src/data/proiecte.json`

```jsonc
{
  "slug": "corbeanca-ostratu",
  "nume": "Ostratu, Corbeanca",
  "localitate": "Corbeanca",
  "judet": "Ilfov",
  "descriere": "…",
  "camera":   { "center": [26.05772, 44.60268], "zoom": 15.8, "bearing": -34, "pitch": 0 },
  "bbox":     [26.0512, 44.5991, 26.0642, 44.6062],

  "utilitati": [
    { "tip": "curent",     "stare": "la_lot",    "detaliu": "15 kW, branșament individual" },
    { "tip": "gaz",        "stare": "in_strada", "detaliu": "conductă pe drumul principal" },
    { "tip": "apa",        "stare": "la_lot",    "detaliu": "rețea proprie, foraj 82 m" },
    { "tip": "canalizare", "stare": "proiectat", "detaliu": "stație de epurare, T4 2026" },
    { "tip": "fibra",      "stare": "in_zona",   "detaliu": null },
    { "tip": "drum",       "stare": "la_lot",    "detaliu": "8 m, piatră concasată compactată" }
  ],
  // stare: la_lot | in_strada | in_zona | proiectat

  "urbanism": {
    "intravilan": true, "instrument": "PUZ aprobat HCL 41/2024",
    "pot": 30, "cut": 1.0, "regim_inaltime": "P+1E+M", "front_minim": 14
  },
  "acte": { "cadastru_individual": true, "intabulare": true, "sarcini": false },

  "finantare": { "avans_procent": 20, "luni": 36, "dobanda": 0 },  // sau null

  "statistici": { "total": 274, "disponibile": 96, "suprafata_min": 517, "suprafata_max": 571,
                  "pret_mp_min": 65, "pret_mp_max": 85 },  // calculate la build

  "contact": { "persoana": "…", "telefon": "+40 7xx xxx xxx", "whatsapp": null },
  "galerie": [ { "src": "…", "alt": "…", "tip": "drona | teren | infrastructura | progres" } ],
  "actualizat": "2026-08-12"
}
```

### `src/data/poi.geojson`

```jsonc
{ "type": "Feature", "geometry": { "type": "Point", "coordinates": [26.0862, 44.5734] },
  "properties": {
    "nume": "Băneasa Shopping City",
    "categorie": "comert",   // acces | transport | scoala | sanatate | comert | agrement
    "distanta_km": 12.4, "timp_min": 18
  }}
```

Câmpuri din referință pe care le **eliminăm** deliberat: `type` (aveam un singur tip), `projectName`/`projectUrl`/`projectRates`/`projectUtilities` duplicate pe fiecare lot (2457 de repetări ale aceluiași string; le ținem o dată în `proiecte.json`), `withImageMarker`, `projectObservations`.

---

## 6. PLAN PENTRU DEMO

### 6.1 Ce construim, în ordine

| Pas | Ce | Timp |
|---|---|---|
| 1 | Scaffold Astro + tokenii de design (paletă, fonturi, spacing, radius), header/footer | 2h |
| 2 | Generare date demo: 3 parcelări GeoJSON + `proiecte.json` + `poi.geojson`, prețuri și statusuri realiste | 2h |
| 3 | `/` harta: MapLibre + satelit MapTiler + layere fill/line per status + hover + popup | 4h |
| 4 | Sidebar: selector proiect, legendă-filtru de status, range suprafață, range preț, contor live, reset | 3h |
| 5 | Deep-link `?proiect=&lot=`, buton „Copiază link", flyTo la selectarea proiectului | 1,5h |
| 6 | `/proiect/[slug]`: toate cele 10 secțiuni, cu tabelul de loturi legat bidirecțional de hartă | 5h |
| 7 | `/contact` + responsive complet (bottom-sheet pe mobil, popup ca bottom card) + verificare vizuală la 360/768/1280 și pe înălțimi mici | 3h |
| 8 | Opțional, dar recomandat pentru pitch: `/demo-admin`, 100% client-side, MapLibre + Terra Draw (MIT), desenezi poligon, completezi cod/suprafață/preț/status, „Descarcă GeoJSON". Nu salvează nimic, dar clientul vede exact fluxul lui viitor de administrare. | 4h |

Total: circa 2,5-3 zile cu pasul 8, 2 zile fără. Cost software: 0.

### 6.2 Date demo: unde exact, cu ce coordonate

Trei parcelări generate programatic peste terenuri agricole reale din OSM (`landuse=meadow`, deci libere), cu grilă aliniată la azimutul drumului adiacent, drumuri interioare de 8 m, randament 72% (restul e drum, ca în realitate). Suprafețele sunt recalculate din coordonatele GeoJSON finale, eroare maximă 0,50 mp; zero suprapuneri, colțuri la 90,00°.

| Proiect | Centroid (lat, lon) | Loturi | Suprafețe | Azimut | Camera | Rol în demo |
|---|---|---|---|---|---|---|
| **Ostratu, Corbeanca** | `44.60268, 26.05772` | 274 | 517-571 mp | 56° | `zoom 15.8, bearing -34` | proiect matur, 60% vândut. Azimutul oblic arată clar că parcelarea e aliniată la drum, nu grilă N-S generică |
| **Săftica, Balotești** | `44.61537, 26.06706` | 292 | 564-623 mp | 90° | `zoom 15.7, bearing 0` | lansare nouă, 70% disponibil. La 200 m de A0 |
| **Moara Vlăsiei** | `44.64650, 26.21490` | 221 | 666-735 mp | 67° | `zoom 15.6, bearing -23` | loturi mari, profil pădure/lac, 2,1 km de A3, majoritar „în pregătire" |

**Camera inițială (toate proiectele):** `center: [26.1132, 44.6215], zoom: 11.2, bearing: 0, pitch: 0`. Se văd cele trei grupuri plus nordul Bucureștiului. La selectarea unui proiect, `flyTo` pe camera lui.

**Distanțe reale, calculate geodezic față de Piața Universității și de geometria drumurilor:** Corbeanca 19,0 km de centru / 1,01 km de A0 / 1,10 km de DN1; Balotești 20,3 km / 0,20 km de DN1; Moara Vlăsiei 25,2 km / 2,14 km de A3. Le folosim în copy pentru că sunt corecte.

**Prețuri demo, calibrate pe piața reală** (Ideal Forest Ciolpani 47-69 €/mp, terenuri-balotesti 31-58 €/mp, Mega Parc de la 59 €/mp): Corbeanca 65-85 €/mp, Balotești 55-70 €/mp, Moara Vlăsiei 45-60 €/mp. Toate „+ TVA", ca în piață.

**Distribuție de status per proiect** (nu uniformă, ar arăta generat): Corbeanca 58% vândut / 6% rezervat / 32% disponibil / 4% în pregătire. Balotești 12% / 9% / 68% / 11%. Moara Vlăsiei 5% / 4% / 33% / 58%.

### 6.3 Obligatoriu pe demo

Poligoanele stau peste **terenuri reale care aparțin altcuiva** (parcele agricole existente în Corbeanca, Balotești, Moara Vlăsiei). Demo-ul trebuie să poarte, vizibil, nu în footer: **„Demonstrație. Parcelare, prețuri și disponibilitate fictive."** Fără asta, o pagină publică poate fi citită ca ofertă reală pe teren care nu e al clientului. Când clientul semnează, se înlocuiesc cu geometria lui reală și nota dispare.

Atribuire obligatorie în colțul hărții: „© MapTiler © OpenStreetMap contributors" (ODbL).

Nu punem încă: SEO, keyword research, banner cookie, pagini legale, ANPC. Acelea intră la faza reală, conform fluxului.

---

## 7. CE URMEAZĂ DUPĂ DEMO

### 7.1 Recomandarea pentru proiectul real: **Directus + Postgres/PostGIS, pe VPS + Coolify**

Motivul e unul singur și e decisiv: **Directus e singura opțiune unde desenarea poligonului pe hartă e feature nativ de produs, testat, nu cod pe care îl întreținem noi.** Are tipuri geospațiale reale (`Polygon`, `MultiPolygon`, stocate ca GeoJSON) și o interfață Map cu desenare directă în admin (confirmat în `app/package.json`: `maplibre-gl`, `@mapbox/mapbox-gl-draw`, `@turf/meta`).

Arhitectura:
- Colecții: `proiecte` și `loturi`, exact schema din secțiunea 5. `pret_mp` ca field calculat. `proiect` ca relație M2O.
- Rol dedicat pentru client, cu acces doar la cele două colecții, colecțiile de sistem ascunse, labeluri în română, câmpuri reordonate. Nu vede că e o bază de date.
- Postgres cu imaginea `postgis/postgis` (obligatoriu, altfel eroarea `type "geometry" does not exist`). Minim 1 vCPU / 2 GB.
- Publicare: webhook Directus care declanșează GitHub Actions, build Astro, deploy pe Hostinger. Dacă statusurile se schimbă des și clientul vrea instant, Astro în mod SSR pe același VPS, cu cache scurt, fără rebuild.
- Licență: MSCL-1.0-GPL, tier Core gratuit (3 utilizatori, 25 colecții). Noi folosim 2 colecții și 2 utilizatori. **Cost software: 0.** Cost real: VPS-ul, pe care Mario îl are deja.

### 7.2 Ce NU recomand aici

- **Keystatic**, deși e stack-ul preferat: nu are câmp `json` sau geo (verificat în lista completă de field-uri din `@keystatic/core@0.6.7`), iar field-ul custom s-ar sprijini pe un API nedocumentat pe care maintainerii discută explicit să îl închidă (issue Thinkmill/keystatic#464). Rămâne bun pentru texte și blog pe alte proiecte.
- **TinaCMS** doar dacă clientul insistă să rămână totul pe Hostinger shared: e singura variantă în care panoul de admin stă pe hosting static (`/admin` ca SPA + TinaCloud comite în GitHub). Costă însă circa 2 zile de componentă custom de hartă și te blochează la 2 utilizatori pe planul free.
- **PocketBase**: stochează GeoJSON în câmp JSON, dar dashboard-ul nu e extensibil (poziția oficială a maintainerului), deci clientul ar vedea GeoJSON brut într-un textarea. Ar trebui un admin SPA propriu, 3-5 zile.

### 7.3 Două detalii operaționale care decid proiectul

1. **Sistemul de coordonate.** Planul de la topograf (DXF/DWG sau extras ANCPI) vine în **EPSG:3844, Stereo70**, în metri. GeoJSON cere WGS84. Conversia se face o singură dată, în QGIS sau cu `pyproj.Transformer.from_crs(4326, 3844)`. Desenatul manual peste satelit dă eroare de 1-3 m, acceptabil pentru marketing, inacceptabil pentru acte, iar asta trebuie scris pe site.
2. **Frecvențele de editare sunt diferite.** Geometria se setează o dată per parcelare și nu se mai schimbă. Statusul se schimbă săptămânal. Orice arhitectură alegem, se optimizează pentru „schimbă statusul în două clicuri, de pe telefon", nu pentru desenat. Directus face asta bine; un CMS pe Git ar face-o cu 1-3 minute de rebuild până se vede pe site.

---

## 8. RISCURI ȘI ÎNTREBĂRI DESCHISE

### 8.1 Riscuri tehnice

1. **Rezoluția satelitului peste parcelarea reală.** MapTiler dă 1 m/px în zonele populate, 2 m/px în rest. Peste un teren agricol din Ilfov poate fi 2 m/px și imaginea poate fi veche de 2-3 ani, adică fără drumurile pe care clientul le-a făcut anul trecut. **De verificat pe coordonatele exacte, înainte de contract.** Plan B: ortofoto propriu din dronă, geo-referențiat și servit ca raster tiles din `/public`, care e oricum mai convingător.
2. **Confirmare MapTiler Flex.** Pagina de pricing nu detaliază disponibilitatea satelitului per plan. De confirmat în scris cu sales înainte să promitem 30 USD/lună.
3. **Precizia limitelor.** Poligoanele desenate peste satelit au 1-3 m eroare. Trebuie disclaimer permanent pe hartă, altfel e expunere juridică la vânzare.
4. **Harta ca landing costă SEO.** Pagina `/` nu are text crawlabil. Mitigare deja în structură: `/proiect/[slug]` poartă tot conținutul indexabil, inclusiv tabelul de loturi. La faza reală, keyword research pe „loturi [comună]", „teren de vânzare Corbeanca", „parcelare Balotești", unde SERP-ul e ocupat 100% de portaluri și niciun dezvoltator nu e în top 10, deci e teren aproape liber.
5. **Accesibilitate.** O hartă nu e navigabilă la tastatură. Tabelul din pagina de proiect e alternativa formală, trebuie linkat explicit din pagina hărții („Vezi lista completă de loturi").
6. **Performanță pe mobil.** MapLibre GL adaugă circa 200 KB gzip. Se încarcă doar pe `/`, restul site-ului rămâne zero JS (Astro). Poligoanele sub 1.000 nu pun probleme; peste 5.000, se trece pe `.pmtiles`.
7. **A0 Nord e parțial deschisă.** În OSM: 44 segmente deschise, 37 în construcție (Lot 1 și Lot 3). Distanțele calculate sunt doar față de segmentele deschise. **Nu scriem „acces direct la A0" fără să verificăm lotul exact.**
8. **ANCPI e oprit** (anunț 18 august 2026). Nu construim nimic care depinde de el.

### 8.2 Riscuri de proiect

9. Dacă clientul nu actualizează statusurile, harta devine o minciună vizibilă și se întoarce împotriva lui. De aceea data ultimei actualizări e afișată: e presiune constructivă.
10. Demo-ul cu date fictive peste terenuri reale ale altora nu trebuie indexat. `robots.txt` cu `Disallow: /` și `noindex` pe demo.

### 8.3 Întrebări pentru client, înainte să construim

**Blocante pentru demo (răspuns necesar acum):**
1. Câte parcelări are efectiv și în ce comune? Demo-ul se face pe zonele lui reale sau pe cele trei propuse de noi (Corbeanca, Balotești, Moara Vlăsiei)?
2. Prețurile se afișează public sau doar „la cerere"? Piața e împărțită 50/50 și decizia schimbă structura hărții.
3. Vrea 4 statusuri (disponibil, rezervat, vândut, în pregătire) sau doar 3?
4. CTA principal: telefon (standardul nișei, 7 din 7) sau WhatsApp (diferențiator, 0 din 7 la vânzătorii de loturi)? Recomand telefon vizibil în header plus WhatsApp ca secundar în popup.

**Necesare pentru proiectul real:**
5. Are planul de parcelare de la topograf în DXF/DWG, și în ce sistem (presupun Stereo70)? Fără el, geometria se desenează manual peste satelit, cu eroarea aferentă.
6. PUZ aprobat? Numărul hotărârii de consiliu local, POT, CUT, regim de înălțime, front minim. Sunt secțiunea obligatorie a nișei, 5 din 7 o au.
7. Care e starea reală a fiecărei utilități pe fiecare parcelare (la lot / în stradă / în zonă / proiectat)? Nișa cere cifre, nu bife.
8. Cadastru și intabulare individuală pe fiecare lot, fără sarcini? E argumentul de încredere numărul unu.
9. Oferă rate direct la dezvoltator? Dacă da: avans, număr de luni, dobândă.
10. Are fotografii proprii, în special dronă și infrastructură (stâlpi, branșamente, drum)? Sunt elementul vizual cel mai valoros din nișă. Dacă nu, la faza reală merită o zi de filmare cu drona, e cea mai ieftină diferențiere posibilă.
11. Vinde și case sau doar teren? Cinci din șapte site-uri au secțiune de servicii (proiect de casă, autorizație, ofertă de construcție) cu prețuri fixe.
12. Cine actualizează statusurile și de pe ce dispozitiv? Răspunsul decide între Directus și un panou custom.
13. Nume de persoană și telefon direct pentru pagina de contact. Piața folosește formula „Nume Prenume, Direct Dezvoltator" și funcționează.
14. Domeniu și găzduire: are deja ceva sau pornim de la zero? Recomandarea mea: VPS + Coolify din start, pentru că proiectul are backend la faza reală.