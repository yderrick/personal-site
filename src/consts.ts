/**
 * Site-wide constants. The nav route list lives here and nowhere else — the
 * nav component, the footer and any future sitemap all read from it.
 */

export const SITE = {
	title: 'yderrick',
	tagline: 'I build things and write down what happened.',
	description:
		'Derrick Yao Dzotefe — fuel and gas operations in Tema, Ghana, and software the rest of the time. A dated log of what I build, and the projects worth showing.',
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

export interface SiteLink {
	label: string;
	href: string;
	/** Shown in the footer as well as on /about. */
	inFooter?: boolean;
}

/**
 * Contact and profile links. **This is the only place to edit them.**
 * `/about` and the footer both read this array.
 *
 * To add one: append an entry. To remove one: delete its entry. To link a CV,
 * drop the PDF into `public/` and point `href` at `/its-filename.pdf`.
 */
export const LINKS: readonly SiteLink[] = [
	// Primary contact is the address on the CV and LinkedIn, so a recruiter
	// following any route reaches the same inbox.
	{ label: 'Email', href: 'mailto:dzotefederrickyao@gmail.com', inFooter: true },
	{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/derrick-dzotefe-a871071ab/', inFooter: true },
	{ label: 'GitHub', href: 'https://github.com/yderrick', inFooter: true },
	{ label: 'CV (PDF)', href: '/derrick-yao-dzotefe-cv.pdf' },
	{ label: 'Second inbox', href: 'mailto:crystaladdison17@gmail.com' },
] as const;

export const NAV: readonly NavItem[] = [
	{ href: '/log', label: 'log', ready: true },
	{ href: '/projects', label: 'projects', ready: true },
	{ href: '/now', label: 'now', ready: true },
	{ href: '/about', label: 'about', ready: true },
] as const;
