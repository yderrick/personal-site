import { getCollection, type CollectionEntry } from 'astro:content';

export type WritingEntry = CollectionEntry<'writing'>;
export type WritingKind = WritingEntry['data']['kind'];

/**
 * THE DRAFT VALVE.
 *
 * Same contract as src/lib/log.ts, and for the same reason: every surface that
 * reads writing — the index, the entry route's getStaticPaths, the home page
 * block, the feed, the proof page — calls into this module, and nothing calls
 * `getCollection('writing')` directly. One filter, one place to get it right.
 *
 * Drafts stay visible in `npm run dev` so a piece can be lived with before it
 * goes out, and are gone from `npm run build`.
 *
 * What this does not cover: the repository is public. A drafted piece is off
 * the site but still in the repo. Anything that must stay unread goes in a
 * `_`-prefixed file — the collection's glob skips it and .gitignore keeps it
 * off GitHub. See RUNBOOK.md §6.
 */
const INCLUDE_DRAFTS = import.meta.env.DEV;

/**
 * Slugs that would be shadowed by a static route under /writing/.
 *
 * Checked eagerly rather than left to silently drop a piece: Astro gives the
 * static route precedence, so a poem named `proof.md` would build without
 * complaint and simply never be reachable.
 */
const RESERVED_SLUGS: readonly string[] = ['proof', 'rss.xml'];

/** Newest first; id as a stable tiebreak so the order never depends on disk. */
function byNewest(a: WritingEntry, b: WritingEntry): number {
	return b.data.date.getTime() - a.data.date.getTime() || b.id.localeCompare(a.id);
}

export async function getWritingEntries(): Promise<WritingEntry[]> {
	const entries = await getCollection(
		'writing',
		({ data }) => INCLUDE_DRAFTS || !data.draft,
	);

	const clashes = entries.filter((entry) => RESERVED_SLUGS.includes(entry.id));
	if (clashes.length > 0) {
		throw new Error(
			`These pieces use a slug that a /writing route already owns: ${clashes
				.map((entry) => entry.id)
				.join(', ')}. Rename the file — the page would build but never be reachable.`,
		);
	}

	return entries.sort(byNewest);
}

/** The `limit` most recent pieces. Used by the home page. */
export async function getRecentWriting(limit: number): Promise<WritingEntry[]> {
	return (await getWritingEntries()).slice(0, limit);
}

export async function getWritingByKind(kind: WritingKind): Promise<WritingEntry[]> {
	return (await getWritingEntries()).filter((entry) => entry.data.kind === kind);
}

export function writingHref(entry: WritingEntry): string {
	return `/writing/${entry.id}`;
}

/**
 * The pieces either side of `id`. `newer`/`older` rather than `prev`/`next`,
 * matching the log — "previous" is ambiguous in a reverse-chronological list.
 */
export async function getAdjacentWriting(
	id: string,
): Promise<{ newer: WritingEntry | undefined; older: WritingEntry | undefined }> {
	const entries = await getWritingEntries();
	const index = entries.findIndex((entry) => entry.id === id);

	if (index === -1) return { newer: undefined, older: undefined };

	return { newer: entries[index - 1], older: entries[index + 1] };
}
