# Ce merită implementat

Filtrul aplicat: schimbă decizia de cumpărare ȘI se poate calcula din geometria loturilor + parametrii de urbanism pe care îi avem deja. Tot ce cere date pe care nu le deținem (cadastru real, geo, rețele) sau server a căzut în C.

Datele existente per lot: poligon, `suprafata`, `front`, `laturi`, `pret_total`, `pret_mp`, `status`, `sir`, `actualizat`. Per parcelare: `pot`, `cut`, `regim`, `frontMinim`, `azimut`, `azimutNormala`, `utilitati[].stare`, `distante`, `finantare`, `hotar`.

Ca să funcționeze A și B, clientul trebuie să dea **10 numere per parcelare**, nu surse noi de date: cele trei retrageri (aliniament / laterală / posterioară, din PUZ), `h_cornisa`, `regim_construire` (izolat/cuplat), `tip_drum` (public sau privat în cotă) + lățimea lui, `categorie_folosinta`, și costul de racordare pentru fiecare utilitate care nu e „la lot".

---

## A. Impact mare, efort mic

### A1. „Ce casă intră pe lotul ăsta" (cifrele)

**Ce vede:** pe cardul de lot din hartă și pe `/lot/[id]`, patru numere și o propoziție: amprentă maximă la sol 180 mp, desfășurat maxim 420 mp, util estimat 345 mp, lățime maximă de casă 10,0 m, „te leagă POT-ul" (sau CUT-ul, sau geometria retragerilor, sau regimul de înălțime).

**Date:** `suprafata`, `front`, geometria lotului, `pot`, `cut`, `regim`, plus cele trei retrageri și `regim_construire`.

**Calcul** (rulează în `genereaza-date.mjs`, la build):
```
adancime  = extinderea poligonului pe direcția azimutNormala   (NU suprafata/front)
AC_pot    = suprafata × POT / 100
L_util    = front − 2 × r_lateral        (izolat)   |   front − r_lateral (cuplat)
D_util    = adancime − r_aliniament − r_spate
AC_geo    = L_util × D_util
AC_max    = min(AC_pot, AC_geo)
N         = 1 (P) | 2 (P+1) | 3 (P+2);  + 0,6 dacă se admite mansardă
ADC_max   = min(suprafata × CUT, AC_max × N)
util      ≈ 0,82 × ADC_max
constrangere = argmin(AC_pot, AC_geo) și argmin(CUT, regim)
dacă L_util ≤ 0 sau D_util ≤ 0  =>  „neconstruibil direct, necesită PUD"
dacă front < frontMinim          =>  „sub frontul minim din PUZ, doar cuplat sau cu PUD"
```
Sub bloc, o linie fixă: „orientativ, calculat din PUZ HCL 41/2024; singurul document opozabil e certificatul de urbanism emis pentru acest lot".

**De ce contează:** e prima întrebare din fiecare fir de forum și literalmente niciun anunț de teren din RO nu o are (Storia nu are nici măcar câmp pentru POT). Traduce POT/CUT, doi termeni pe care majoritatea nu îi cunosc, în „casă de 10 pe 14 metri, parter plus etaj". Fără asta, restul site-ului e încă un anunț frumos.

### A2. Edificabilul desenat pe lot + lățimea construibilă ca filtru

**Ce vede:** în interiorul lotului selectat, pe hartă și peste imaginea aeriană din `/lot/[id]`, poligonul pe care se poate construi efectiv, hașurat, cotat („14 × 22 m"), cu benzile de retragere marcate 3 / 3 / 5. În sidebar, filtru nou: „lățime construibilă minimă", slider 6 la 14 m. În tabelul de loturi, coloană nouă „lățime construibilă".

**Date:** geometria lotului, `azimutNormala`, `sir` (spune care latură dă la stradă, exact ca la camera de nivelul solului), retragerile.

**Calcul:** rotește poligonul în cadrul local u/v cu `−azimutNormala` (funcția există deja în `parcelare.js`); în cadrul local, retrage bbox-ul cu `r_lateral` pe u de ambele părți, cu `r_aliniament` pe latura străzii și `r_spate` pe cea opusă; intersectează dreptunghiul cu poligonul lotului (`@turf/intersect`, deja instalat); rotește înapoi. Se salvează ca `edificabil.geojson` plus proprietățile `edificabil_mp` și `latime_construibila` pe fiecare lot. Zero cost în browser, filtrarea rămâne `map.setFilter`.

**De ce contează:** „poți găsi un teren cu deschidere de 15 m și, după retrageri, îți mai rămâne spațiu cât pentru un coteț de găini". Pe loturile dreptunghiulare rezultatul e banal, dar pe cele de hotar, cu până la 23 de laturi, suprafața din anunț minte cel mai tare, iar acelea sunt exact loturile rămase nevândute. Desenul le vinde sau le scoate din discuție onest, ambele mai bune decât un cumpărător care descoperă singur.

### A3. Bugetul până la prima lopată

**Ce vede:** sub preț, o listă scurtă și un total: preț lot, TVA, onorariu notarial estimat (interval), intabulare 0,15%, racordări defalcate pe curent / apă / gaz / canalizare cu cine plătește, apoi „total până poți începe casa: 74.200 lei peste prețul terenului". Rata lunară existentă rămâne dedesubt.

**Date:** `pret_total`, `tva_inclus`, `finantare`, `utilitati[].stare` (există toate), plus costul de racordare per utilitate, dat de client o dată per parcelare.

**Calcul:** `intabulare = 0,0015 × pret`; onorariul notarial ca interval din grilă; `racordare = suma peste utilitățile cu stare ≠ „la lot"`; impozitul de 1% sau 3% se marchează explicit ca fiind în sarcina vânzătorului, ca să nu pară că e al cumpărătorului. Aritmetică pură, la runtime.

**De ce contează:** „cu utilitățile poți să iei o mare țeapă la costuri, extindere de rețea 20.000 la 50.000 lei". Cumpărătorul are un buget total, nu un buget de teren, iar cifra asta nu apare pe niciun anunț din România. Un vânzător care o pune singur pe masă se scoate automat din categoria „încearcă să mă păcălească".

### A4. Orientarea și unde cade curtea

**Ce vede:** pe fișă, o roză mică cu nordul plus o propoziție: „deschidere la nord-est, curtea din spate la sud-vest, soare de după-amiază pe terasă". Pe hartă, indicator de nord care se rotește cu `bearing`-ul camerei.

**Date:** `azimutNormala`, `sir`, centroidul lotului. Nimic nou.

**Calcul:** `azimut_strada = (azimutNormala + 180 × sir) mod 360`; `azimut_curte = azimut_strada + 180`; mapare pe 8 sectoare de 45 de grade în etichete; regulă de comentariu: S și SE pentru living plus terasă, V înseamnă supraîncălzire vara, N înseamnă curte rece tot anul.

**De ce contează:** e întrebarea pusă pe forum („Orientare? Vreun red flag?") la care nu i-a răspuns nimeni. Costă câteva linii, apare pe toate cele 747 de loturi și e singurul lucru care diferențiază două loturi cu aceeași suprafață și același preț. Ajută direct la vândut stocul greu: lotul din rândul doi devine cel cu curtea la sud.

### A5. Ce e confirmat, ce nu, și de când

**Ce vede:** o listă unde fiecare rând are stare, dată și sursă: „PUZ aprobat prin HCL 41/2024", „curent: branșament 15 kW, în funcțiune din martie 2026", „canalizare: **nu există azi**, stație de epurare cu recepție estimată T4 2026", „drum: 8 m, piatră compactată, în domeniul public al comunei", „preț neschimbat de 4 luni". Și explicit ce lipsește: „acest lot nu are studiu geotehnic".

**Date:** `utilitati[].stare` și `.detaliu`, `urbanism.instrument`, `actualizat` (toate există), plus `tip_drum` și `categorie_folosinta`.

**Calcul:** „preț neschimbat de N luni" din diferența dintre azi și `actualizat`. Restul e o regulă de afișare, nu un calcul: orice stare diferită de „la lot" se scrie ca lipsă în prezent, nu ca prezență în viitor. Interzis pe tot site-ul: „utilități la poartă", „propus pentru intravilan", „zonă în dezvoltare".

**De ce contează:** publicul intră pe un site de terenuri presupunând că e mințit, iar formulările de marketing sunt deja decodate public pe forumuri. Ce convertește nu e fotografia, e informația cu dată pe ea. Și un site care își afișează minusurile („canalizarea nu e gata") e crezut și pe restul.

*Dacă mai rămâne timp, tot din categoria ieftină: shortlist de 2 la 3 loturi comparate pe aceleași rânduri, cu link partajabil pe WhatsApp care redeschide harta exact în starea aleasă. Deep-link-ul per lot există deja, e o extensie de hash în URL.*

---

## B. Impact mare, efort mediu

### B1. Casa maximă ca volum 3D, în vederea de la stradă

**Ce vede:** când camera coboară la nivelul solului pe un lot, pe lângă lotul ridicat apare volumul casei maxime admise, translucid, la înălțimea reală de cornișă, între casele reale ale satului care sunt deja 3D din vector tiles. Un comutator „arată casa maximă" și un al doilea, „și la vecini", care ridică aceleași volume pe loturile alăturate.

**Date:** poligoanele edificabile de la A2 plus `h_cornisa`.

**Calcul:** sursă GeoJSON separată, layer `fill-extrusion` cu `fill-extrusion-height: h_cornisa`, bază 0, opacitate 0,45, vizibil doar în modul stradal. Vecinii se determină la build din grilă (același `sir` cu `cod` adiacent, plus rândul din spate), nu prin test geometric în browser.

**De ce contează:** la înclinare de 74 de grade un poligon plat nu comunică nimic, iar exact acolo e momentul de decizie. Volumul la 8 m răspunde simultan la două frici din raport: „ce pot construi eu" și „ce mi se construiește lângă". Reciclează camera, extrudarea și clădirile 3D care există deja, deci e cel mai mare efect vizual per zi de muncă din toată lista.

### B2. Alegi casa, harta îți arată loturile pe care intră

**Ce vede:** în sidebar, patru șabloane cu dimensiuni reale: 8 × 10 (parter), 10 × 12, 12 × 14, 9 × 16 (îngustă). Alegi unul și rămân aprinse doar loturile pe care intră, cu contor: „din 100 disponibile, 63 acceptă modelul ăsta". Pe lotul selectat, dreptunghiul modelului se desenează efectiv în edificabil, în orientarea în care încape.

**Date:** poligonul edificabil precalculat (A2) plus dimensiunile șabloanelor.

**Calcul, la build:** cel mai mare dreptunghi înscris în edificabil, aliniat pe direcția rândului. În cadrul local u/v, mătură linii pe v la pas de 0,25 m; pentru fiecare pereche (v1, v2) ia minimul lățimii disponibile pe u în interval și reține maximul produsului. Rezultă `dreptunghi_max: {latime, adancime}` pe fiecare lot. În browser filtrarea e o expresie MapLibre pe două proprietăți, cu test și pe modelul rotit 90 de grade, deci instant pe 747 de loturi.

**De ce contează:** cumpărătorul nu vrea „520 mp", vrea casa pe care a văzut-o și pentru care poate are deja proiect. Inversează căutarea și rezolvă blocajul real din piață: omul cumpără teren fără să știe dacă îi intră casa. Comercial, scoate din stagnare loturile mari și scumpe, pentru că devin singurele pe care intră modelul mare.

### B3. Umbra vecinului iarna

**Ce vede:** pe fișa lotului: „21 decembrie, la prânz: casa de pe lotul din sud poate arunca umbră 20 m, adică până la jumătatea curții tale. 21 iunie: 3 m." Pe hartă, poligonul umbrei desenat, cu selector 21 iunie / 21 decembrie.

**Date:** volumele edificabile ale vecinilor (B1) plus latitudinea din centroid. Nicio sursă externă.

**Calcul:**
```
altitudine_pranz = 90 − latitudine + declinatie      (declinatie: −23,44° pe 21 dec, +23,44° pe 21 iun)
la 44,6° lat:  22,0° iarna,  68,8° vara
lungime_umbra = h_cornisa / tan(altitudine)          8 / tan(22°) ≈ 19,8 m
poligon_umbra = edificabil_vecin translatat pe azimutul soarelui cu lungime_umbra,
                unit cu originalul (@turf/union, deja instalat)
```
Fără librărie de umbre și fără WebGL suplimentar. Cu `suncalc` (2 KB) se poate extinde pe ore, nu doar la prânzul solar.

**De ce contează:** e informația pe care omul o află abia după ce vecinul construiește, adică prea târziu, și e documentat că a făcut oameni să renunțe la un lot. Explică de ce loturile de pe rândul sudic valorează mai mult, deci e și instrument de preț. Faptul că arată clar care loturi sunt mai slabe e o trăsătură, nu un bug: exact asta face site-ul credibil.

---

## C. De evitat

**Cer backend sau stare partajată, imposibile pe static plus localStorage:**
- rezervare online cu depozit și blocare temporară a lotului (Stripe plus lock server-side); pe localStorage e o minciună funcțională
- watchlist cu notificare la lansarea etapei următoare, alerte pe email
- analytics de click per lot; valoros comercial, dar la demo nu ai ce colecta, iar la proiectul real e o linie de `fetch`
- import Excel de listă de prețuri cu diff de status; panoul desenează deja loturile, un parser nu vinde niciun lot la demo, intră cu Directus

**Cer date pe care nu le avem și pe care nu ai voie să le inventezi:**
- straturi de cadastru real, ANCPI/eTerra, plan de rețele, servituți; cea mai valoroasă informație din tot raportul, dar loturile demo sunt fictive, iar „limite cadastrale" desenate peste geometrie generată se sparg la prima întrebare. Se cere planul topografic al clientului, DXF în Stereo70, la faza reală
- studiu geotehnic, pânză freatică, hărți de hazard la inundații; cel mai mare diferențiator posibil în RO, dar numai clientul le poate produce. Pregătește locul de afișare, nu completa cifre
- foto 360 din colțuri, ortofoto proprie cu drona, satelit istoric cu slider; ortofoto e cea mai bună investiție a clientului, dar e o zi de zbor plus procesare, nu o funcție de implementat acum

**Sună bine, dar aici nu produc nimic vizibil:**
- teren 3D real din DEM; în câmpia Ilfovului diferența de nivel pe 20 ha e sub 3 m, iar la 30 m pe pixel nu se vede absolut nimic. Merită doar pe teren cu pantă
- filtru pe pantă; aceeași problemă, filtrul ar fi identic pe toate loturile
- izocrone și rutare interactivă; distanțele reale către DN1, A0 și A3 sunt deja calculate geodezic pe trasee OSM, ceea ce e suficient. Un timp precalculat „18 minute până în Piața Victoriei" e acceptabil, un widget de rutare la runtime nu
- umbre 3D reale prin shadow mapping (deck.gl sau three.js custom layer); B3 dă informația utilă cu 2% din efort
- parcelare generativă optimizată, comparare de scenarii, analiză cut and fill; motorul existent e suficient, restul e software pentru dezvoltator, nu pentru vânzare

**De făcut altfel, nu de evitat:**
- fișa PDF a lotului: nu prin `canvas.toDataURL()`, care cere `preserveDrawingBuffer: true` și taxează fiecare cadru al hărții. `/lot/[id]` are deja vederea aeriană decupată cu conturul desenat peste, deci un stylesheet de print pe pagina aia dă același rezultat aproape gratis
- verificare automată de conformitate urbanistică („proiectul tău respectă RLU"): nu o face, cu disclaimer sau fără. A1 spune ce e admis, atât

---

**Ordinea de implementare:** A1 și A2 împreună (același calcul, unul textual, unul geometric), apoi A3 și A5 (aritmetică plus reguli de afișare), A4 (câteva ore), apoi B2 (are nevoie de precalculul de la A2), B1, B3.