// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // TODO(phase-1): set to the Vercel production URL once the project is connected.
  // RSS (/rss.xml) and canonical URLs read this, so it must be set before Phase 6.
  // site: 'https://personal-site.vercel.app',
  output: 'static',
});
