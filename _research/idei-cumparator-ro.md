# Ce au produsele bune de vânzare teren / parcelare / site plan interactiv (global)

Am analizat 3 categorii: **(A) site plan interactiv pentru dezvoltatori rezidențiali**, **(B) hărți de date pentru teren brut**, **(C) software de parcelare/feasibility**. Mai jos, per produs: ce face, ce merită furat, cât costă în MapLibre.

Scala de dificultate MapLibre: **T** = trivial (1-2 zile) · **M** = mediu (3-10 zile) · **G** = greu (2-6 săptămâni sau necesită backend/3D engine).

---

## A. Site plan interactiv pentru dezvoltatori rezidențiali

### 1. LotVue (ECI Solutions) — https://www.ecisolutions.com/products/lotvue/features/interactive-site-maps/
Standardul de piață în US pentru builderi. Hartă clickabilă cu loturi colorate pe status (available / reserved / sold), fiecare lot are preț, elevații și planuri disponibile. Datele curg automat din sistemul de inventar al dezvoltatorului, deci nu se re-tastează nimic. Are **rezervare online de lot** direct din hartă, calculator de credit, galerie foto/video pe lot, plus raportare de tip "click analytics" pe fiecare lot.

- **De furat:** *lot click analytics*. Dezvoltatorul vede care loturi sunt cel mai des deschise vs. cele care nu se vând. Este cea mai ieftină funcție cu cel mai mare impact comercial din tot raportul, pentru că spune direct unde e greșit prețul.
- **MapLibre:** **T** pentru hartă + status + popup. **T** pentru analytics (un `click` handler → POST cu `lot_id`). **M** pentru rezervare online (Stripe + backend + lock temporar pe lot).

### 2. Xplorer (Cecilian Partners) — https://www.cecilianpartners.com/products/xplorer
Hartă 3D geo-referențiată pentru comunități mari. Straturi separate: hartă regională (unde e ansamblul față de oraș), hartă de amenități/POI (parcuri, școli, piscină), hartă de inventar (caută și filtrează loturi în timp real). Fiecare POI poate avea video, GIF sau tur 3D atașat. Se deployează și pe kiosk în biroul de vânzări, nu doar pe web. Portal de self-service pentru editat conținut și POI-uri.

- **De furat:** **arhitectura pe 3 niveluri de zoom cu conținut diferit** — regional → amenități → loturi. Majoritatea site-urilor RO arată o singură hartă plată. Trecerea progresivă răspunde la 3 întrebări diferite ale cumpărătorului, în ordinea în care și le pune.
- **MapLibre:** **T-M.** Nativ prin `minzoom`/`maxzoom` pe layere + `fitBounds` la tranziții. POI cu media atașată = **T**.

### 3. Anewgo — https://anewgo.com/communities-and-interactive-site-plans/
Cel mai inteligent din categorie pe partea de decizie. Click pe lot → status, **premium de lot**, suprafață și **ce planuri de casă se pot construi pe el**. Navigare bidirecțională: pornești de la lot și vezi ce case încap, SAU pornești de la casa care îți place și **harta îți evidențiază loturile pe care intră**. Rezervare cu depozit pe card + contract DocuSign, notificare instant la builder.

- **De furat (prioritate maximă):** **matching bidirecțional lot ↔ proiect de casă.** Este singura funcție din tot raportul care rezolvă blocajul real al cumpărătorului de teren: "bun, dar ce pot construi aici?". Într-o piață RO unde omul cumpără teren fără să știe dacă îi intră casa, asta e diferențiatorul.
- **MapLibre:** varianta simplă = **T**: fiecare lot are `frontage_m` și `depth_m`, fiecare proiect are lățime/adâncime minimă → `map.setFilter` pe loturi compatibile. Varianta geometrică reală (amprentă rotită în poligon minus retrageri) = **M-G** cu turf.js (`turf.buffer` negativ pentru retrageri + test de încadrare a dreptunghiului).

### 4. Property Prosper Masterplan — https://www.propertyprosper.com/solutions/masterplan
Masterplan interactiv AU cu sincronizare live din Salesforce. Filtrare configurabilă a loturilor, split-view (hartă + listă), categorii de amenități selectabile de utilizator, și **direcții + timp estimat de deplasare cu mai multe moduri de transport** direct din hartă. Formulare de "quick enquiry" pre-completate cu criteriile de căutare ale userului. Analytics pe: vizualizări masterplan, click-uri, descărcări de broșuri, interacțiuni cu amenități.

- **De furat:** **timp de deplasare din lot către puncte alese** (serviciu, școală, centru). Cumpărătorul de teren peri-urban decide pe navetă, nu pe metri pătrați. Plus: **enquiry pre-completat cu ce a filtrat** — lead-ul ajunge la dezvoltator cu context, nu gol.
- **MapLibre:** **M.** Necesită API de rutare (OpenRouteService sau Valhalla self-hosted, ambele gratuite) → afișezi durata sau un poligon de izocronă. Enquiry pre-completat = **T**.

### 5. InvestHome — https://investhome.au/developers
Cel mai relevant pe partea de **administrare**. Construit exact pe fluxul de estate nou: stage-uri, release-uri, **ballot / FCFS queue cu anti-bot și tragere randomizată transparentă**, EOI, alocare directă, nominalizări, revânzări, covenante de design. Parsează automat lista de prețuri (PDF/Excel) și detectează schimbările de status (Available / On Hold / Sold). Ține **istoric de modificări de preț per lot**. Hartă cu **limite cadastrale reale, overlay de servituți, contururi PSP** și amenități. Control de vizibilitate: ascunde prețul unui lot, marchează un release ca privat/pre-release, depublică un lot cu un click. Analytics pe înregistrări, EOI-uri, watchlist, descărcări de listă de preț pe stage și pe lot. REST API + webhooks, integrare CRM.

- **De furat (prioritate maximă pe partea de admin):**
  1. **Import listă de prețuri → update automat de status.** Dezvoltatorul RO lucrează în Excel. Dacă panoul îi cere să reintroducă manual, nu îl folosește. Upload Excel → diff → update.
  2. **Istoric de preț per lot** — arată-l și cumpărătorului ("preț neschimbat de 4 luni" sau "+3% față de etapa 1"). Creează urgență fără copy agresiv.
  3. **Overlay de servituți + limite cadastrale reale**, nu un desen frumos. Aici e echivalentul RO direct: geometrie din ANCPI/eTerra + PUZ.
  4. **Watchlist + notificare la release** — captează lead-ul înainte să existe lotul.
- **MapLibre:** cadastru + servituți ca layere GeoJSON = **T** de afișat, **M** de pregătit (conversie DXF/SHP, reproiecție Stereo70 EPSG:3844 → WGS84 EPSG:4326, cu `gdal`/`ogr2ogr`). Import Excel = **M** (backend). Ballot/queue anti-bot = **G**, sări peste la început.

### 6. Streetscape.ai — https://www.streetscape.ai/
Nișă, dar interesant. Transformă elevații 2D în vizualizări 3D fotorealiste, generează variante de fațadă și palete, și **verifică automat conformitatea cu regulamentul de ansamblu și regulile specifice lotului**: retrageri, pockets de construcție, sistematizare verticală, expunere, conflicte de vecinătate (două case identice alăturate). Dashboard de portofoliu: inventar, days on market, mix de produs, absorbție.

- **De furat:** **regulile specifice lotului afișate ca strat pe hartă** — retrageri, POT/CUT, înălțime maximă, aliniament. În RO asta se traduce direct: overlay cu regimul tehnic din PUZ, per lot. Nimeni nu îl arată vizual, toți dau un PDF.
- **MapLibre:** afișarea retragerilor ca poligon interior = **T-M** (`turf.buffer` negativ pe poligonul lotului, layer `fill` semitransparent + `line` punctat). Validarea automată de conformitate = **G**, nu merită acum.

### 7. Zonda Interactive Site Map Bundle — https://zondahome.com/digital-solutions/interactive-site-map-bundle/
Un singur CMS care alimentează harta de pe site, overlay-ul sincronizat pe Google Maps, listingurile pe portalul NewHomeSource **și PDF-ul printabil**. O actualizare se propagă peste tot.

- **De furat:** **o singură sursă de adevăr → export automat în PDF printabil.** Agentul de vânzări din birou vrea hârtie. Generează plan de sit cu statusuri actualizate + fișă de lot brandată, la cerere.
- **MapLibre:** **M.** `map.getCanvas().toDataURL()` (atenție: `preserveDrawingBuffer: true` la init) + jsPDF pentru fișa de lot.

### 8. Mapovis — https://www.mapovis.com.au/ · ePlatMaps — https://www.eplatmaps.com/developer.html
Ambele mai simple, dar confirmă baseline-ul: masterplan interactiv + **directoare căutabile separat pentru "teren liber" și "pachete casă+teren"**, backend pentru update rapid de disponibilitate, câmpuri per lot (număr lot, suprafață, preț, builder, date de zonare, statut juridic), roll-over cu info, link din lot către agent / profil constructor / tur virtual.

- **De furat:** **separarea "teren gol" vs "teren + proiect"** ca două fluxuri de căutare distincte. Sunt doi cumpărători diferiți cu bugete diferite.
- **MapLibre:** **T.**

---

## B. Hărți de date pentru teren brut (aici e valoarea reală pentru "vânzare de teren")

### 9. Land id (fost MapRight) — https://id.land/
Referința mondială pe teren. 155M+ parcele, **40+ straturi de date**: limite de proprietate, proprietar, sol (cu raport de sol generat în câteva secunde), topografie cu curbe de nivel de înaltă fidelitate, zone inundabile FEMA, zone umede, ape, linii de transport, utilități, conducte, limite administrative, istoric fiscal, disponibilitate fibră. **Hărți 3D pe teren real.** Unelte de măsurare (distanță, arie, perimetru). **Overlay de imagine / plan de amplasament peste hartă și plotare de acte (deed plotting)**. Waypoint-uri cu foto, video și panorame 360°. Hărți brandate cu logo-ul firmei, partajabile prin link sau embed — destinatarul nu are nevoie de cont. Mobil cu GPS și mod offline.

- **De furat (prioritate maximă pe partea de cumpărător):**
  1. **Teren 3D real.** Un teren cu pantă arată complet diferit în 3D. Este cel mai mare "wow" per efort din tot raportul.
  2. **Overlay de imagine georeferențiată** — pui planul de parcelare al arhitectului sau ortofoto cu drona direct peste harta reală, aliniat. Rezolvă exact problema "planșa PDF nu se leagă de realitate".
  3. **Măsurare pe hartă** (distanță, suprafață) — cumpărătorul verifică singur, crește încrederea.
  4. **Link partajabil + embed, fără cont.** Agentul trimite un link pe WhatsApp cu harta exact în starea aleasă.
  5. **Waypoints cu foto 360°** puse pe hartă la colțurile lotului: "așa se vede din teren spre nord".
- **MapLibre:**
  - Teren 3D = **T-M.** MapLibre are terrain nativ (`setTerrain` + sursă `raster-dem`). Pentru RO: Copernicus DEM 30m (gratuit) sau EU-DEM, procesat în terrain-RGB cu `rio-rgbify`. O dată setat, e o linie de cod.
  - Overlay georeferențiat = **T.** `type: "image"` cu 4 colțuri, sau `type: "raster"` din tile-uri dacă e ortofoto mare.
  - Măsurare = **T** cu terra-draw + turf.
  - Link cu stare = **T** (hash în URL). Embed = **T** (iframe).
  - Foto 360 = **T-M** (Pannellum, ~15KB, se leagă de marker).
  - Curbe de nivel = **M** (`gdal_contour` pe DEM → GeoJSON/PMTiles).

### 10. Land Portal — https://landportal.com/
Filtrare de parcele mult peste medie: **landlocked (fără acces la drum), front stradal min/max, zone umede, pantă, FEMA**. Plus management de lead-uri și pagini de listing.

- **De furat:** **filtrul pe pantă și pe front stradal.** Panta este factorul #1 de cost ascuns la construcție și nimeni nu o expune ca filtru. Front stradal decide ce casă intră.
- **MapLibre:** **M.** Panta medie per lot se precalculează offline din DEM (zonal statistics cu `rasterio`/`gdal`) și se stochează ca proprietate pe fiecare lot. Apoi filtrarea e **T**. Nu calcula panta în browser.

### 11. Acres — https://www.acres.com/
150M+ parcele. Panou unic de due diligence: zonare, risc, proprietate, tranzacții. **Baza de date de vânzări comparabile** pentru evaluare, inclusiv în state fără publicare obligatorie. Imagini istorice pentru comparație în timp. Drag-and-drop pentru date proprii pe hartă. **Export de raport PDF brandat per proprietate.**

- **De furat:** **imagini satelitare istorice cu slider** ("așa arăta zona în 2015 vs. azi") — argumentul de creștere, arătat, nu spus. Și **raportul PDF brandat per lot**.
- **MapLibre:** slider de comparație = **T** (două surse raster + `maplibre-gl-compare`, sau clip pe container). Sursă de imagini istorice RO = **M** (ortofoto ANCPI pe ani, sau Sentinel-2 prin Sentinel Hub / EOX).

### 12. LandApp — https://www.landapp.com/ · LandSearch — https://www.landsearch.com/
Confirmă setul de straturi așteptat de piață: inundabilitate, zone umede, topografie, calitate sol, adâncime la rocă, resurse minerale, iradiere solară, viteza vântului, amenajări din apropiere. LandSearch = marketplace curat cu filtre pe tip de teren, suprafață, preț, plus tag-uri.

- **De furat:** **iradierea solară per lot** — relevant în RO pentru cine pune fotovoltaice, și e un număr concret care sună serios.
- **MapLibre:** **M** (PVGIS al Comisiei Europene are API gratuit pentru RO, apel per centroid de lot, precalculat).

---

## C. Software de parcelare / feasibility (partea de dezvoltator, upstream)

### 13. TestFit — https://www.testfit.io/
Configurator de sit generativ. Input: parcela (de pe hartă sau desenată), topografie, parametri de zonare, mix de unități, raze de virare pentru drumuri. Output în timp real: număr de loturi/unități, suprafețe, **estimare de cost pentru infrastructură și terasamente, analiză cut & fill**. Are configurator dedicat **single-family / subdivision**. Leagă pro forma financiară direct de plan, deci vezi ROI-ul în timp ce muți drumul. Export Revit/AutoCAD/SketchUp/Excel/PDF.

- **De furat:** **randamentul recalculat în timp real în timp ce editezi.** Chiar și o versiune minimală ("mut linia asta → 34 loturi devin 31, preț mediu X, total Y") este mult peste orice există în RO.
- **MapLibre:** parcelare generativă completă = **G**, nu o face. Dar **recalcul live de suprafețe/număr/valoare la editarea poligoanelor** = **M** cu terra-draw + turf.area. Asta e 80% din valoare pentru 10% din efort.

### 14. Giraffe — https://www.giraffe.build/ (recenzie: https://aecmag.com/technology/giraffe-for-urban-planning/)
Planificare urbană în browser, cu straturi GIS suprapuse: zonare, inundabilitate, curbe de nivel, parcele, solar, satelit. Calculează în timp ce desenezi: arii, raporturi, **analiză solară**, parcare, fezabilitate financiară. Folosit pentru studii de fezabilitate, masterplanning, tracking de dezvoltare și **consultare publică**.

- **De furat:** **modelul "desenezi și cifrele se actualizează"** plus **straturile GIS ca bibliotecă selectabilă**, nu hardcodate. Și ideea de mod de consultare publică — versiune read-only partajabilă a planului.
- **MapLibre:** bibliotecă de straturi comutabile = **T** (un panou de layer toggles peste surse definite în config). Calcul live = **M**.

### 15. Delve (Sidewalk Labs) — https://www.sidewalklabs.com/products/delve
Genera mii de scenarii de dezvoltare pe baza priorităților declarate (însorire, cost, vederi, număr de unități) și le evalua pe 4 axe: Yield Program, Design Priorities, Quality of Life, Financial Outcome. **Produsul nu mai e activ** (Sidewalk Labs a fost absorbit în Google), dar conceptul rămâne referința.

- **De furat:** **compararea a 2-3 scenarii pe aceleași metrici, una lângă alta.** Nu genera scenarii automat; lasă dezvoltatorul să salveze variante și compară-le tabelar.
- **MapLibre:** **M** (state management + hărți sincronizate).

### 16. Autodesk Civil 3D — https://www.autodesk.com/products/civil-3d/site-design
Standardul profesional de parcelare. Obiecte "parcel" inteligente cu topologie: setezi **suprafață minimă, front stradal minim, adâncime** și regula pentru restul, iar el împarte automat. Orice modificare de geometrie reactualizează dinamic toate etichetele: arie, orientare, distanță, date de curbă, tabele de parcele. Segmentele de parcelă se folosesc și ca linii de control pentru sistematizare verticală.

- **De furat:** **tabelul de parcele generat automat și mereu sincron cu geometria** (nr. lot, suprafață, front, adâncime, orientare). Zero desincronizare între desen și listă. Este exact contractul de date pe care trebuie construită harta.
- **MapLibre:** **T.** Tabelul e derivat din același GeoJSON ca harta, cu turf pentru arie și bearing. Legătura hover-hartă ↔ rând-tabel în ambele sensuri = **T** cu `feature-state`. Împărțirea automată a parcelelor = **G**, nu o face în browser.

---

## D. Vizualizare pentru cumpărător

### 17. Shadowmap — https://shadowmap.org/ · SunMap — https://sunmap.co/real-estate/
Simulare de umbră și lumină în 3D, în timp real, pe orice locație și orice dată din an. Ține cont de clădiri vecine, copaci și **relief**. Testimonial de pe site: un user a renunțat la un lot după ce a văzut că pierde peste 2 ore de soare pe zi.

- **De furat (prioritate mare, raport valoare/efort excelent):** **orientarea lotului + traiectoria soarelui**. La teren, "unde bate soarele în curtea din spate" este o întrebare pe care o pune fiecare cumpărător și la care nimeni în RO nu răspunde vizual. Slider pe ora zilei + selector 21 iunie / 21 decembrie.
- **MapLibre:** versiunea utilă = **T-M.** `suncalc.js` (2KB) dă azimutul și altitudinea soarelui pentru lat/long/dată → desenezi arcul traiectoriei peste lot și un indicator de nord, plus etichetă automată de orientare a curții ("curte orientată sud-vest"). Umbre reale proiectate de clădiri = **G** (necesită deck.gl `ShadowMap` sau three.js ca custom layer; MapLibre nu are shadow casting nativ).

### 18. Matterport pentru teren — https://matterport.com/learn/real-estate-photography/drone
Pentru teren gol, valoarea nu e turul interior ci **capturile cu drona**: survol care arată limitele și dimensiunea lotului, orbite circulare la înălțime medie pentru context, spirală top-down.

- **De furat:** **ortofoto proprie cu drona, georeferențiată, ca strat comutabil** peste satelitul standard. Satelitul e vechi de 2-3 ani și de rezoluție slabă în RO rural. O ortofoto proprie de 5cm/px este vizibil superioară și e un argument de vânzare în sine.
- **MapLibre:** **T-M.** Zbor cu drona → procesare în WebODM/OpenDroneMap (gratuit) → GeoTIFF → `gdal2tiles` sau PMTiles → sursă `raster` în MapLibre. Plus: **survol cinematic automat** cu `map.flyTo` pe o secvență de camere = **T**, arată excelent la deschiderea paginii.

---

## Lista scurtă: ce aș fura, în ordine

**Pentru CUMPĂRĂTOR (ce îl face să se decidă):**

| # | Funcție | Sursă | MapLibre |
|---|---|---|---|
| 1 | Teren 3D real, cu pantă vizibilă | Land id | **T-M** |
| 2 | "Ce casă intră pe lotul ăsta" / bidirecțional lot ↔ proiect | Anewgo | **T** simplu, **M-G** geometric |
| 3 | Orientare + traiectoria soarelui pe lot | Shadowmap | **T-M** |
| 4 | Overlay georeferențiat: plan de parcelare + ortofoto dronă | Land id, Matterport | **T-M** |
| 5 | Măsurare pe hartă (distanță, suprafață) | Land id | **T** |
| 6 | Timp de deplasare din lot spre destinații alese | Property Prosper | **M** |
| 7 | Retrageri / POT / CUT desenate pe lot, nu în PDF | Streetscape | **T-M** |
| 8 | Filtre pe pantă, front stradal, orientare | Land Portal | **M** (precalcul) + **T** (filtrare) |
| 9 | Foto 360 din colțurile lotului | Land id | **T-M** |
| 10 | Link partajabil cu starea hărții + embed, fără cont | Land id | **T** |
| 11 | Comparare loturi 2-3 unul lângă altul | OpenLot, Delve | **T** |
| 12 | Satelit istoric cu slider de comparație | Acres | **T** (harta) + **M** (sursa) |

**Pentru DEZVOLTATOR (ce îl face să administreze):**

| # | Funcție | Sursă | MapLibre / backend |
|---|---|---|---|
| 1 | Import listă de prețuri Excel → update status automat | InvestHome | **M** |
| 2 | Click analytics per lot (ce se vede, ce nu se vinde) | LotVue | **T** |
| 3 | Tabel de loturi mereu sincron cu geometria, hover bidirecțional | Civil 3D | **T** |
| 4 | Istoric de preț per lot (vizibil și cumpărătorului) | InvestHome | **T** |
| 5 | Etape/release-uri cu publicare programată, loturi ascunse/private | InvestHome | **M** |
| 6 | O singură sursă → export PDF plan de sit + fișă de lot brandată | Zonda | **M** |
| 7 | Watchlist + notificare la lansarea etapei următoare | InvestHome | **M** |
| 8 | Cadastru real + servituți ca straturi, nu desen decorativ | InvestHome | **T** afișare, **M** pregătire date |
| 9 | Recalcul live de nr. loturi / suprafețe / valoare la editare | TestFit, Giraffe | **M** |
| 10 | Rezervare online cu depozit + blocare temporară lot | LotVue, Anewgo | **M** |

---

## Note tehnice specifice RO

- **Proiecție:** datele cadastrale RO sunt în **Stereo 70 (EPSG:3844)**. MapLibre cere WGS84 (EPSG:4326). Conversie cu `ogr2ogr -s_srs EPSG:3844 -t_srs EPSG:4326`. Este pasul care sparge cel mai des un import de DXF/SHP de la topograf.
- **DEM gratuit pentru teren 3D și pantă:** Copernicus DEM 30m (acoperă RO), procesat în terrain-RGB cu `rio-rgbify`. Alternativ EU-DEM 25m.
- **Ortofoto / cadastru:** ANCPI expune servicii WMS (geoportal.ancpi.ro) — verifică termenii de utilizare înainte de a le pune într-un produs comercial.
- **Rutare pentru timpi de deplasare:** OpenRouteService (API gratuit cu limită) sau Valhalla self-hosted pe VPS-ul Hetzner.
- **Solar:** PVGIS (Comisia Europeană), API gratuit, acoperă RO, se apelează o dată per lot și se cachează.
- **Ce NU merită construit acum:** parcelare generativă automată, umbre 3D proiectate real, ballot/queue anti-bot, verificare automată de conformitate urbanistică. Toate sunt **G** și niciuna nu vinde un lot în plus la un demo.

**Sources:**
- [LotVue Interactive Site Maps](https://www.ecisolutions.com/products/lotvue/features/interactive-site-maps/)
- [LotVue for Land Developers](https://www.ecisolutions.com/products/lotvue/lotvue-for-land-developers/)
- [ECI Launches Online Lot Reservation in LotVue](https://www.ecisolutions.com/news/eci-launches-online-lot-reservation-functionality-in-lotvue/)
- [Xplorer by Cecilian Partners](https://www.cecilianpartners.com/products/xplorer)
- [Anewgo Interactive Site Plans](https://anewgo.com/communities-and-interactive-site-plans/)
- [Property Prosper Interactive Masterplan](https://www.propertyprosper.com/solutions/masterplan)
- [InvestHome for Estate Developers](https://investhome.au/developers)
- [Streetscape.ai](https://www.streetscape.ai/)
- [Zonda Interactive Site Map Bundle](https://zondahome.com/digital-solutions/interactive-site-map-bundle/)
- [Mapovis](https://www.mapovis.com.au/) · [Mapovis Features](https://www.mapovis.com.au/features.php)
- [ePlatMaps for Developers](https://www.eplatmaps.com/developer.html)
- [Land id (formerly MapRight)](https://id.land/)
- [Land Portal](https://landportal.com/)
- [Acres](https://www.acres.com/) · [Acres Analyze Land](https://www.acres.com/analyze-land)
- [LandApp Listings & Layers](https://www.landapp.com/landapp-features/listings)
- [LandSearch](https://www.landsearch.com/)
- [TestFit](https://www.testfit.io/)
- [Giraffe for urban planning (AEC Magazine)](https://aecmag.com/technology/giraffe-for-urban-planning/)
- [Delve by Sidewalk Labs (overview)](https://www.aecplustech.com/tools/delve)
- [Autodesk Civil 3D Site Design](https://www.autodesk.com/products/civil-3d/site-design) · [Civil 3D Parcels docs](https://docs.autodesk.com/CIV3D/2012/ENU/filesCUG/GUID-1AE8D103-A7E3-4BBB-A4D7-7BFE49AC1AB-1124.htm)
- [Shadowmap](https://shadowmap.org/) · [SunMap for Real Estate](https://sunmap.co/real-estate/)
- [Matterport Drone Photography](https://matterport.com/learn/real-estate-photography/drone)
- [OpenLot.com.au](https://www.openlot.com.au/)
- [CPS Interactive Site Plans](https://www.cpsusa.com/interactive-tools/interactive-site-plans/) · [Outhouse Interactive Site Maps](http://outhouse.net/interactive-site-maps/)