import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { SITE } from '../consts';
import { entryHref, entryRepo, excerpt, getLogEntries } from '../lib/log';

/**
 * The log as an RSS feed.
 *
 * Reads through src/lib/log.ts like every other surface, so drafts are excluded
 * here by the same single filter rather than by a second one that could drift.
 * Remote entries are included: they are already published on this site, and a
 * reader subscribing to the log wants the whole log, not the part of it that
 * happens to live in this repository.
 *
 * Items carry an excerpt rather than the full post. Rendering the Markdown
 * would mean a second Markdown engine in the build — this site renders through
 * Sätteri, which has no string-rendering entry point — and a feed that formats
 * entries differently from the pages they link to is worse than a feed that
 * links out. If full text is ever wanted, render through Astro's container API
 * rather than bolting on markdown-it.
 */
export async function GET(context: APIContext): Promise<Response> {
	const entries = await getLogEntries();

	return rss({
		title: `${SITE.title} — log`,
		description: 'What I built, broke and worked out, dated.',
		// Set in astro.config.mjs. Non-null because a static build with `site`
		// unset would already have failed on the canonical URLs in BaseLayout.
		site: context.site!,
		items: entries.map((entry) => {
			const repo = entryRepo(entry);

			return {
				title: entry.data.title,
				pubDate: entry.data.date,
				link: `${entryHref(entry)}/`,
				description: excerpt(entry, 280),
				/**
				 * Provenance travels with the item, as categories rather than
				 * invented elements. Both facts change how an entry should be
				 * read, and a feed item is usually read far away from the page
				 * that explains them.
				 *
				 * (`<source>` would be the semantically tempting element for the
				 * repo, but it means "the feed this item came from" and requires a
				 * url attribute — a category is the honest fit.)
				 */
				categories: [
					...entry.data.tags,
					...(repo ? [repo] : []),
					...(entry.data.backfilled ? ['reconstructed'] : []),
				],
			};
		}),
		customData: '<language>en-gb</language>',
		// Points feed readers at the site's own styling rules for the raw XML —
		// without it, opening /rss.xml in a browser shows a wall of markup.
		stylesheet: '/rss.xsl',
	});
}
