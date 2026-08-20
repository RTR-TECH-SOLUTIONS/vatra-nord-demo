## Ce am verificat (surse)

Keystatic docs + pachetul npm dezasamblat, Tina docs + README-ul `@tinacms/astro@0.6.1`, Directus docs + `app/package.json` din repo + licența curentă, PocketBase docs + JSVM reference, terra-draw README, Astro content collections.

---

## 1. Keystatic

**Poate stoca GeoJSON?** Nu nativ. Lista de field-uri din `@keystatic/core@0.6.7` (verificată direct în `dist/declarations/src/form/fields/`): array, blocks, checkbox, child, cloudImage, conditional, date, datetime, document, empty, file, ignored, image, integer, markdoc, multiRelationship, multiselect, number, object, pathReference, relationship, select, slug, text, url. **Nu există `json`, nici `map`/`geo`.** Cu field-uri stock ai doar: `fields.text({multiline})` unde clientul lipeste GeoJSON (inuman) sau `fields.array(fields.object({lat, lng}))` (si mai rau).

**Custom field UI?** Nu e documentat (nu exista pagina `/docs/custom-fields`, da 404). Dar API-ul exista structural si e exportat public: `src/index.d.ts` face `export * from "./form/api.js"`, iar `form/api.d.ts` defineste:

```ts
export type BasicFormField<ParsedValue, ...> = {
    kind: 'form';
    Input(props: FormFieldInputProps<ParsedValue>): ReactElement | null;
    defaultValue(): ParsedValue;
    parse(value: FormFieldStoredValue): ParsedValue;
    serialize(value: ParsedValue): { value: FormFieldStoredValue };
    validate(value: ParsedValue): ValidatedValue;
    reader: { parse(value: FormFieldStoredValue): ReaderValue };
};
```
`FormFieldStoredValue` accepta obiecte/array-uri, deci un GeoJSON Polygon se serializeaza curat in frontmatter YAML/JSON. Adica **poti scrie un field custom cu MapLibre + Terra Draw ca simplu obiect literal**, fara API oficial.

**Riscul e real:** issue deschis [Thinkmill/keystatic#464 "Disable custom field types"](https://github.com/Thinkmill/keystatic/issues/464), autor JedWatson, label roadmap: "We've been discussing whether having the ability to create custom field types in Keystatic is worth continuing with... lock down the field types to just the built-in ones for now". Deci construiesti pe ceva ce maintainerii vor sa inchida.

**Unde ruleaza:** admin-ul NU merge pe Hostinger static. Doc oficial: "Because Keystatic needs to run serverside code and use Node.js APIs, you will need to add an Astro adapter to deploy"; GitHub mode cere rute API + GitHub App (`KEYSTATIC_GITHUB_CLIENT_ID/SECRET`, `KEYSTATIC_SECRET`). Solutie: site static pe Hostinger + o mica app Astro SSR doar cu admin-ul, in GitHub mode, pe VPS/Coolify.

**Efort:** 1-2 zile field-ul de harta + 0.5 zi setup GitHub mode/CI. **UX client:** bun (odata facut). **Cost:** 0. Proiect viu (`@keystatic/core` publicat 2026-08-18, `@keystatic/astro` 6.0.0).

## 2. TinaCMS

**Custom field cu harta: DA, documentat oficial.** `ui: { component: MyComponent }`, componenta React primeste `field`, `input` (value/onChange din react-final-form), `meta`, `form`; helper `wrapFieldsWithMeta`. Asta e diferenta majora fata de Keystatic: e extension point suportat, nu accident de tipuri.

**Stocare GeoJSON:** nu exista tip `json` in schema (tipuri: string, number, datetime, boolean, image, reference, object, rich-text). Deci ori `string` cu GeoJSON stringificat scris de componenta ta, ori `object` cu `list: true` de perechi lat/lng. Functioneaza, dar e workaround.

**Unde ruleaza:** singura varianta din tot lotul care **merge pe Hostinger shared**: `tinacms build` produce admin-ul ca SPA static la `/admin/index.html`, care vorbeste cu TinaCloud (GraphQL + auth), iar TinaCloud comite in repo-ul GitHub; apoi GitHub Actions rebuildeaza Astro si trimite pe Hostinger. Atentie: pachetul nou `@tinacms/astro@0.6.1` (publicat 2026-05) cere adapter SSR pentru visual editing (`/tina-island/[name]` e `prerender = false`); editarea clasica prin formulare in `/admin` nu are nevoie de asta.

**Cost:** TinaCloud Free = "2 users, 2 roles, community support", 1 proiect. Team 24 USD/luna. Self-hosted = iti trebuie oricum un endpoint Node + Mongo/Postgres, adica VPS, deci dispare avantajul.

**Efort:** 1.5-2.5 zile (componenta harta + generare client + CI). **UX client:** bun. **Risc:** limita de 2 useri pe free; codegen-ul Tina adauga complexitate in repo.

## 3. Directus

**Singurul cu geospatial nativ, real.** Tipuri: `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon`. Doc: "Geospatial fields are used to store data in GeoJSON format". Interfata **Map**: "Show and set geospatial data on an interactive map", cu desenare de Point/LineString/Polygon direct in admin; default OpenStreetMap, optional cheie Mapbox. Am confirmat in `app/package.json` din repo: `maplibre-gl`, `@mapbox/mapbox-gl-draw`, `@mapbox/mapbox-gl-geocoder`, `@turf/meta`. Deci desenarea poligonului e feature de produs, nu ceva ce construiesti tu.

**Conditie:** "Your database must support geospatial data or have a geospatial plugin installed, such as PostGIS or SpatiaLite". Practic: Postgres cu imaginea `postgis/postgis`, nu Postgres simplu (altfel eroarea clasica `type "geometry" does not exist`).

**Unde ruleaza:** Docker pe VPS + Coolify. Cerinte oficiale: minim `1x 0.25 vCPU / 512 MB`, recomandat `2x 1 vCPU / 2GB`. Redis optional.

**Cost/licenta:** atentie, licenta s-a schimbat, nu mai e BSL cu prag de 5M. Fisierul `license` din repo azi e **MSCL-1.0-GPL** (Monospace Sustainable Core License 1.0, Copyright 2026): permis orice scop in afara de "Competing Use" (sa revinzi Directus insusi). Pagina de preturi: "Self-hosting is available on every tier", tier Core = 0 USD cu "3 user seats, 25 Collections, 5 Flows, Advanced RBAC"; sub 5M USD venit si sub 50 angajati exista Open Innovation Grant, acces complet permisiv. Pentru cazul asta (2-3 useri, 3 colectii) esti confortabil in tier-ul gratuit.

**Efort:** 0.5-1 zi (docker compose cu postgis, colectii `proiecte` + `loturi`, campuri, roluri, traducere UI in RO). **UX client:** cel mai bun raport efort/rezultat, dar admin-ul e generic si il vede ca pe un "panou de baza de date", nu ca pe un tool de terenuri.

## 4. PocketBase

**GeoJSON in camp JSON: da.** `JSONField` "for storing any serialized JSON value"; optiune `maxSize` in bytes, "If zero, a default limit of 1MB is applied" (suficient, un poligon de lot are sub 5 KB).

**`geoPoint` NU ajuta:** stocheaza doar un singur `{"lon":x,"lat":y}`, iar `geoDistance(lonA, latA, lonB, latB)` merge doar pe puncte. Fara operatii spatiale pe poligoane (fara "point in polygon", fara "within").

**Admin custom: obligatoriu.** Dashboard-ul PocketBase nu e extensibil, pozitia maintainerului: "The built-in Admin UI at the moment unfortunately is not customizable as it was intended only as a dev dashboard"; recomandarea lor e "create it as a separate frontend SPA". Clientul ar vedea GeoJSON brut intr-un textarea, deci inutilizabil ca atare. Ai `pb_public` pentru a servi SPA-ul tau si hooks Go/JSVM pentru rute custom.

**Efort:** 3-5 zile pentru un admin custom decent (login, lista loturi, formular, harta cu desenare, upload poze, filtre). **Plus:** ai control total pe UX si iese un tool care chiar arata a "administrare parcelare". **Cost:** 0, un binar pe VPS, ~50 MB RAM.

## 5. Varianta pragmatica (fisier GeoJSON)

Clientul deseneaza in [geojson.io](https://geojson.io) (deseneaza poligoane, editeaza proprietati in Table view, Save > GeoJSON) sau primesti fisierul de la topograf, iar tu il pui in repo. Astro citeste cu content layer: `file("src/data/loturi.geojson", { parser })`, colectiile nu au nevoie de markdown.

**Efort:** 2-4 ore. **UX client:** slab pentru desenare (geojson.io nu are login, nu salveaza nicaieri, nu are validare pe campurile tale), dar **excelent pentru varianta hibrida**: geometria se deseneaza o singura data, la lansarea parcelarii, si nu se mai schimba; ce se schimba saptamanal e statusul si pretul.

---

## Recomandare DEMO (rapid, impresionant, zero backend)

**Fara CMS.** Date in `src/data/loturi.geojson` + colectie Astro cu `file()` loader, harta pe MapLibre GL (fara token) sau Mapbox (50.000 map loads/luna gratuit, `5 USD/1.000` peste), poligoane colorate pe status, hover + panou lateral cu lot.

Pentru "pitch"-ul de administrare: o pagina ascunsa `/demo-admin`, **100% client-side**, cu MapLibre + **Terra Draw** (MIT, adaptere pentru MapLibre v4/v5, Leaflet, Mapbox GL v3, OpenLayers, Google Maps), unde desenezi poligonul, completezi cod/suprafata/pret/status si apesi "Descarca GeoJSON". Nimic nu se salveaza, dar clientul vede exact fluxul si intelege ca "asta o sa fie panoul meu".

**Efort: ~1 zi. Cost: 0. Ruleaza pe Hostinger static.**

## Recomandare PROIECT REAL

**Directus + Postgres/PostGIS pe VPS + Coolify.** Motivul e simplu: e singura optiune unde desenarea poligonului este feature nativ testat, nu cod pe care il intretii tu. Restul (status, pret, pret/mp calculat, relatie lot -> proiect/parcelare, roluri, istoric) sunt lucruri pe care Directus le face din configurare.

Arhitectura concreta:
- `proiecte` (nume, localitate, utilitati, descriere, poze) si `loturi` (`cod` text, `geometrie` Polygon, `suprafata` number, `pret` number, `pret_mp` calculat, `status` select cu 4 valori si culori, `proiect` M2O).
- Site Astro: build static care trage din Directus API la build + webhook Directus -> GitHub Actions -> deploy Hostinger. Daca statusurile se schimba des si vrei instant, pui Astro in mod SSR pe acelasi VPS, cu cache scurt, si nu mai depinzi de rebuild.
- Ascunzi complexitatea pentru client: rol dedicat cu acces doar la cele 2 colectii, campuri reordonate, labeluri in romana, colectiile de sistem ascunse.

**Efort total: 1-2 zile de integrare. Cost software: 0.**

Alternativa **daca clientul trebuie neaparat sa ramana pe Hostinger shared si vrei flux Git**: TinaCMS cu custom field component pentru harta + TinaCloud free. Este singura cale prin care panoul de admin sta pe hosting static. Costa insa ~2 zile de cod si te blocheaza la 2 utilizatori.

**Nu recomand Keystatic aici**, desi e stack-ul tau preferat: n-are camp JSON/geo, iar field-ul custom se sprijina pe un API nedocumentat pe care maintainerii vor explicit sa il inchida (#464). E ok pentru texte si blog pe alte proiecte, nu pentru geometrie.

## Doua detalii practice de care depinde proiectul

1. **Sistem de coordonate.** Daca clientul aduce planul de la topograf (DXF/DWG sau extras ANCPI), acela e in **EPSG:3844, "Pulkovo 1942(58) / Stereo70"**, in metri. GeoJSON cere WGS84 lon/lat. Conversia se face in QGIS sau cu proj4 la import, o data. Desenatul manual peste satelit da eroare de 1-3 m, acceptabil pentru marketing, nu pentru acte, si trebuie scris asta pe site.
2. **Frecventa de editare difera pe campuri.** Geometria se seteaza o data per parcelare; statusul se schimba saptamanal. Orice arhitectura alegi, optimizeaza pentru "schimba statusul in 2 clicuri de pe telefon", nu pentru desenat. Directus si un admin custom PocketBase fac asta bine; un CMS Git face si el, dar cu 1-3 minute de rebuild pana se vede pe site.

Artefact de verificare (tipurile Keystatic extrase local): `/private/tmp/claude-501/-Users-mariorotaru-Desktop-RTR-TECH-SOLUTIONS-website-templates-prezentare-terenuri/859a6172-c335-469c-bd47-9808691fe550/scratchpad/ks/package/dist/declarations/src/form/api.d.ts`