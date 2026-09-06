#!/usr/bin/env node
/**
 * Refresh the committed fallback snapshot of other repositories' log entries.
 *
 * Why this exists
 *
 * `src/lib/log-sources.ts` fetches log/ folders from allowlisted repos at build
 * time. When GitHub is unreachable — an outage, a rate limit, an expired token
 * — the build falls back to `src/data/log-fallback.json` and marks the data
 * stale, so a deploy never fails because of someone else's infrastructure. That
 * only helps if the snapshot has something in it. An empty snapshot turns a
 * GitHub hiccup into every remote entry silently vanishing from the site.
 *
 * Why it is a script and not part of the build
 *
 * Vercel's filesystem is discarded after a deploy, so a snapshot written during
 * a production build would be thrown away — and a build that quietly rewrote a
 * tracked source file would be an unpleasant surprise. The snapshot has to be
 * generated from a working copy and committed. This runs the real loader (via
 * `astro sync`) with LOG_SNAPSHOT=1, so the snapshot is written by exactly the
 * code path that will later read it, and cannot drift from it.
 *
 * Usage:
 *   npm run snapshot:log
 *
 * Then commit src/data/log-fallback.json.
 *
 * Needs GITHUB_TOKEN in the environment (or a .env file Astro picks up) if any
 * allowlisted repo is private — without it the fetch 404s and the snapshot is
 * left alone rather than being overwritten with a worse one.
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotPath = join(root, 'src', 'data', 'log-fallback.json');

/** What the snapshot held before, so the script can report what changed. */
function readSnapshot() {
	try {
		return JSON.parse(readFileSync(snapshotPath, 'utf-8'));
	} catch {
		return { files: [], fetchedAt: null };
	}
}

const before = readSnapshot();

console.log('Refreshing the remote log snapshot…\n');

const child = spawn('npx', ['astro', 'sync'], {
	cwd: root,
	env: { ...process.env, LOG_SNAPSHOT: '1' },
	stdio: 'inherit',
	// npx is a .cmd shim on Windows, which cannot be exec'd directly.
	shell: process.platform === 'win32',
});

child.on('close', (code) => {
	if (code !== 0) {
		console.error(`\nastro sync exited ${code}. The snapshot was not changed.`);
		process.exit(code ?? 1);
	}

	const after = readSnapshot();
	const repos = [...new Set(after.files.map((file) => file.repo))];

	console.log('\n---');

	if (after.files.length === 0) {
		console.log('Snapshot is empty.');
		console.log(
			'Nothing is allowlisted yet — add a repo to LOG_SOURCE_REPOS in src/lib/log-sources.ts,',
		);
		console.log('or, if one is already listed, check that GITHUB_TOKEN can read it.');
		process.exit(0);
	}

	console.log(`Snapshot: ${after.files.length} entries from ${repos.length} repo(s)`);
	for (const repo of repos.sort()) {
		console.log(`  ${repo}: ${after.files.filter((file) => file.repo === repo).length}`);
	}
	console.log(`Fetched:  ${after.fetchedAt}`);

	const delta = after.files.length - before.files.length;
	if (delta !== 0) {
		console.log(`Change:   ${delta > 0 ? '+' : ''}${delta} entries since the last snapshot`);
	}

	console.log('\nNow commit it:');
	console.log('  git add src/data/log-fallback.json');
	console.log('  git commit -m "Refresh the remote log snapshot"');
});
