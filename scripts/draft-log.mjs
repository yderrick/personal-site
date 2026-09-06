#!/usr/bin/env node
/**
 * Collect today's commits across every local repository, so a log entry can be
 * written from what actually happened rather than from memory.
 *
 * This deliberately does NOT write a log file. It prints commits; the entry is
 * then written in my own voice, summarising what the work *accomplished* rather
 * than restating commit subjects. A script that generated the prose would
 * produce a changelog wearing a diary's clothes, which is the one thing the log
 * is not for.
 *
 * Usage:
 *   node scripts/draft-log.mjs                  # today, across sibling repos
 *   node scripts/draft-log.mjs --since 2026-09-01
 *   node scripts/draft-log.mjs --date 2026-09-04   # one specific day
 *   node scripts/draft-log.mjs --root "C:/code"    # where the repos live
 *
 * Reads nothing but git. Private repos stay private — this runs on the local
 * clones and prints to a terminal; nothing is sent anywhere.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The address commits are authored under. Matches CLAUDE.md's workflow note. */
const AUTHOR = 'crystaladdison17@gmail.com';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

function arg(name) {
	const index = process.argv.indexOf(`--${name}`);
	return index !== -1 ? process.argv[index + 1] : undefined;
}

function today() {
	// Local midnight, not UTC: "what did I do today" is a question about the
	// day I am living in, and Ghana is UTC+0 anyway.
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
		now.getDate(),
	).padStart(2, '0')}`;
}

const date = arg('date');
const since = date ?? arg('since') ?? today();
const until = date ? `${date} 23:59:59` : undefined;

/**
 * Where to look for repositories. Defaults to this repo's parent directory,
 * which is where sibling clones normally sit.
 */
const searchRoot = resolve(arg('root') ?? join(repoRoot, '..'));

function isRepo(path) {
	return existsSync(join(path, '.git'));
}

function findRepos(root) {
	const found = [];
	if (isRepo(root)) found.push(root);

	let children = [];
	try {
		children = readdirSync(root, { withFileTypes: true });
	} catch {
		return found;
	}

	for (const child of children) {
		if (!child.isDirectory() || child.name.startsWith('.') || child.name === 'node_modules') {
			continue;
		}
		const path = join(root, child.name);
		try {
			if (statSync(path).isDirectory() && isRepo(path)) found.push(path);
		} catch {
			// Unreadable directory — skip it rather than abort the sweep.
		}
	}

	return [...new Set(found)];
}

function commitsIn(repo) {
	const args = [
		'-C',
		repo,
		'log',
		'--all',
		`--author=${AUTHOR}`,
		`--since=${since}`,
		...(until ? [`--until=${until}`] : []),
		// A single-day report only needs the time; a wider window needs the day
		// too, or two commits a week apart look like the same afternoon.
		date ? '--date=format:%H:%M' : '--date=format:%Y-%m-%d %H:%M',
		'--pretty=format:%ad\t%s',
		'--no-merges',
	];

	try {
		return execFileSync('git', args, { encoding: 'utf8' })
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
	} catch (error) {
		console.warn(`  ! ${repo}: ${error.message.split('\n')[0]}`);
		return [];
	}
}

const repos = findRepos(searchRoot);
const window = date ? date : `since ${since}`;

console.log(`\nCommits by ${AUTHOR}, ${window}`);
console.log(`Searched: ${searchRoot}  (${repos.length} repositories)\n`);

let total = 0;

for (const repo of repos.sort()) {
	const commits = commitsIn(repo);
	if (commits.length === 0) continue;

	total += commits.length;
	console.log(`${repo.split(/[\\/]/).pop()}  (${commits.length})`);
	for (const commit of commits.reverse()) {
		const [time, ...rest] = commit.split('\t');
		console.log(`  ${time}  ${rest.join('\t')}`);
	}
	console.log('');
}

if (total === 0) {
	console.log('Nothing. Either a day off, or the commits are somewhere this did not look —');
	console.log('pass --root to point it at where the repos actually are.\n');
	process.exit(0);
}

console.log(`${total} commits.\n`);
console.log(`Next: write log/${date ?? today()}.md — what the work accomplished, not the subjects`);
console.log('above. Check nothing in it should stay private before committing.\n');
