# Analiză referință: comunaberceni.ro

Analizat pe 2026-08-19 (Playwright + inspecție bundle JS + API public).

## Ce este, de fapt

Nu e un site de prezentare cu o hartă în el. **Landing page-ul ESTE harta**, pe tot ecranul.
Restul site-ului (Terenuri, Proiecte, Despre noi, Contact) sunt pagini secundare, mult mai slabe
ca design.

Stack detectat: **Nuxt 2 (Vue)** pe frontend + **Mapbox GL JS** + un **API propriu** la
`api.comunaberceni.ro`.

## Harta, exact cum e făcută

Inițializare (extras din bundle `/_nuxt/2479f34.js`):

```js
new mapboxgl.Map({
  center: [26.162754, 44.315374],
  zoom: 12,
  pitch: 60,          // înclinația = tot efectul "3D"
  bearing: 30,
  attributionControl: false,
  logo: false,
})
```

Important: loturile **NU** sunt `fill-extrusion`. Sunt poligoane `fill` plate, 2D.
Senzația de 3D vine 100% din `pitch: 60` + `bearing: 30`. Ușor de replicat.

Style: custom Mapbox Studio (`crivatf/cl635k574000u14o3cir7kxa3`) — basemap tip stradal
simplificat, gri deschis, cu apă albastru viu.

### Straturi și culori pe status

| status | înțeles | fill | outline | în legendă |
|---|---|---|---|---|
| 0 | disponibil | `#007e2d` | `#0f3b15` | Terenuri disponibile |
| 1 | disponibil în curând | `#007bff` | `#003773` | Terenuri disponibile în curând |
| 2 | vândut | `#fc5d3d` | `#800000` | Terenuri vândute |
| 3 | rezervat | `#ffb100` | `#694900` | Terenuri rezervate |

`fill-opacity: 0.9`, `line-width: 2`.
Filtrele de preț/suprafață adaugă un strat suplimentar magenta `#ff12e7` peste loturile
care se potrivesc — evidențiere, nu recolorare.

Fiecare status e un strat separat (`availablePropertiesBg`, `workInProgressPropertiesBg`,
`soldPropertiesBg`, `reservedPropertiesBg`) + un strat `line` de contur, filtrate cu
`["all", ["==","type",1], ["==","status",N]]`. Checkbox-urile din sidebar doar comută
`visibility` pe straturi.

### Popup la click pe lot

`mapboxgl.Popup`, maxWidth 300, conținut:
titlu `Lotul N, Nume Proiect` + buton copy-link, preț total (cu/fără TVA calculat client-side),
preț/m², `Id: <lotId>`, apoi status colorat (verde/galben/roșu) și butoane.

## API-ul (public, fără auth)

| endpoint | ce conține |
|---|---|
| `/properties/geojson/all` | **2457 poligoane de loturi**, 1.2 MB |
| `/projects/all` | 120 proiecte |
| `/projects/default` | proiectul afișat implicit |
| `/projects/geojson/all` | markerii de proiect pe hartă |
| `/points-of-interest/geojson` | puncte de interes (școli, magazine, benzinării) |

### Schema unui lot (`properties` din feature)

```json
{
  "lotId": 768,
  "type": 1,
  "projectName": "Urban Garden 17",
  "projectUrl": "urban-garden-17",
  "projectRates": "30% / DECEMBRIE 2026",
  "projectUtilities": "CURENT",
  "projectObservations": null,
  "code": "Lotul 2",
  "status": 2,
  "totalPrice": 21924.0,
  "pricePerSquareMeter": 63.0,
  "area": 348.0,
  "withVat": true,
  "withImageMarker": null
}
```

Geometrie: `Polygon`, coordonate WGS84 simple (5 puncte, dreptunghi).

Distribuție reală: 2457 loturi, 120 proiecte. Suprafețe 8 - 81.835 mp (mediana 406 mp).
Prețuri 472 - 2.946.060 EUR (mediana 26.523 EUR). Statusuri: 439 disponibile, 813 în curând,
1108 vândute, 97 rezervate.

## Sidebar "Portofoliu" (stânga, desktop)

1. Select `Alege tip proiect` — Gardens (Terenuri) / Spații de închiriat
2. Select cu căutare `Alege un proiect`
3. Checkbox-uri `Afișare după tip proiect` (2)
4. Checkbox-uri `Afișare după stare proiect` (5: DISPONIBILE, OFERTE, ÎN CURÂND, VÂNDUTE, REZERVATE)
5. Radio `Alege un buget (inclusiv TVA)` — 8 intervale EUR
6. Radio `Alege suprafața` — 4 intervale mp
7. `Puncte de interes`

## Mobil

Harta rămâne full-screen. Legenda sus-dreapta. Sidebar-ul devine **bottom sheet**
("Vezi portofoliu", cu chevron). Header cu logo + icon telefon + icon WhatsApp.

## Structura site-ului

Nav: Acasă (harta) · Terenuri · Despre noi · Proiecte · Consultanță imobiliară · Contact
Plus pagini de proiect: `/proiecte/<slug>`.

Pagina de proiect: titlu serif, descriere cu bullets bifate, thumbnail hartă cu CTA
"Vezi proiectul pe hartă", "Puncte de interes în apropiere".

## Verdict de design

**De păstrat:** conceptul hartă-ca-landing, sistemul de culori pe status, sidebarul de filtre,
bottom sheet-ul pe mobil, popup-ul cu preț/mp și copy-link.

**De NU copiat:** paginile secundare. `/terenuri` e plină de blob-uri verzi decorative,
o ilustrație generică și tabele de prețuri brute. Arată a template CMS 2015.
Acolo construim ceva propriu, curat.

## Fișiere salvate

- `screenshots/berceni-hero.png` — harta pe desktop 1440px
- `screenshots/berceni-mobile.png` — harta pe 390px
- `screenshots/berceni-terenuri.png` — pagina /terenuri, full page
- `screenshots/berceni-proiect.png` — pagina de proiect
