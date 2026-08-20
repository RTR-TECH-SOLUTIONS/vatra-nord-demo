All verified. Final answer below.

---

# 1. Surse deschise pentru limite de parcele în România

**Concluzie: pentru demo folosește OSM. ANCPI nu e utilizabil — nici tehnic, nici legal.**

### ANCPI / geoportal.ancpi.ro — NU (verificat, e picat chiar acum)
`geoportal.ancpi.ro` returnează **NXDOMAIN** de la DNS (verificat: rezolverul nu e allowlist — rezolvă corect `geoportal.gov.cz`, `inspire-geoportal.ec.europa.eu`, `data.gov.ro`; `ancpi.ro` rezolvă la Cloudflare). Nu e blocaj de sandbox, hostul chiar nu există momentan.

Cauza, de pe ancpi.ro: **anunț din 18 august 2026** — platformele ANCPI sunt oprite și „vor fi repuse în funcțiune etapizat, după finalizarea verificărilor necesare". Afectate: e-Terra (reactivată prima), RTI, MyEterra, Registrul proprietarilor, Titluri de proprietate, **Geoportal**. Deci endpoint-urile documentate (`/arcgis/rest/services/CP/CP_View/MapServer`, `/inspireview/rest/services/{THEME}/...`, WMS `exts/InspireView/service?REQUEST=GetCapabilities`) **nu le pot confirma live** — le dau ca referință documentată, nu ca verificate.

Chiar și funcțional, ANCPI nu se pretează:
- **Doar WMS view (imagini), fără WFS public** de descărcare a geometriilor.
- **Bulk download interzis** — doar interogări parcelă-cu-parcelă.
- **Fără licență deschisă** pentru geometrii. Pe data.gov.ro ANCPI publică doar **statistici** („Dinamica suprafețelor înregistrate", CC-BY-4.0) — verificat via API CKAN, 32 dataset-uri, **zero geometrie de parcele**.
- Acoperire ~70% din imobile, deci oricum lacunar.
- Lanț SSL rupt → necesită dezactivarea verificării certificatului.

**Legal:** a folosi geometrii cadastrale reale într-un demo comercial, fără licență, te expune inutil. Nu merită — mai ales că sunt date despre proprietăți reale ale unor persoane identificabile.

### INSPIRE România — teoretic da, practic nu
Serviciile INSPIRE RO pentru Cadastral Parcels sunt **publicate chiar de ANCPI**, deci sunt jos odată cu geoportalul. În plus INSPIRE impune doar *view*, iar accesul public poate fi limitat sub Art. 13(1)(e). Nu rezolvă problema.

### OpenStreetMap — DA, asta folosești
Singura sursă verificată live și curată legal.
- **Licență ODbL 1.0** — confirmat direct din API: `license="http://opendatacommons.org/licenses/odbl/1-0/"`. Liber de folosit comercial, **cu atribuire** („© OpenStreetMap contributors") și share-alike pe datele derivate.
- Atenție: OSM **nu are parcele cadastrale** în RO. Are `landuse=*`, drumuri, clădiri. Perfect ca **suport** (contur teren + axa drumului), iar loturile le **generezi tu** — ceea ce e ideal: date sintetice, zero risc legal, zero date personale.

**Endpoint-uri care merg (verificate):** `https://overpass-api.de/api/interpreter` (intermitent, dă 504 — pune retry), `https://nominatim.openstreetmap.org/search`, `https://api.openstreetmap.org/api/0.6/map`.
Mirror-uri testate și **respinse**: `overpass.osm.ch` returnează bază **goală** (0 rezultate pentru București — nu-l folosi, minte tăcut); `private.coffee`, `kumi.systems`, `osm.jp` nu sunt accesibile.

---

# 2. Zone concrete, coordonate verificate

Toate din OSM, geocodate cu Nominatim, distanțe calculate geodezic față de **Piața Universității (44.43497, 26.10088)** și distanță perpendiculară reală la geometria drumurilor.

| Zonă | OSM | Centroid (lat, lon) | Supraf. | Azimut drum | Buc. | A0 | DN1 | A3 |
|---|---|---|---|---|---|---|---|---|
| **Corbeanca / Ostratu** | way/297015446 | `44.60268, 26.05772` | 20.9 ha | 56° | 19.0 km | **1.01** | 1.10 | 9.39 |
| **Corbeanca sud** | way/297015469 | `44.59268, 26.06648` | 16.3 ha | 99° | 17.8 km | **0.25** | 0.36 | 8.68 |
| **Balotești / Săftica** | way/86928527 | `44.61537, 26.06706` | 24.3 ha | 90° | 20.3 km | 2.22 | **0.20** | 8.81 |
| **Moara Vlăsiei** | way/86929792 | `44.64650, 26.21490` | 22.4 ha | 67° | 25.2 km | 8.02 | 11.11 | **2.14** |
| **Tunari** | way/86924979 | `44.54954, 26.15399` | 21.1 ha | 87° | **13.4 km** | 3.36 | 6.74 | 2.31 |

Toate sunt `landuse=meadow` — teren liber, neconstruit, exact profilul unei parcelări noi.

**Despre „centura":** în nord nu mai există centura veche. Query pe `name~Centura` în bboxul nordic dă **doar `A0` / „Autostrada Centura București"** (`ref=CB` nu returnează nimic). Deci centura relevantă = A0.

**Nuanță importantă pentru copy:** A0 Nord e **parțial deschisă**. În OSM: 44 segmente `highway=motorway` (deschise) vs **37 segmente `highway=construction`** (Lot 1 și Lot 3 în lucru; Lot 4 deschis). Distanțele A0 din tabel sunt calculate **doar față de segmentele deschise**, deci sunt oneste. Nu scrie „acces direct la A0" fără să verifici lotul.

**Recomandarea mea de selecție:**
- **Corbeanca / Ostratu (way/297015446)** — cea mai bună pentru demo. Azimut **56°**, frumos oblic, deci parcelarea rotită se vede clar că e aliniată la drum, nu o grilă N-S generică. Are drum la 3 m de contur.
- **Tunari** — argumentul „13 km de centru".
- **Moara Vlăsiei** — profil Snagov/lac, lângă A3.
- Evită **Corbeanca sud** ca teren premium: e la 250 m de autostradă (zgomot).

---

# 3. Generarea programatică a grilei de loturi

## Biblioteci

**Python (recomandat pentru pre-generare, offline):** `shapely` (geometrie) + `pyproj` (proiecție) + `geopandas` doar dacă vrei I/O tabelar. Generezi o dată, salvezi GeoJSON static, site-ul doar îl afișează. Asta vrei pentru un demo: zero calcul în browser.

**JS (`turf.js`):** bun doar dacă vrei generare//editare în browser. Atenție: `@turf/transform-rotate` și `@turf/square-grid` lucrează pe **grade**, cu distorsiune la latitudinea 44.6° (`cos(44.6°) ≈ 0.712` — un pătrat în grade e un dreptunghi pe teren). Dacă folosești turf, proiectează întâi în metri; nu te baza pe helper-ele „în grade".

**Proiecție:** pentru România, **EPSG:3844 (Stereo70)** — proiecția oficială, ce folosește orice topograf. Alternativ EPSG:32635 (UTM 35N). **Niciodată calcule de suprafață direct în EPSG:4326.**

## Abordarea concretă

Nucleul e o **schimbare de reper**: rotești terenul astfel încât drumul să fie orizontal, generezi o grilă banală aliniată pe axe, apoi rotești înapoi.

1. **Ia conturul** (OSM way) + **axa drumului** adiacent. Calculezi azimutul din segmentul cel mai apropiat: `az = atan2(Δx, Δy) mod 180`.
2. **Proiectează** conturul în metri (EPSG:3844).
3. **Rotește în reperul drumului** cu vectorii unitari:
   `u_hat = (sin az, cos az)` de-a lungul drumului, `v_hat = (cos az, −sin az)` perpendicular.
   `U = x·sin az + y·cos az`, `V = x·cos az − y·sin az`
4. **Generează grila** în (U, V): benzi de `2 × adâncime + drum_interior`, fiecare cu **două șiruri spate-în-spate**, despărțite de drumul de acces. Pas pe U = frontul lotului.
5. **Rotește înapoi:** `x = U·sin az + V·cos az`, `y = U·cos az − V·sin az`, apoi reproiectezi în WGS84.
6. **Clip:** păstrezi doar loturile **complet** în contur (`shapely: parent.contains(lot)`).

**Parametri realiști (RO):** front 16-20 m, adâncime 30-35 m, drum interior 8 m, retragere 3 m → **480-700 mp**, exact în intervalul cerut.

## Două capcane pe care le-am lovit efectiv

**a) Convenția de rotație.** Prima variantă mi-a dat frontul la **146°** în loc de 56° — eroare exact de 90°, din semnele matricei de rotație. **Verifică întotdeauna** azimutul primei laturi generate față de cel cerut; e o eroare tăcută care produce o parcelare plauzibilă la privire, dar perpendiculară pe drum.

**b) Jitter pe adâncime → suprapuneri.** Ca să nu pară generat, adaugi variație. Dacă variezi **adâncimea**, șirul 2 intră peste banda următoare: la adâncime 32 m ±5%, spațierea fixă de 72 m e depășită (40 + 33.6 = **73.6 m**) → am măsurat **53 de perechi suprapuse**. Soluția e și mai realistă: **variază doar frontul, ține adâncimea constantă pe bandă** — exact ce fac parcelările reale. După fix: **0 suprapuneri**.

Testul de suprapunere trebuie făcut **în reperul rotit**, unde dreptunghiurile sunt axis-aligned. Bbox-uri axis-aligned pe dreptunghiuri rotite dau fals-pozitive: aceeași parcelare corectă „raporta" 823 de coliziuni.

## Rezultate verificate

Rulat pe toate cele 5 situri; suprafețele **recalculate din coordonatele GeoJSON finale** (round-trip, eroare max **0.50 mp**):

| Sit | Azimut | Loturi | Suprafețe | Total vandabil |
|---|---|---|---|---|
| Corbeanca-Ostratu | 56° | 274 | 517-571 mp | 14.87 ha |
| Corbeanca-sud-A0 | 99° | 193 | 458-504 mp | 9.28 ha |
| Balotești-Săftica | 90° | 292 | 564-623 mp | 17.34 ha |
| Moara Vlăsiei | 67° | 221 | 666-735 mp | 15.46 ha |
| Tunari | 87° | 299 | 456-504 mp | 14.34 ha |

Validat pe Corbeanca-Ostratu: **0 suprapuneri**, colțuri la **90.00°**, azimut front **56.0°** = cel cerut, toate loturile în 350-1000 mp, randament **72%** (14.87 din 20.93 ha) — realist, drumurile consumă normal 25-30%.

Randamentul de 72% e un bun indicator de sanitate: dacă îți iese >85%, ai uitat drumurile de acces și se va vedea că e fals.

## Fișiere

Toate în `/private/tmp/claude-501/-Users-mariorotaru-Desktop-RTR-TECH-SOLUTIONS-website-templates-prezentare-terenuri/859a6172-c335-469c-bd47-9808691fe550/scratchpad/`:

- `parcelare.py` — generatorul (numpy pur, fără dependențe; portează direct pe shapely)
- `geo.py` — proiecție plan tangent local, suprafață/centroid, distanță punct-segment
- `parcelare_*.geojson` — 5 parcelări gata de folosit
- `preview.svg` / `preview.svg.png` — randare de control
- `ovp.sh` — wrapper Overpass cu retry (necesar, endpointul dă 504 des)

Nu am instalat shapely/pyproj (lipsesc din mediu) — am implementat matematica în numpy, ceea ce a permis validarea completă. La portare pe shapely, `pip install shapely pyproj`, înlocuiește planul tangent local cu `pyproj.Transformer.from_crs(4326, 3844)` și testul `pip()` cu `parent.contains(lot)`; restul logicii rămâne identică.

**Un lucru de decis de tine:** dacă demo-ul afișează prețuri sau statut „vândut/rezervat" pe loturi, sunt date pur inventate suprapuse peste un teren **real, al cuiva** (aceste polygoane sunt terenuri agricole existente în Corbeanca/Balotești). Pentru un demo intern e în regulă, dar dacă ajunge public aș pune o notă vizibilă „parcelare ilustrativă, date fictive" — altfel poate fi citit ca ofertă reală pe teren care nu e al clientului.

**Surse:** [ANCPI](https://www.ancpi.ro/) · [endpoint-uri ANCPI (documentate, neverificate live)](https://github.com/tangojo/ancpi-wrapper-cli/blob/main/ancpi-gis-endpoints.md) · [data.gov.ro API](https://data.gov.ro/) · [OSM ODbL](https://opendatacommons.org/licenses/odbl/1-0/) · [Overpass API](https://overpass-api.de/api/status) · [Nominatim](https://nominatim.openstreetmap.org/)