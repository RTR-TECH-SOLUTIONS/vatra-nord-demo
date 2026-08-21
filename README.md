# Vatra Nord — demo de prezentare pentru vânzare de loturi

Demo pentru un dezvoltator care vinde loturi de casă în Ilfov nord. Harta e
pagina principală, nu o secțiune: intri pe site și vezi direct ce e de vânzare
și unde.

**Previzualizare:** https://rtr-tech-solutions.github.io/vatra-nord-demo/

> Datele sunt fictive. Parcelările, prețurile, disponibilitatea și proprietățile
> din portofoliu sunt inventate pentru demo. Coordonatele sunt însă reale, iar
> geometria e generată peste imagini satelitare reale.

## Ce are

- **Harta ca landing.** 18 loturi în 3 fâșii de câte cinci-șapte, plus 20 de
  proprietăți răzlețe ca pinuri. Fiecare lot are pe hartă un semn cu prețul lui.
  Filtre pe stare, benzi de buget și portofoliu, cu legendă care e chiar filtrul.
- **Două fundaluri, amândouă desenate de noi.** „Hartă” e o planșă proprie,
  construită din dale OpenMapTiles în limbajul planului de situație. „Satelit” e
  imaginea aeriană gradată, ca poligoanele loturilor să iasă în față.
- **Fișă de lot ca panou**, cu prețul și cu TVA, rata lunară, planul desenat al
  lotului între vecinii lui și butoanele de contact. „Vezi de la stradă” coboară
  camera la nivelul solului și ridică volumul casei maxime admise, la înălțimea
  reală de cornișă.
- **Pagină per lot** cu plan de amplasament vectorial (cote, retrageri, silueta
  casei maxime), „ce poți construi aici”, unde e pe imaginea aeriană, utilități,
  rate și vecinătăți.
- **Panou de administrare** (`/demo-admin`): desenezi loturi, le împarți, le
  unești, generezi o parcelare întreagă dintr-un contur — inclusiv o parcelare
  nouă, cu nume și localitate —, pui pinuri de proprietate, scrii testimoniale
  și publici pe hartă.

## Cum se rulează

```bash
npm install
npm run dev      # generează datele, copiază workerul MapLibre, pornește Astro
npm run build    # la fel, apoi build static în dist/
```

Scripturi utile:

| comandă | ce face |
| --- | --- |
| `npm run date` | regenerează parcelările și portofoliul în `src/data` și `public/date` |
| `npm run obstacole` | descarcă din OpenStreetMap drumurile, clădirile și apa din jurul siturilor |
| `npm run imagini` | descarcă imaginile aeriene folosite pe paginile de lot |

## Note tehnice

- **Workerul MapLibre** e copiat în `public/maplibre/` de `scripts/copiaza-worker.mjs`
  și încărcat explicit cu `setWorkerUrl`. Fără asta Vite îl mută, iar sursele
  GeoJSON rămân goale fără nicio eroare în consolă.
- **Căile interne** trec prin `cale()` din `src/lib/cale.ts`, ca previzualizarea
  servită dintr-un subfolder să funcționeze fără modificări în cod.
- **Fundalul satelit** e Esri, folosit doar ca provizoriu pentru preview. Pentru
  producție se pune `PUBLIC_MAPTILER_KEY` în `.env` și satelitul vine de la
  MapTiler, cu drept de uz comercial.

---

Făcut de [RTR Tech Solutions](https://github.com/RTR-TECH-SOLUTIONS).
