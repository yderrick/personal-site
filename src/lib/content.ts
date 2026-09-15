/**
 * Helpers shared by every content collection on the site.
 *
 * These started life in src/lib/log.ts, which was the only prose surface at the
 * time. `/writing` needs them verbatim, and copying them would mean two
 * definitions of "what a date looks like here" drifting apart. They live here;
 * log.ts re-exports them under their old names so its callers are unchanged.
 *
 * Nothing in this module knows which collection it is looking at. Anything that
 * does — draft filtering, hrefs, provenance — belongs in log.ts or writing.ts.
 */

/**
 * Format a date for display. Always UTC: frontmatter dates like `2026-09-05`
 * parse as UTC midnight, so formatting in a local timezone behind UTC would
 * render them a day early.
 */
export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

/** The machine-readable `YYYY-MM-DD` for a <time datetime> attribute. */
export function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/**
 * A one-line summary for list views, taken from the entry's opening paragraph.
 *
 * Derived rather than stored: adding a `description` field to a schema would
 * mean one more thing to write per entry and one more thing to forget. The
 * stripping here is deliberately shallow — it handles the inline markdown that
 * actually shows up in these entries, not the whole CommonMark grammar.
 *
 * Typed against the shape it uses rather than a specific collection, so it
 * works for a log entry and an essay alike.
 */
export function excerpt(entry: { body?: string | undefined }, maxLength = 160): string {
	const firstParagraph = (entry.body ?? '')
		.split(/\r?\n\s*\r?\n/)
		.map((block) => block.trim())
		.find((block) => block.length > 0 && !block.startsWith('#'));

	if (!firstParagraph) return '';

	const plain = firstParagraph
		.replace(/\r?\n/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → their text
		.replace(/[*_`]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (plain.length <= maxLength) return plain;

	// Cut at a word boundary so the ellipsis doesn't land mid-word.
	const cut = plain.slice(0, maxLength);
	return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
