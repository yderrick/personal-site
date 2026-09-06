import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * The daily log. One Markdown file per entry at log/YYYY-MM-DD.md, at the repo
 * root rather than under src/ — every repo I work in keeps its daily log in a
 * root-level `log/` folder, and this site's own log follows that same shape so
 * one convention covers all of them.
 *
 * a second entry on the same day is YYYY-MM-DD-2.md. The filename becomes the
 * entry id, which becomes the URL slug.
 *
 * Nothing reads this collection directly — every surface goes through
 * src/lib/log.ts, which is the one place drafts are filtered out.
 */
const log = defineCollection({
	// Leading-underscore files are ignored, so _scratch.md can sit in the
	// directory without becoming a route.
	loader: glob({ pattern: '**/[^_]*.md', base: './log' }),
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
		/**
		 * True for entries written after the fact from commit history rather than
		 * on the day. The page says so.
		 *
		 * The log's worth to a reader is that a date means what it says, so a
		 * reconstructed entry has to be visibly reconstructed. Entries written on
		 * the day simply omit this.
		 */
		backfilled: z.boolean().default(false),
	}),
});

/**
 * Hand-written project blurbs, merged over the GitHub API data by repo name.
 *
 * The API supplies facts — language, stars, commit cadence, last push. These
 * supply the voice. For the private repos this is load-bearing rather than
 * decorative: they carry no GitHub description, so without a blurb their card
 * would have nothing to say.
 *
 * A blurb whose `repo` matches nothing in the showcase is ignored, not rendered.
 */
const projects = defineCollection({
	loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projects' }),
	schema: z.object({
		/** Repository name this blurb attaches to. */
		repo: z.string(),
		/** One line. Used as the card description when GitHub has none. */
		summary: z.string(),
		/** Pinned projects lead the grid and appear on the home page. */
		pinned: z.boolean().default(false),
		/** Bento sizing. Varied by design — a uniform grid is not the brief. */
		span: z.enum(['normal', 'wide', 'tall']).default('normal'),
	}),
});

/**
 * The /about page's prose, as a single Markdown file at
 * src/content/about/index.md.
 *
 * It lives in a collection rather than inside the .astro page so the writing can
 * be edited without touching markup — open the file, change the words, commit.
 * Headings, lists and links all work; the page styles whatever it finds.
 */
const about = defineCollection({
	loader: glob({ pattern: '**/[^_]*.md', base: './src/content/about' }),
	schema: z.object({
		title: z.string(),
		/** Large line above the body. Keep it short. */
		headline: z.string(),
	}),
});

export const collections = { log, projects, about };
