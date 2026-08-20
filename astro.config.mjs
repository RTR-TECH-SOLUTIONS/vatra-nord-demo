// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Site-ul real va sta în rădăcina domeniului clientului. Copia de
// previzualizare de pe GitHub Pages e servită dintr-un subfolder, deci CI-ul
// pune SITE_URL și SITE_BASE. Toate căile interne trec prin `cale()` din
// src/lib/cale.ts, deci nu mai e nimic de schimbat în cod.
const site = process.env.SITE_URL || 'https://demo.rtr.ro';
const base = process.env.SITE_BASE || '/';

export default defineConfig({
  site,
  base,
  // Bara de dev acoperă panourile de jos pe mobil și intră peste click-urile
  // de pe hartă la verificarea vizuală.
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
