/**
 * Site-wide constants. The nav route list lives here and nowhere else — the
 * nav component, the footer and any future sitemap all read from it.
 */

export const SITE = {
	title: 'yderrick',
	tagline: 'I build things and write down what happened.',
	description:
		'A developer working in the open: a dated log of what I build, break and figure out, and the projects worth showing.',
} as const;

export interface NavItem {
	href: string;
	label: string;
	/**
	 * Whether the route exists yet. Unbuilt routes still appear in the nav —
	 * this site is being built in public and the roadmap is part of the point —
	 * but they render as plain text rather than links so nothing 404s.
	 * Flip to `true` in the same commit that adds the page.
	 */
	ready: boolean;
}

export const NAV: readonly NavItem[] = [
	{ href: '/log', label: 'log', ready: true },
	{ href: '/projects', label: 'projects', ready: false },
	{ href: '/about', label: 'about', ready: false },
] as const;
