## Concluzie scurtă

**MapLibre GL JS (renderer) + MapTiler Cloud (tiles: Streets + Satellite), plan Flex $30/lună.** Pe preview folosești cheia MapTiler free (evaluation), pe proiectul real treci pe Flex. Alternativa serioasă e Mapbox GL JS v3 pe free tier (0 lei până la 50.000 map loads), dar cu lock-in și licență proprietară.

---

## 1. MapLibre GL JS

**Licență:** BSD-3-Clause, complet permisivă, fără cont, fără cheie, fără telemetrie obligatorie. Sursă: https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt

**Capabilități** (verificat în docs oficiale, versiune curentă în quickstart: 6.4.1): "Add a GeoJSON polygon", "Style lines with a data-driven property", `fill-extrusion` ("Display buildings in 3D", "Extrude polygons for 3D indoor mapping"), "3D Terrain", "Set pitch and bearing". Este fork din Mapbox GL JS v1, deci **acoperă 1:1 tot ce face referința**. Sursă: https://maplibre.org/maplibre-gl-js/docs/

**Efort de migrare din codul de referință Mapbox:** minim. `mapboxgl` → `maplibregl`, scoți `accessToken`, schimbi `style:` cu un URL de style. Expresiile de styling (`case`, `match`, `get`), `addSource`/`addLayer`, `queryRenderedFeatures`, popup/click handlers sunt identice.

**Basemap-uri gratuite disponibile:**

| Furnizor | Cost | Comercial? | Satelit? | Observații |
|---|---|---|---|---|
| **OpenFreeMap** | $0, fără cheie, fără rate limit | **Da**, explicit permis | **Nu** | 5 stiluri (Positron, Liberty, Dark, Fiord, 3D). Atribuire obligatorie: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap". Un singur om (Zsolt Ero), finanțat din donații, **fără SLA**. https://openfreemap.org/ |
| **Protomaps** | $0 self-hosted (PMTiles, un fișier static, HTTP range requests) | Da self-hosted; API-ul lor hostat e free **doar noncommercial**, comercial = GitHub Sponsor | **Nu** | Ideal pentru shared hosting: pui `.pmtiles` în `/public`. https://protomaps.com/ |
| **MapTiler** | Free = 5.000 sesiuni/lună, dar **doar non-comercial/evaluare**. Flex $30/lună = 25.000 sesiuni | Doar Flex/Custom | **Da** (Maxar, 1 m/px în zonele cerute, 2 m/px restul) | Sesiune = 6h sau 10.000 requests; tile requests nelimitate în sesiune. Overage $2,50/1k sesiuni. https://www.maptiler.com/cloud/pricing/ |
| **Stadia Maps** | Free 200.000 credite dar **"Commercial use not allowed"**. Starter $20 (fără satelit), **Standard $80/lună** | Starter+ | Doar Standard/Professional, 4 credite/tile | https://stadiamaps.com/pricing/ |
| **Esri World Imagery** | endpoint fără cheie există | **NU** | Da | ToS: "not available for commercial use", necesită licență ArcGIS Online/Enterprise. **Exclus pentru un site care vinde terenuri.** https://community.esri.com/t5/arcgis-living-atlas-questions/use-of-basemaps-for-commercial-purposes/td-p/1344183 |

## 2. Mapbox GL JS v3

**Licență:** **proprietară** din v2.0. Textul din LICENSE.txt: "licensed under the Mapbox TOS for use only with the relevant Mapbox product(s) listed at www.mapbox.com/pricing", necesită cont activ în bună stare, licența se termină automat dacă contul expiră, iar modificarea codului care afectează "billing, accounting, or data collection" este interzisă. Doar v1.13 și anterior sunt BSD-3. https://github.com/mapbox/mapbox-gl-js/blob/main/LICENSE.txt

**Pricing (citat de pe https://www.mapbox.com/pricing):**
- **50.000 map loads/lună gratuit**
- 50.001-100.000: **$5,00/1.000**
- 100.001-200.000: $4,00/1.000
- 200.001-1.000.000: $3,00/1.000
- "A map load is counted every time Mapbox GL JS initializes on a webpage... A map load includes **unlimited Vector Tiles API and Raster Tiles API requests**" (deci satelitul e inclus în map load, nu se taxează separat). Sesiunea maximă = 12h. https://docs.mapbox.com/help/glossary/map-loads/

**Atenție:** dacă vrei tile-urile Mapbox (satelit) consumate din MapLibre, nu am găsit o clauză explicită care să permită asta în ToS-ul public, iar licența SDK-ului leagă produsele de "relevant Mapbox product(s)". Tratează combinația MapLibre + tiles Mapbox ca **risc legal neverificat**, nu o recomanda clientului.

## 3. Google Maps JavaScript API

**Pricing schimbat din 1 martie 2025:** creditul de $200/lună a fost **eliminat** și înlocuit cu apeluri gratuite per SKU: "We have also replaced the USD $200 monthly credit with free monthly calls per SKU across Essentials, Pro and Enterprise" — **Essentials: 10.000 apeluri gratuite/SKU/lună**. https://mapsplatform.google.com/pricing/

**Dynamic Maps** (SKU FAF4-3B2D-51B2), taxat per map load:
- 10.000/lună gratuit
- până la 100.000: **$7,00/1.000**
- 100.001-500.000: $5,60/1.000
https://developers.google.com/maps/billing-and-pricing/pricing

**GeoJSON + data-driven styling:** funcțional dar mai slab. `map.data.loadGeoJson()` acceptă points/lines/polygons, `setStyle()` acceptă o funcție care calculează stilul per feature, evenimente `click`/`mouseover` există. Dar: nu e motor de expresii declarative ca în Mapbox/MapLibre Style Spec, nu ai `fill-extrusion` pe date proprii, iar stilizarea basemap-ului cere Map ID + Cloud-based map styling. https://developers.google.com/maps/documentation/javascript/datalayer

**Blocant major:** ToS interzice folosirea conținutului Google "with or near a non-Google Map", inclusiv link-uri către hărți non-Google. Deci **satelitul Google nu poate fi pus în MapLibre/Leaflet** și te blochezi complet în ecosistemul lor. https://cloud.google.com/maps-platform/terms/maps-service-terms

## 4. Leaflet

Verificat în referința oficială 1.9.4 (https://leafletjs.com/reference.html): **nu există pitch, tilt, bearing sau 3D**. Randare vectorială doar SVG (default) sau Canvas (`preferCanvas: true`). Fără vector tiles nativ. Concluzie: poate face poligoane colorate pe status + click + filtre, dar la câteva mii de poligoane SVG devine greoi, iar look-ul cu pitch/3D din referință e imposibil fără plugin-uri neîntreținute. **Nu îl recomand** dacă vrei paritate cu referința.

---

## Imagini satelitare pentru România, cu drept comercial

Aceasta e partea îngustă. Ce am verificat:

- **Esri World Imagery** — endpoint fără cheie, dar ToS interzice explicit uzul comercial. Exclus.
- **Sentinel-2 cloudless (EOX)** — gratuit doar sub **CC BY-NC-SA 4.0**; comercialul cere "EOX Commercial Attribution-RestrictedUse 1.2 License" cumpărată. În plus, rezoluția Sentinel-2 (10 m/px) e inutilă la nivel de lot de teren. https://cloudless.eox.at/documentation/license
- **MapTiler Satellite** — Maxar, 1 m/px în zonele populare, 2 m/px restul, sub-metric la cerere. Comercial permis pe Flex/Custom. Cea mai bună combinație preț/drepturi. https://www.maptiler.com/news/2023/10/global-high-resolution-satellite-map/
- **Mapbox Satellite** — inclus în map load, deci gratuit sub 50.000 loads/lună.
- **Google satellite** — doar în harta Google, per pricing-ul de mai sus.
- **Ortofotoplan ANCPI (0,1-0,4 m, acoperire RO)** — există servicii INSPIRE View publice (`https://geoportal.ancpi.ro/inspireview/rest/services/OI/OI_View/MapServer/exts/InspireView/service?SERVICE=WMS&REQUEST=GetCapabilities`) și un folder ArcGIS `.../Ortofoto` cu Mozaic și seriile 2005-2020. **Nu am putut verifica live** (host inaccesibil din acest mediu). Semnale de risc documentate de terți: lanț SSL rupt (browserul refuză tile-urile), 502 intermitente pe CP, acces la servicii web condiționat de acord de parteneriat pentru instituții publice, iar licența cere atribuire "Date create de ANCPI" + www.geoportal.gov.ro și limitează folosirea "doar pentru lucrările pentru care au fost solicitate". **Verdict: nu ca basemap principal.** Îl poți oferi ca layer opțional ("Ortofoto ANCPI") comutabil, după ce confirmi termenii direct cu ANCPI. Sursă licență: https://ancpi.info.ro/termeni-si-conditii/ , serviciu INSPIRE: https://inspire-geoportal.ec.europa.eu/srv/api/records/1623229756893r05305119165159389

---

## Cost lunar concret (presupunând ~1 map load per vizită)

| Soluție | 10.000 vizite | 30.000 | 50.000 | Satelit |
|---|---|---|---|---|
| MapLibre + OpenFreeMap | $0 | $0 | $0 | nu |
| MapLibre + Protomaps self-host | $0 | $0 | $0 | nu |
| **MapLibre + MapTiler Flex** | **$30** | **~$42,5** | **~$92,5** | **da** |
| MapLibre + Stadia Standard | $80 | $80 | $80 | da |
| Mapbox GL JS v3 | $0 | $0 | $0 (peste 50k: $5/1k) | da |
| Google Maps JS | $0 | ~$140 | ~$280 | da |

Toate merg 100% static, fără backend: pui `loturi.geojson` în `/public`, îl încarci cu `fetch` sau ca sursă `geojson` în MapLibre. API-ul propriu din referință nu e necesar. Dacă fișierul depășește ~5-10 MB, îl converteșți în `.pmtiles` (funcționează pe Hostinger dacă serverul răspunde la HTTP Range, ceea ce Apache face implicit). Dacă clientul vrea să editeze loturile singur: Keystatic care generează GeoJSON-ul la build, exact modelul static + Git CMS.

## De ce MapLibre + MapTiler și nu Mapbox free tier

Mapbox e mai ieftin pe hârtie în intervalul 10k-50k, dar:
1. Licență proprietară, terminabilă odată cu contul, cu interdicție de a modifica codul de billing.
2. La 60.000 loads plătești deja $50/lună, la 100.000 ajungi la $250 — praguri pe care un site de vânzări de terenuri le poate atinge la o campanie.
3. Lock-in total: dacă prețul crește, rescrii.

Cu MapLibre plătești $30 predictibil și **poți schimba furnizorul de tiles cu un singur URL** (MapTiler → OpenFreeMap → self-host Protomaps), fără să atingi logica de poligoane, filtre sau panou. Pentru un demo de prezentare pornești pe cheia MapTiler free (planul lor permite explicit "evaluation usage"), și treci pe Flex când clientul semnează, ceea ce se potrivește exact cu fluxul preview → dezvoltare.

## Surse

- https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt
- https://maplibre.org/maplibre-gl-js/docs/
- https://github.com/mapbox/mapbox-gl-js/blob/main/LICENSE.txt
- https://www.mapbox.com/pricing
- https://docs.mapbox.com/help/glossary/map-loads/
- https://mapsplatform.google.com/pricing/
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://developers.google.com/maps/documentation/javascript/datalayer
- https://cloud.google.com/maps-platform/terms/maps-service-terms
- https://www.maptiler.com/cloud/pricing/
- https://docs.maptiler.com/guides/maps-apis/maps-platform/tile-requests-and-map-sessions-compared/
- https://www.maptiler.com/news/2023/10/global-high-resolution-satellite-map/
- https://stadiamaps.com/pricing/
- https://openfreemap.org/ și https://openfreemap.org/quick_start/
- https://protomaps.com/
- https://leafletjs.com/reference.html
- https://cloudless.eox.at/documentation/license
- https://community.esri.com/t5/arcgis-living-atlas-questions/use-of-basemaps-for-commercial-purposes/td-p/1344183
- https://ancpi.info.ro/termeni-si-conditii/
- https://inspire-geoportal.ec.europa.eu/srv/api/records/1623229756893r05305119165159389
- https://github.com/tangojo/ancpi-wrapper-cli/blob/main/ancpi-gis-endpoints.md

## De verificat înainte de contract
1. Confirmare la MapTiler sales că Satellite e inclus pe Flex $30 (pagina de pricing nu detaliază disponibilitatea satelitului per plan; anunțul lor din 2023 spune "available to all free and paying users").
2. Rezoluția reală MapTiler Satellite peste zona exactă a loturilor (au tool de verificare pe zonă).
3. Dacă vrei layerul ANCPI: testat live din browser (certificat SSL) plus confirmare scrisă a dreptului de afișare publică.