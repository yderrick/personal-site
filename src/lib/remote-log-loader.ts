import type { Loader } from 'astro/loaders';
import { getRemoteLogFiles } from './log-sources';

/**
 * Content-collection loader for log entries that live in *other* repositories.
 *
 * The local `log/` folder is loaded by `glob()` as usual. This is its remote
 * twin: it fetches `log/*.md` from every allowlisted repo over the GitHub API
 * at build time and stores the entries in the same shape, so everything
 * downstream — rendering, the draft valve, tag pages, RSS — treats them
 * identically to a file on disk.
 *
 * Entry ids are namespaced by repo (`daylog/2026-09-06`) so two repositories
 * logging on the same day are distinct entries and distinct URLs. Local entries
 * keep their bare ids; see docs/Log Format.md §5 for why the asymmetry is
 * deliberate.
 */
export function remoteLogLoader(): Loader {
	return {
		name: 'remote-log',

		async load({ store, parseData, renderMarkdown, logger }) {
			const { files, fetchedAt, stale } = await getRemoteLogFiles();

			// The store persists between dev-server reloads, so entries deleted
			// upstream would otherwise linger. Rebuild it from what we just fetched.
			store.clear();

			if (stale) {
				logger.warn(
					'GitHub could not be reached; remote log entries come from the committed snapshot.',
				);
			}

			let stored = 0;
			let skipped = 0;

			for (const file of files) {
				const slug = file.name.replace(/\.md$/, '');
				const id = `${file.repo}/${slug}`;

				/**
				 * A malformed entry is skipped, not fatal.
				 *
				 * The alternative is that a typo in another repository's frontmatter
				 * breaks this site's deploy. A whole repo failing to fetch is handled
				 * differently and much more loudly — see getRemoteLogFiles.
				 */
				let data: Record<string, unknown>;
				try {
					data = await parseData({ id, data: file.frontmatter });
				} catch (error) {
					logger.warn(
						`${file.repo}/${file.name}: frontmatter does not match the log schema — skipped. ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
					skipped++;
					continue;
				}

				// The contract says the filename carries the entry's date. A mismatch
				// is not fatal — the frontmatter wins — but it means one of the two is
				// wrong, and a silently misdated entry is worse than a noisy one.
				const dateFromFile = slug.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
				const dateFromData =
					data.date instanceof Date ? data.date.toISOString().slice(0, 10) : undefined;
				if (dateFromFile && dateFromData && dateFromFile !== dateFromData) {
					logger.warn(
						`${file.repo}/${file.name}: filename says ${dateFromFile} but frontmatter says ${dateFromData}.`,
					);
				}

				store.set({
					id,
					data,
					body: file.body,
					rendered: await renderMarkdown(file.body),
					// The blob SHA already is a content hash, so an unchanged file
					// produces an unchanged digest without re-hashing it here.
					digest: file.sha,
				});
				stored++;
			}

			logger.info(
				`${stored} entr${stored === 1 ? 'y' : 'ies'} from ${new Set(files.map((f) => f.repo)).size} repo(s)` +
					(skipped > 0 ? `, ${skipped} skipped` : '') +
					(fetchedAt ? ` (fetched ${fetchedAt})` : ''),
			);
		},
	};
}
