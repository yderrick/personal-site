// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Production URL. RSS (/rss.xml) and canonical URLs read this — if a custom
  // domain is ever pointed at the Vercel project, this is the one value in the
  // repo that has to change.
  site: 'https://personal-site-phi-seven-43.vercel.app',
  output: 'static',
});
