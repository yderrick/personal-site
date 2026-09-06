// @ts-check
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Production URL. RSS (/rss.xml) and canonical URLs read this — if a custom
	// domain is ever pointed at the Vercel project, this is the one value in the
	// repo that has to change.
	site: 'https://personal-site-phi-seven-43.vercel.app',
	output: 'static',

	env: {
		schema: {
			/**
			 * Read-only GitHub token, used once at build time to fetch repository
			 * metadata and commit cadence — including for the private repos listed
			 * in src/lib/github.ts.
			 *
			 * `context: 'server'` + `access: 'secret'` means the build refuses to
			 * expose it to client code. The site ships no JavaScript anyway, so
			 * nothing reaches the browser but the numbers it produced.
			 *
			 * Optional on purpose: with it unset the build still succeeds, sees
			 * public repos only, and falls back to the committed snapshot.
			 */
			GITHUB_TOKEN: envField.string({
				context: 'server',
				access: 'secret',
				optional: true,
			}),
		},
	},
});
