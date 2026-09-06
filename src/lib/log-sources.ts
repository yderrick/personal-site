import { GITHUB_TOKEN } from 'astro:env/server';
import { parse as parseYaml } from 'yaml';
import fallback from '../data/log-fallback.json';

/* ------------------------------------------------------------------ *
 * Configuration — the only place you edit to publish another repo's log.
 * ------------------------------------------------------------------ */

const OWNER = 'yderrick';

/**
 * Repositories whose `log/` folder is published on this site. **Allowlist.**
 *
 * Unlike the projects showcase, public repos are *not* included automatically.
 * A log folder is prose written for myself, and "the repo is public" is not the
 * same statement as "I meant every note in it to be read". Nothing is fetched
 * from a repository that is not named here.
 *
 * Adding a repo is the deliberate act that makes its log public, and it
 * publishes **every** non-draft entry in that folder, past and future, in full.
 * Re-read what is already in the folder before adding it. See
 * docs/Log Format.md §4.
 *
 * This site's own log is not listed: it lives in `log/` on disk and is loaded
 * from the filesystem, so drafts stay previewable in `npm run dev`.
 */
export const LOG_SOURCE_REPOS: readonly string[] = ['worldbuilder-engine'];

/**
 * Repo names that cannot be used, because a remote entry's URL is
 * `/log/<repo>/<date>` and these would collide with an existing route.
 *
 * Checked eagerly below rather than left to produce a baffling duplicate-route
 * error at build time.
 */
const RESERVED_REPO_NAMES: readonly string[] = ['tags'];

const reserved = LOG_SOURCE_REPOS.filter((repo) => RESERVED_REPO_NAMES.includes(repo));
if (reserved.length > 0) {
	// Unlike a GitHub failure, this is a mistake in *this* repo's configuration,
	// so it is fatal rather than degraded — the same reason a schema error in the
	// local log folder fails the build while one in a fetched entry does not.
	throw new Error(
		`[log-sources] Cannot publish the log of ${reserved.join(', ')}: ` +
			`/log/${reserved[0]}/... would collide with an existing route. ` +
			'Rename the repo or special-case it here.',
	);
}

/**
 * Whether any repository is allowlisted at all.
 *
 * Callers use this to skip reading the `remoteLog` collection entirely when it
 * is empty. Astro warns on every read of an empty collection, and an empty
 * allowlist is the normal state — without this the build would emit a warning
 * per page, which is exactly how a build log stops being worth reading.
 */
export const HAS_REMOTE_LOG_SOURCES = LOG_SOURCE_REPOS.length > 0;

/* ------------------------------------------------------------------ */

/** One `log/*.md` file, fetched and split but not yet validated. */
export interface RemoteLogFile {
	/** Repository it came from. Supplied here, never read from frontmatter. */
	repo: string;
	/** File name including the extension, e.g. `2026-09-06.md`. */
	name: string;
	/** Frontmatter block, already separated from the body. */
	frontmatter: Record<string, unknown>;
	/** Markdown body, frontmatter stripped. */
	body: string;
	/** Blob SHA, used as the content digest so unchanged files stay unchanged. */
	sha: string;
}

export interface RemoteLogData {
	files: RemoteLogFile[];
	/** When this data was fetched, or null if it has never succeeded. */
	fetchedAt: string | null;
	/** True when the data came from the committed snapshot rather than the API. */
	stale: boolean;
}

const API = 'https://api.github.com';

function headers(accept: string): HeadersInit {
	const base: Record<string, string> = {
		Accept: accept,
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': `${OWNER}-personal-site`,
	};
	if (GITHUB_TOKEN) base.Authorization = `Bearer ${GITHUB_TOKEN}`;
	return base;
}

interface ContentsEntry {
	name: string;
	type: 'file' | 'dir' | 'symlink' | 'submodule';
	sha: string;
	size: number;
}

/**
 * A file large enough that it is almost certainly not a log entry. Guards
 * against a repo dropping something unexpected into `log/` and this build
 * dutifully downloading it.
 */
const MAX_ENTRY_BYTES = 256 * 1024;

/**
 * Run `task` over `items`, at most `limit` at a time.
 *
 * A repo with a year of entries is ~365 blob requests; firing them all at once
 * is both rude and a good way to meet a secondary rate limit. The cap costs a
 * few seconds of build time and avoids that entirely.
 */
async function mapLimit<T, R>(
	items: readonly T[],
	limit: number,
	task: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;

	async function worker(): Promise<void> {
		while (next < items.length) {
			const index = next++;
			results[index] = await task(items[index]);
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/**
 * Split a Markdown file into its YAML frontmatter and body.
 *
 * Returns null for a file with no readable frontmatter block, which the caller
 * treats as a malformed entry — skipped with a warning rather than fatal.
 */
function splitFrontmatter(
	raw: string,
): { frontmatter: Record<string, unknown>; body: string } | null {
	// Tolerate a UTF-8 BOM and CRLF line endings; both turn up in files written
	// on Windows, which is where most of these are written.
	const text = raw.replace(/^\uFEFF/, '');
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return null;

	let parsed: unknown;
	try {
		parsed = parseYaml(match[1]);
	} catch {
		return null;
	}

	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

	return { frontmatter: parsed as Record<string, unknown>, body: match[2] };
}

/**
 * Every publishable `log/*.md` file in one repository.
 *
 * Throws on any repo-level problem — no `log/` folder, a network error, a 404
 * from a renamed or unreadable repo. The caller turns that into a snapshot
 * fallback for the whole build, because quietly dropping a repository's entire
 * log while the page claims to be current is the failure this design exists to
 * prevent. A single malformed *file* is a different matter, and is skipped.
 */
async function fetchRepoLog(repo: string): Promise<RemoteLogFile[]> {
	const listing = await fetch(`${API}/repos/${OWNER}/${repo}/contents/log`, {
		headers: headers('application/vnd.github+json'),
	});

	if (!listing.ok) {
		throw new Error(
			`${repo}: GitHub ${listing.status} ${listing.statusText} listing log/` +
				(listing.status === 404
					? ' — the repo has no log/ folder at its root, or the token cannot see the repo'
					: ''),
		);
	}

	const contents = (await listing.json()) as ContentsEntry[];

	const candidates = contents.filter(
		(entry) =>
			entry.type === 'file' &&
			entry.name.endsWith('.md') &&
			// Leading underscore means "not an entry" — same rule as the local glob.
			!entry.name.startsWith('_') &&
			entry.size <= MAX_ENTRY_BYTES,
	);

	const files = await mapLimit(candidates, 8, async (entry) => {
		const blob = await fetch(`${API}/repos/${OWNER}/${repo}/contents/log/${entry.name}`, {
			headers: headers('application/vnd.github.raw'),
		});
		if (!blob.ok) {
			throw new Error(`${repo}/${entry.name}: GitHub ${blob.status} ${blob.statusText}`);
		}

		const split = splitFrontmatter(await blob.text());
		if (!split) {
			console.warn(`[log-sources] ${repo}/${entry.name}: no readable frontmatter — skipped.`);
			return null;
		}

		return {
			repo,
			name: entry.name,
			frontmatter: split.frontmatter,
			body: split.body,
			sha: entry.sha,
		} satisfies RemoteLogFile;
	});

	return files.filter((file): file is RemoteLogFile => file !== null);
}

/**
 * Write the committed snapshot that a failed fetch falls back to.
 *
 * Only runs when `LOG_SNAPSHOT=1`, which `npm run snapshot:log` sets — never
 * during an ordinary build. That matters: Vercel's filesystem is thrown away
 * after a deploy, so a snapshot written there would be lost, and a build that
 * silently rewrote a tracked source file would be a nasty surprise. The
 * snapshot has to be produced from a working copy and committed, which is what
 * the script does.
 *
 * A failure to write is reported and swallowed. Refreshing the snapshot is
 * maintenance; it must not be able to break a build that was otherwise fine.
 */
async function writeSnapshot(data: Omit<RemoteLogData, 'stale'>): Promise<void> {
	if (process.env.LOG_SNAPSHOT !== '1') return;

	try {
		const { writeFile } = await import('node:fs/promises');
		const target = new URL('../data/log-fallback.json', import.meta.url);
		await writeFile(target, `${JSON.stringify({ fetchedAt: data.fetchedAt, files: data.files }, null, 2)}\n`);
		console.info(
			`[log-sources] Snapshot written: ${data.files.length} entr${
				data.files.length === 1 ? 'y' : 'ies'
			} from ${new Set(data.files.map((f) => f.repo)).size} repo(s). Commit src/data/log-fallback.json.`,
		);
	} catch (error) {
		console.warn(
			`[log-sources] Could not write the snapshot: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

/**
 * Every allowlisted repository's log, fetched at build time.
 *
 * **This must never throw.** A GitHub outage, a rate limit or a revoked token
 * degrades the log; it does not fail the deploy. Everything is caught and
 * answered with the committed snapshot, with `stale` set so the page can say so.
 */
export async function getRemoteLogFiles(): Promise<RemoteLogData> {
	if (LOG_SOURCE_REPOS.length === 0) {
		// Not a failure, and not stale — there is genuinely nothing to fetch.
		return { files: [], fetchedAt: new Date().toISOString(), stale: false };
	}

	try {
		const perRepo = await mapLimit(LOG_SOURCE_REPOS, 4, fetchRepoLog);
		const data = { files: perRepo.flat(), fetchedAt: new Date().toISOString(), stale: false };
		await writeSnapshot(data);
		return data;
	} catch (error) {
		console.warn(
			`[log-sources] Live fetch failed, using the committed snapshot instead. ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		if (!GITHUB_TOKEN) {
			console.warn('[log-sources] No GITHUB_TOKEN set — private repositories cannot be read.');
		}
		return { ...(fallback as Omit<RemoteLogData, 'stale'>), stale: true };
	}
}
