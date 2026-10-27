# Vatra Nord Demo 🗺️

A map-first website for selling house plots north of Bucharest. It also has an admin editor where you can draw and split land plots.

🔗 **Live:** https://rtr-tech-solutions.github.io/vatra-nord-demo/

![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white) ![MapLibre](https://img.shields.io/badge/MapLibre-396CB2?style=for-the-badge&logo=maplibre&logoColor=white) ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)

## About
Most land sites hide the map halfway down the page. Here the map is the home page, so you see right away what is for sale and what it costs. This is a demo I made as a pitch, so the brand, prices and plots are made up. The site is in Romanian.

## Features
- Interactive map with price pins on every plot, colored by status
- Filters for status, budget, plot area and subdivision
- Map and satellite views, plus 3D buildings
- Side panel for each plot, and a "view from the street" mode
- A separate page for every plot and every subdivision
- Admin panel to draw, split and merge plots, then publish them to the map

## Tech stack
- **Frontend:** Astro, TypeScript, Tailwind CSS
- **Maps:** MapLibre GL JS, Terra Draw, Turf.js
- **Hosting:** GitHub Pages

## Run it locally
```bash
npm install
npm run dev
```
The site works without any keys. You need Node.js 22.12 or newer.

---
Made by **Mario Rotaru** · [RTR Tech Solutions](https://rtrsolutions.ro)
