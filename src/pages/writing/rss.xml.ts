import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { SITE } from '../../consts';
import { excerpt } from '../../lib/content';
import { getWritingEntries, writingHref } from '../../lib/writing';

/**
 * The writing as its own RSS feed, separate from /rss.xml.
 *
 * Two feeds rather than one because they are two different invitations. The log
 * feed is a record of work, and a reader following it for that has not asked for
 * poems; the reverse holds too. Both are linked from BaseLayout's head, so a
 * reader's client offers them the choice.
 *
 * Reads through src/lib/writing.ts, so drafts are excluded here by the same
 * single filter as everywhere else rather than a second one that could drift.
 */
export async function GET(context: APIContext): Promise<Response> {
	const entries = await getWritingEntries();

	return rss({
		title: `${SITE.title} — writing`,
		description: 'Essays, poems and fragments.',
		// Set in astro.config.mjs. Non-null because a static build with `site`
		// unset would already have failed on the canonical URLs in BaseLayout.
		site: context.site!,
		items: entries.map((entry) => ({
			title: entry.data.title,
			pubDate: entry.data.date,
			link: `${writingHref(entry)}/`,
			// A poem gets no excerpt. Flattening verse to a single line of prose
			// misrepresents it, and an empty description degrades more gracefully
			// in a reader than a mangled one.
			description: entry.data.kind === 'poem' ? '' : excerpt(entry, 280),
			// The kind leads: it tells a reader what they are about to open, which
			// is the one thing a feed item can't show them.
			categories: [entry.data.kind, ...entry.data.tags],
		})),
		customData: '<language>en-gb</language>',
		// Points feed readers at the site's own styling rules for the raw XML —
		// without it, opening the feed in a browser shows a wall of markup.
		stylesheet: '/rss.xsl',
	});
}
