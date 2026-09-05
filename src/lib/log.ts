import { getCollection, type CollectionEntry } from 'astro:content';

export type LogEntry = CollectionEntry<'log'>;

/**
 * THE DRAFT VALVE.
 *
 * Every surface that reads log entries — the list page, tag pages, the entry
 * route's getStaticPaths, the home page block, and the RSS feed when it exists
 * — calls into this module. Nothing calls `getCollection('log')` directly.
 *
 * The point is that draft filtering happens in exactly one place. A new surface
 * that forgets to filter is a privacy failure, not a cosmetic bug: it publishes
 * writing that was meant to stay unpublished. Routing everything through here
 * makes forgetting impossible rather than merely unlikely.
 *
 * Drafts stay visible in `npm run dev` so entries can be written and previewed
 * freely, and disappear from `npm run build`.
 */
const INCLUDE_DRAFTS = import.meta.env.DEV;

/**
 * Newest first, with a deterministic tie-break.
 *
 * Two entries on the same day are `2026-09-05.md` and `2026-09-05-2.md`, and
 * they carry an identical `date` — so date alone leaves their order up to
 * whatever sequence the loader happened to return, which can differ between
 * runs. Falling back to a descending id comparison puts `-2` (the second entry
 * written that day, so the newer one) above the plain file, and makes the
 * ordering stable.
 */
function byNewest(a: LogEntry, b: LogEntry): number {
	return b.data.date.getTime() - a.data.date.getTime() || b.id.localeCompare(a.id);
}

/**
 * All entries visible in the current build, newest first.
 * Drafts included in dev, excluded everywhere else.
 */
export async function getLogEntries(): Promise<LogEntry[]> {
	const entries = await getCollection('log', ({ data }) => INCLUDE_DRAFTS || !data.draft);
	return entries.sort(byNewest);
}

/** The `limit` most recent entries. Used by the home page. */
export async function getRecentLogEntries(limit: number): Promise<LogEntry[]> {
	return (await getLogEntries()).slice(0, limit);
}

/** Entries carrying a given tag, newest first. */
export async function getLogEntriesByTag(tag: string): Promise<LogEntry[]> {
	return (await getLogEntries()).filter((entry) => entry.data.tags.includes(tag));
}

/**
 * Every tag in use, with how many entries carry it. Derived from the entries
 * themselves — there is deliberately no second list to keep in sync.
 * Sorted by count, then alphabetically.
 */
export async function getLogTags(): Promise<{ tag: string; count: number }[]> {
	const counts = new Map<string, number>();

	for (const entry of await getLogEntries()) {
		for (const tag of entry.data.tags) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}

	return [...counts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * The entries either side of `id` in reverse-chronological order, for the
 * prev/next links on an entry page. `newer`/`older` rather than `prev`/`next`,
 * because "previous" is ambiguous in a reverse-chronological list.
 */
export async function getAdjacentEntries(
	id: string,
): Promise<{ newer: LogEntry | undefined; older: LogEntry | undefined }> {
	const entries = await getLogEntries();
	const index = entries.findIndex((entry) => entry.id === id);

	if (index === -1) return { newer: undefined, older: undefined };

	return { newer: entries[index - 1], older: entries[index + 1] };
}

/**
 * Format a log date. Always UTC: frontmatter dates like `2026-09-05` parse as
 * UTC midnight, so formatting in a local timezone behind UTC would render them
 * a day early.
 */
export function formatLogDate(date: Date): string {
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
 * Derived rather than stored: adding a `description` field to the schema would
 * mean one more thing to write per entry and one more thing to forget. The
 * stripping here is deliberately shallow — it handles the inline markdown that
 * actually shows up in these entries, not the whole CommonMark grammar.
 */
export function excerpt(entry: LogEntry, maxLength = 160): string {
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
