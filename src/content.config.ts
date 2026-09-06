import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { remoteLogLoader } from './lib/remote-log-loader';
import { z } from 'astro/zod';

/**
 * The frontmatter contract, shared by both log collections.
 *
 * Entries written in this repo and entries fetched from another repo validate
 * against exactly the same schema — that identity is the whole point of
 * docs/Log Format.md, and defining it twice is how it would quietly stop being
 * true. Unknown keys are stripped rather than rejected, so another repo can
 * carry extra frontmatter for its own tooling.
 */
const logEntrySchema = z.object({
	title: z.string(),
	date: z.coerce.date(),
	tags: z.array(z.string()).default([]),
	/**
	 * Drafts are visible in `npm run dev` and absent from every production
	 * surface. This is a privacy guarantee, not a convenience — see
	 * src/lib/log.ts.
	 *
	 * For an entry fetched from another repo there is no dev preview, so
	 * `draft: true` there simply means "never published".
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
});

/**
 * The daily log written in this repository. One Markdown file per entry at
 * log/YYYY-MM-DD.md, at the repo root rather than under src/ — every repo I
 * work in keeps its daily log in a root-level `log/` folder, and this site's
 * own log follows that same shape so one convention covers all of them.
 *
 * A second entry on the same day is YYYY-MM-DD-2.md. The filename becomes the
 * entry id, which becomes the URL slug.
 *
 * Nothing reads this collection directly — every surface goes through
 * src/lib/log.ts, which is the one place drafts are filtered out.
 */
const log = defineCollection({
	// Leading-underscore files are ignored, so _scratch.md can sit in the
	// directory without becoming a route.
	loader: glob({ pattern: '**/[^_]*.md', base: './log' }),
	schema: logEntrySchema,
});

/**
 * The same log, from every other repository I work in.
 *
 * Fetched from GitHub at build time rather than read from disk, and namespaced
 * by repo so ids never collide. Which repositories are read is an allowlist in
 * src/lib/log-sources.ts; an empty allowlist means this collection is empty,
 * which is the safe default.
 */
const remoteLog = defineCollection({
	loader: remoteLogLoader(),
	schema: logEntrySchema,
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

/**
 * The /now page — what I'm currently working on, at
 * src/content/now/index.md. Same shape as `about`, plus a date.
 *
 * `updated` is required and rendered on the page. A /now page whose whole claim
 * is "this is current" and which quietly isn't is worse than no page at all, so
 * the date is not optional and not derived from the file's mtime — a reformat
 * would refresh an mtime, and only a person can say the words are still true.
 */
const now = defineCollection({
	loader: glob({ pattern: '**/[^_]*.md', base: './src/content/now' }),
	schema: z.object({
		title: z.string(),
		/** Large line above the body. Keep it short. */
		headline: z.string(),
		/** The day the words below were last checked against reality. */
		updated: z.coerce.date(),
	}),
});

export const collections = { log, remoteLog, projects, about, now };
