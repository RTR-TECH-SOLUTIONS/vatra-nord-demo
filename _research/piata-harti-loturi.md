Research complete. Findings below.

## VERIFIED — true interactive lot maps

**1. https://www.comunaberceni.ro/ (referința)**
- Tehnologie: **Mapbox GL JS**, într-un SPA **Nuxt 2**. Verificat în bundle-urile `/_nuxt/2479f34.js` și `/_nuxt/af93ddc.js`: `MAPBOX_PUBLIC_TOKEN:"pk.eyJ1IjoiY3JpdmF0ZiI..."`, `style:"mapbox://styles/crivatf/cl635k574000u14o3cir7kxa3"`, `center:[26.162754,44.315374]`, `zoom:12`, `pitch:60`, `attributionControl:!1`. Nu e SVG/imagemap. Folosește și Mapbox Directions (rută către lot).
- Datele vin dintr-un API separat, **verificat live** (`https://api.comunaberceni.ro/`):
  - `properties/geojson/all` -> 2457 features (loturile)
  - `projects/geojson/all` -> 231 features; `projects/all` -> 120 proiecte; `points-of-interest/geojson` -> 8 grupuri POI
- Câmpuri exacte per lot (din GeoJSON, nu deduse): `lotId`, `type`, `projectName`, `projectUrl`, `projectRates` (ex. `"30% / DECEMBRIE 2026"`), `projectUtilities` (ex. `"CURENT"`), `projectObservations`, `code` (ex. `"Lotul 2"`), `status`, `totalPrice`, `pricePerSquareMeter`, `area`, `withVat`, `withImageMarker`.
- Status: `0` = disponibil, `2` = vândut (verificate direct din layere + markeri `/projects/markers/disponibil.png` / `vandut.png`). `1` = "va fi disponibil în scurt timp" (layer `workInProgressPropertiesBg`), `3` = rezervat - aceste două **le deduc** din textele popup-ului, nu le-am putut confirma 1:1 cu maparea markerilor. Distribuție reală: status 2 -> 1108, 1 -> 813, 0 -> 439, 3 -> 97.
- Interacțiune: layere `fill` + `line` separate per status (fiecare cu `filter:["all",["==","type",1],["==","status",N]]`), click pe poligon -> `mapboxgl.Popup` (`setMaxWidth(300)`) cu: cod lot, nume proiect, `Preț total`, `Preț / m²`, `Suprafață: N m²`, linie de status colorată (verde/galben/roșu, cu iconițe `check.gif` / `hourglass.svg` / `unavailable.svg`), plus butoane: formular contact, WhatsApp, link Waze, și "copiază link" care generează `?proiect=X&lot=Y` (deep-link, citit înapoi din `$route.query`).
- Filtre: sidebar cu range pe suprafață și pe preț total, aplicate ca `filter` pe layerele Mapbox (`filterPropertiesByAreaOutline`, `[">=","area",e]`, `[">=","totalPrice",e]`).

**2. https://zorisenine.ro/ - cel mai apropiat model "low-tech"**
- Tehnologie: **fără librărie de hărți**. Overlay `<svg viewBox="0 0 1000 364">` cu `<polygon>` peste o imagine raster de plan (`/assets/img/plan.jpg`). WordPress, temă custom `zori-senine`.
- Markup per lot: `<g class="zs-lot is-disponibil|is-rezervat|is-vandut" data-lot="1" tabindex="0" role="button" aria-label="Lotul 1 — Disponibil">` + `<polygon points="...">` + `<text>` cu numărul și `433 mp`. Loturile vândute primesc un X din două `<line class="zs-lot__x">`.
- Date: `<script type="application/json" id="zs-lots-data">` cu 17 loturi. Câmpuri: `numar`, `suprafata`, `deschidere`, `pret`, `status`, `statusText`.
- Interacțiune (verificată în `assets/js/main.js`): legendă Disponibil/Rezervat/Vândut; butoane zoom +/- care scalează `width`/`min-width` pe canvas (1x-3x) într-un container scrollabil; hover -> tooltip poziționat la cursor cu `Lot 01 / 433 mp / preț sau status`; click sau Enter/Space pe lot disponibil -> pre-completează câmpul `#zs_lot` (și `input[name="lot-numar"]` pentru CF7) cu "Lot 01" și face smooth-scroll la formular.
- Sub hartă: tabel de prețuri cu coloanele **Lot / Suprafață / Deschidere / Preț / Status** + link "Vezi pe hartă" (`data-flash-lot`) care evidențiază poligonul 2.4s. Legătură bidirecțională listă <-> hartă.

**3. https://www.ivoryresidence.ro/** (blocuri, nu loturi de teren)
- Tehnologie: SVG hotspots din tema WP `increaseestate` ("increase-imagemap"). `<svg class="incrase-hs-poly-svg" viewBox="0 0 2560 1440" preserveAspectRatio="none">`, fiecare formă e `<a xlink:href="/buildings/bloc-1/"><polygon class="increase-imagemap-shape increase-imagemap-shape-poly increase-imagemap-tooltip" title="Bloc 1 - VÂNDUT INTEGRAL" data-shape-title="..." style="opacity:0; fill:#8fc132; fill-opacity:0.5; stroke:#8fc132">`.
- Interacțiune: `opacity:0` în repaus, se colorează la hover, tooltip din `data-shape-title` care conține și statusul în text liber, click -> navighează la pagina blocului. Fără legendă, fără filtre, fără popup cu date structurate.

**4. https://www.primavista.ro/**
- Aceeași temă `increaseestate` / același pattern `increase-imagemap` cu `<polygon>` + `imagemap-link` către `/buildings/...`. Verificat (24 apariții `increase-imagemap`).

## VERIFICATE, dar NU sunt hărți de loturi (utile ca "așa NU" / baseline RO)

**5. https://teren.leteaveche.ro/** - Google Sites care încarcă în iframe `https://ewr1.vultrobjects.com/teren-letea-veche/map.html`. Acela chiar e **Mapbox GL JS v2.0.0**, dar conține un singur poligon GeoJSON roșu care marchează zona, plus un popup `<h1>LOTURI DE TEREN</h1>`. Nu există loturi individuale, nu există status. Loturile (37) sunt doar text.

**6. https://tei.ro/ + paginile de proiect (`/tei`, `/eforest`, `/m-tei`)** - același dezvoltator ca Zori Senine. **Nu e interactiv**: plan de parcelare ca JPG cu lupă jQuery `elevateZoom`, plus listă text: `Lot 34 | suprafață = 800 mp | deschidere = 20.00 ml | preț: 13.000 € -> 11.200`, statusuri `vândut` / `indisponibil` în `<span class="red">`. Zero SVG, zero `usemap`. Ăsta e pattern-ul dominant în piața RO.

**7. https://www.intrareacutei.ro/en/available-plots/** - plan JPG (`plan-final-10.jpg`) + plugin de zoom-lupă, plus listă text pe străzi: `Lot 22 » Total area: 554 sqm • Useful area: 454 sqm • d=17 lm • Price: 13900 EUR`. Nu e interactiv.

**8. https://startimob.ro/vanzare-terenuri** - **Leaflet + markercluster** (`/assets/7370f7f0/js/leaflet.min.js`, `leaflet.markercluster-src.min.js`). Hartă de portal cu pini de anunțuri, nu poligoane de lot cu status.

**9. https://www.hartablocuri.ro/** - plugin `wp-google-maps` (`wpgmza_data.js`), deci **Google Maps**. Poligoane de clădiri clicabile cu popup de detalii. Referință bună de "click pe poligon -> detalii", dar despre blocuri, nu loturi de vânzare.

**10. https://boreal-plus.ro/** - **MapLibre GL 5.24.0** de pe unpkg, dar folosit doar pentru o hartă brănduită de localizare (`#bp-map-branded`), nu selector de unități.

## Ce NU am putut verifica
- **https://verifi.ro/harta**: HTML-ul de la server nu conține nicio librotecă de hartă (randare client-side). Nu am rulat browser, deci tehnologia rămâne neconfirmată.
- Nu am rulat JS/Playwright pe niciun site; toate concluziile vin din HTML servit, bundle-uri JS și răspunsuri API reale.
- Am verificat doar homepage/paginile evidente pentru cosmopolis.ro, avalonestate.ro, hils.ro, one.ro, isho.ro, nuscocity.ro, cordia.ro, qualis.ro - nu am găsit selector interactiv acolo, dar ar putea exista pe subpagini pe care nu le-am deschis.
- Domenii moarte / inexistente la probare: greencity.ro, terenurilapadure.ro, loturidecasa.ro, cartierulberceni.ro, aviatieipark.ro, metropolitanresidence.ro. greenfield.ro e domeniu parcat, de vânzare.
- Motoarele de căutare (WebSearch, plus DuckDuckGo și Bing încercate direct, ambele blocate) indexează foarte slab acest nișaj; e probabil să existe mai multe site-uri RO de acest tip care nu apar în index.

## Concluzie practică pentru implementare
Sunt exact două arhitecturi viabile, ambele verificate în producție în RO:
- **Mapbox/MapLibre GL + GeoJSON** (comunaberceni.ro): scalează la mii de loturi, filtre native pe layer, coordonate reale, deep-link per lot. Necesită API/backend.
- **SVG `<polygon>` peste imaginea planului de parcelare** (zorisenine.ro): zero dependențe, zero cost, accesibil (`role="button"`, `tabindex`, keyboard), datele într-un `<script type="application/json">` inline. Potrivit până la ~50-100 loturi. Pentru un demo de prezentare, ăsta e raportul efort/impact corect, iar tabelul de prețuri legat bidirecțional de hartă e detaliul care îl face să pară făcut de un om, nu generat.

Fișiere locale cu dovezile (HTML/JS/JSON descărcate): `/private/tmp/claude-501/-Users-mariorotaru-Desktop-RTR-TECH-SOLUTIONS-website-templates-prezentare-terenuri/859a6172-c335-469c-bd47-9808691fe550/scratchpad/` (notabil `berceni.html`, `nuxt/2479f34.js`, `api_properties_geojson_all.json`, `zori.html`, `zori_main.js`, `letea_map.html`, `probe/ivory.html`).