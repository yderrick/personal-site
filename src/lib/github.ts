import { GITHUB_TOKEN } from 'astro:env/server';
import fallback from '../data/projects-fallback.json';

/* ------------------------------------------------------------------ *
 * Configuration — the only place you edit to add or remove a project.
 * ------------------------------------------------------------------ */

const OWNER = 'yderrick';

/**
 * Private repositories to show. **Allowlist, deliberately.**
 *
 * Public repos appear automatically because they're already public. A private
 * repo appears only if its name is listed here, so the failure mode of
 * forgetting to update this file is "a project is missing", not "a project I
 * meant to keep quiet is on the internet".
 *
 * Adding a future project: append its name. Nothing else to change.
 */
const SHOWCASED_PRIVATE_REPOS: readonly string[] = ['worldbuilder-engine', 'daylog'];

/** Repos to exclude entirely, public or not. */
const HIDDEN_REPOS: readonly string[] = [];

/* ------------------------------------------------------------------ */

export interface DailyCount {
	/** `YYYY-MM-DD`, UTC. */
	date: string;
	count: number;
}

export interface Project {
	name: string;
	isPrivate: boolean;
	description: string | null;
	language: string | null;
	/** null for private repos — there is deliberately nothing to link to. */
	url: string | null;
	stars: number;
	lastPush: string;
	/** 52 weekly commit counts, oldest first. Empty if stats were unavailable. */
	weeklyCommits: number[];
	/**
	 * Day-level commit counts, oldest first, as `YYYY-MM-DD` → count.
	 *
	 * Weekly buckets are the wrong resolution for the question this site exists
	 * to answer. A young repo with a month of dense work shows four active weeks
	 * out of fifty-two, which reads as idleness; the same data by day shows a
	 * working rhythm.
	 */
	dailyCommits: DailyCount[];
	/** Commits in the last 52 weeks. */
	totalCommits: number;
	latestTag: string | null;
	tagCount: number;
}

export interface ProjectData {
	projects: Project[];
	/** When this data was fetched. Rendered on the page so a stale build is visible. */
	fetchedAt: string;
	/** True when the data came from the committed snapshot rather than the API. */
	stale: boolean;
}

const API = 'https://api.github.com';

function headers(): HeadersInit {
	const base: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': `${OWNER}-personal-site`,
	};
	// Unauthenticated still works — it just can't see private repos, and is
	// rate-limited to 60/hour per IP.
	if (GITHUB_TOKEN) base.Authorization = `Bearer ${GITHUB_TOKEN}`;
	return base;
}

async function api<T>(path: string): Promise<T> {
	const response = await fetch(`${API}${path}`, { headers: headers() });
	if (!response.ok) {
		throw new Error(`GitHub ${response.status} ${response.statusText} for ${path}`);
	}
	return (await response.json()) as T;
}

/**
 * The /stats/* endpoints compute asynchronously: a cold cache returns 202 with
 * an empty body, and the data appears on a later request. Poll briefly, then
 * give up — activity numbers are worth a short wait but not a failed build.
 */
async function stats<T>(path: string, attempts = 4): Promise<T | null> {
	for (let attempt = 0; attempt < attempts; attempt++) {
		const response = await fetch(`${API}${path}`, { headers: headers() });

		if (response.status === 202) {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			continue;
		}
		if (!response.ok) return null;

		const body = await response.json();
		// A 200 with `{}` means "still computing" too.
		if (body && (Array.isArray(body) || Object.keys(body).length > 0)) return body as T;

		await new Promise((resolve) => setTimeout(resolve, 1500));
	}
	return null;
}

interface ApiRepo {
	name: string;
	private: boolean;
	fork: boolean;
	archived: boolean;
	description: string | null;
	language: string | null;
	html_url: string;
	stargazers_count: number;
	pushed_at: string;
}

/** Whether a repo is allowed on the site at all. */
function isShowcased(repo: ApiRepo): boolean {
	if (HIDDEN_REPOS.includes(repo.name)) return false;
	if (repo.fork || repo.archived) return false;
	return repo.private ? SHOWCASED_PRIVATE_REPOS.includes(repo.name) : true;
}

interface CommitActivityWeek {
	/** Unix seconds for the Sunday that starts the week. */
	week: number;
	total: number;
	/** Seven counts, Sunday first. */
	days: number[];
}

/** Flatten GitHub's week/day buckets into a plain date-keyed series. */
function toDailyCounts(weeks: CommitActivityWeek[]): DailyCount[] {
	const daily: DailyCount[] = [];

	for (const week of weeks) {
		week.days.forEach((count, dayIndex) => {
			const date = new Date((week.week + dayIndex * 86_400) * 1000);
			daily.push({ date: date.toISOString().slice(0, 10), count });
		});
	}

	return daily;
}

async function enrich(repo: ApiRepo): Promise<Project> {
	const [participation, activity, tags] = await Promise.all([
		stats<{ owner: number[] }>(`/repos/${OWNER}/${repo.name}/stats/participation`),
		stats<CommitActivityWeek[]>(`/repos/${OWNER}/${repo.name}/stats/commit_activity`),
		api<{ name: string }[]>(`/repos/${OWNER}/${repo.name}/tags?per_page=100`).catch(() => []),
	]);

	const weeklyCommits = participation?.owner ?? [];
	const dailyCommits = Array.isArray(activity) ? toDailyCounts(activity) : [];

	return {
		name: repo.name,
		isPrivate: repo.private,
		description: repo.description,
		language: repo.language,
		// A private repo gets no URL. Nothing on the page should imply the code
		// is one click away when it isn't.
		url: repo.private ? null : repo.html_url,
		stars: repo.stargazers_count,
		lastPush: repo.pushed_at,
		weeklyCommits,
		dailyCommits,
		totalCommits: weeklyCommits.reduce((sum, n) => sum + n, 0),
		latestTag: tags[0]?.name ?? null,
		tagCount: tags.length,
	};
}

/**
 * Build-time project data.
 *
 * **This must never throw.** A GitHub outage, a rate limit or a missing token
 * degrades the page; it does not fail the deploy. Everything is caught and
 * answered with the committed snapshot in src/data/projects-fallback.json.
 */
export async function getProjects(): Promise<ProjectData> {
	try {
		// With a token this returns private repos too; without one it 401s and we
		// fall back to the public-only endpoint.
		const repos = GITHUB_TOKEN
			? await api<ApiRepo[]>('/user/repos?affiliation=owner&per_page=100&sort=pushed')
			: await api<ApiRepo[]>(`/users/${OWNER}/repos?per_page=100&sort=pushed`);

		const showcased = repos.filter(isShowcased);

		/**
		 * Completeness check — the important one.
		 *
		 * Without a token the API happily returns just the public repos and a
		 * 200. Nothing errors, so the build would succeed and publish a page
		 * that silently omits every private project and claims to be current.
		 * A page that confidently understates the work is worse than a visible
		 * failure, so a partial result is treated as a failure and answered
		 * with the snapshot.
		 */
		const missing = SHOWCASED_PRIVATE_REPOS.filter(
			(name) => !showcased.some((repo) => repo.name === name),
		);
		if (missing.length > 0) {
			throw new Error(
				`allowlisted private repos not visible (${missing.join(', ')}) — ` +
					'GITHUB_TOKEN is missing, expired, or lacks repo scope',
			);
		}

		const projects = await Promise.all(showcased.map(enrich));
		projects.sort((a, b) => Date.parse(b.lastPush) - Date.parse(a.lastPush));

		if (projects.length === 0) throw new Error('no repositories matched the showcase rules');

		return { projects, fetchedAt: new Date().toISOString(), stale: false };
	} catch (error) {
		console.warn(
			`[github] Live fetch failed, using the committed snapshot instead. ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		if (!GITHUB_TOKEN) {
			console.warn('[github] No GITHUB_TOKEN set — private repositories cannot be read.');
		}
		return { ...(fallback as Omit<ProjectData, 'stale'>), stale: true };
	}
}

/** Total commits across every tracked project in the last 52 weeks. */
export function totalCommits(projects: Project[]): number {
	return projects.reduce((sum, project) => sum + project.totalCommits, 0);
}

/**
 * Day-level commit counts summed across all projects, oldest first, limited to
 * the most recent `days`. This is the series behind the activity heatmap.
 */
export function combinedDailyCommits(projects: Project[], days = 126): DailyCount[] {
	const totals = new Map<string, number>();

	for (const project of projects) {
		for (const { date, count } of project.dailyCommits) {
			totals.set(date, (totals.get(date) ?? 0) + count);
		}
	}

	return [...totals.entries()]
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date))
		.slice(-days);
}

/** Days in the series with at least one commit. */
export function activeDays(daily: DailyCount[]): number {
	return daily.filter((day) => day.count > 0).length;
}

/**
 * The longest run of consecutive days with commits. Assumes `daily` is a dense,
 * ordered series, which is what combinedDailyCommits() produces.
 */
export function longestStreak(daily: DailyCount[]): number {
	let best = 0;
	let run = 0;

	for (const day of daily) {
		run = day.count > 0 ? run + 1 : 0;
		if (run > best) best = run;
	}

	return best;
}

/**
 * Weekly commit totals summed across all projects, oldest first — the shape
 * behind the activity chart.
 */
export function combinedWeeklyCommits(projects: Project[]): number[] {
	const weeks = Math.max(0, ...projects.map((project) => project.weeklyCommits.length));
	const combined = new Array<number>(weeks).fill(0);

	for (const project of projects) {
		// Series can differ in length; align them to the most recent week.
		const offset = weeks - project.weeklyCommits.length;
		project.weeklyCommits.forEach((count, index) => {
			combined[offset + index] += count;
		});
	}

	return combined;
}
