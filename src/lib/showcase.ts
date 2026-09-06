import { getCollection } from 'astro:content';
import { getProjects, type Project, type ProjectData } from './github';

export interface ShowcaseItem extends Project {
	/** One-line description: the blurb's summary wins over GitHub's, which is
	 *  often empty and always terser than it should be. */
	summary: string | null;
	pinned: boolean;
	span: 'normal' | 'wide' | 'tall';
	/** Body of the blurb file, if one exists. */
	blurbId: string | null;
}

export interface Showcase extends Omit<ProjectData, 'projects'> {
	items: ShowcaseItem[];
}

/**
 * GitHub facts merged with the hand-written blurbs in src/content/projects.
 *
 * The merge is one-directional: a blurb decorates a repo the showcase already
 * decided to include. A blurb naming a repo that isn't showcased — because it's
 * private and not allowlisted, or hidden, or deleted — is dropped rather than
 * rendered, so a stale file can never resurrect a project onto the page.
 */
export async function getShowcase(): Promise<Showcase> {
	const { projects, fetchedAt, stale } = await getProjects();
	const blurbs = await getCollection('projects');

	const items: ShowcaseItem[] = projects.map((project) => {
		const blurb = blurbs.find((entry) => entry.data.repo === project.name);

		return {
			...project,
			summary: blurb?.data.summary ?? project.description,
			pinned: blurb?.data.pinned ?? false,
			span: blurb?.data.span ?? 'normal',
			blurbId: blurb?.id ?? null,
		};
	});

	// Pinned first, then most recently pushed.
	items.sort(
		(a, b) =>
			Number(b.pinned) - Number(a.pinned) || Date.parse(b.lastPush) - Date.parse(a.lastPush),
	);

	return { items, fetchedAt, stale };
}

/**
 * How long ago, in words. Coarse on purpose: "3 weeks ago" is the useful fact,
 * and a precise timestamp would go stale between rebuilds anyway.
 */
export function relativeTime(iso: string, now = new Date()): string {
	const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);

	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 14) return `${days} days ago`;
	if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
	if (days < 365) return `${Math.floor(days / 30)} months ago`;
	return `${Math.floor(days / 365)}y ago`;
}

/** Format a fetch timestamp for the "as of" line. */
export function formatFetchedAt(iso: string): string {
	return new Date(iso).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	});
}
