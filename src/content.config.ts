import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * The daily log. One Markdown file per entry at src/content/log/YYYY-MM-DD.md;
 * a second entry on the same day is YYYY-MM-DD-2.md. The filename becomes the
 * entry id, which becomes the URL slug.
 *
 * Nothing reads this collection directly — every surface goes through
 * src/lib/log.ts, which is the one place drafts are filtered out.
 */
const log = defineCollection({
	// Leading-underscore files are ignored, so _scratch.md can sit in the
	// directory without becoming a route.
	loader: glob({ pattern: '**/[^_]*.md', base: './src/content/log' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		/**
		 * Drafts are visible in `npm run dev` and absent from every production
		 * surface. This is a privacy guarantee, not a convenience — see
		 * src/lib/log.ts.
		 */
		draft: z.boolean().default(false),
	}),
});

export const collections = { log };
