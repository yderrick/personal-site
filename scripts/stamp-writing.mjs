#!/usr/bin/env node
/**
 * Record, and prove, when a piece of writing existed.
 *
 * Why this exists
 *
 * Copyright exists the moment something is written down — Ghana is a Berne
 * Convention signatory, so nothing here is what *creates* the right. What this
 * buys is evidence: the ability to show a third party that a particular text
 * existed on a particular date, without asking them to take my word for it.
 *
 * Three layers, each doing a different job:
 *
 *   1. A SHA-256 of the text, in a committed ledger. This is the index. On its
 *      own it proves nothing an author couldn't fabricate, because the author
 *      commits it.
 *   2. Git and GitHub. The commit that adds a hash is dated, and GitHub records
 *      the push server-side. Better, but it asks a reader to trust GitHub.
 *   3. OpenTimestamps. The hash is submitted to calendar servers that aggregate
 *      it into a Merkle tree and anchor the root in a Bitcoin block. The `.ots`
 *      proof file that comes back can be verified by anyone, and trusts neither
 *      GitHub nor me. This is the layer that actually does the work.
 *
 * What gets hashed
 *
 * The body, not the file. Frontmatter carries `draft` and `updated`, which
 * change without a word of the text changing; hashing the whole file would
 * manufacture revisions that aren't revisions. The body is normalised to LF and
 * stripped of trailing whitespace first, so a checkout on a different platform
 * — or an editor that trims line ends — doesn't invalidate a proof.
 *
 * Because a poem renders as exact text (see src/lib/verse.ts), the bytes hashed
 * here are the bytes a reader sees.
 *
 * Usage:
 *   npm run stamp             # hash new/changed pieces, submit to OpenTimestamps
 *   npm run stamp -- --check  # recompute and report drift; writes nothing
 *   npm run stamp:upgrade     # complete proofs once Bitcoin has confirmed them
 *
 * Then commit src/data/writing-ledger.json and anything new under proofs/.
 *
 * Drafts are skipped. A draft is not published, so there is nothing to claim
 * yet, and a hash in a public ledger would announce that an unpublished piece
 * exists.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import OpenTimestamps from 'opentimestamps';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITING_DIR = path.join(ROOT, 'src/content/writing');
const LEDGER_PATH = path.join(ROOT, 'src/data/writing-ledger.json');
const PROOFS_DIR = path.join(ROOT, 'proofs');

/**
 * The OpenTimestamps client submits to several calendar servers at once and
 * keeps the first answers, leaving the losing sockets to be torn down whenever
 * the remote gets round to it. A reset on one of those arrives as an unhandled
 * socket 'error' event — after the work is done and the ledger is written — and
 * would crash the process with a stack trace that suggests the stamp failed
 * when it didn't.
 *
 * Narrow on purpose: only connection-teardown errno values are swallowed, and
 * only after being reported. Anything else still crashes, and every exit code
 * below is set explicitly.
 */
process.on('uncaughtException', (error) => {
	if (['ECONNRESET', 'EPIPE', 'ECONNABORTED'].includes(error.code)) return;
	throw error;
});

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const UPGRADE_ONLY = args.has('--upgrade');

/* ------------------------------------------------------------------ *
 * Reading the pieces
 * ------------------------------------------------------------------ */

/**
 * Split frontmatter from body. Deliberately not a YAML parse — the only thing
 * needed here is where the body starts, plus the two fields used for reporting.
 */
function splitFrontmatter(raw) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
	if (!match) return { frontmatter: '', body: raw };
	return { frontmatter: match[1], body: match[2] };
}

function readField(frontmatter, field) {
	const match = new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(frontmatter);
	if (!match) return undefined;
	return match[1].trim().replace(/^["']|["']$/g, '');
}

/**
 * The exact bytes an authorship claim is made over.
 *
 * LF-normalised and trailing-whitespace-stripped so the hash is a property of
 * the text rather than of the machine it was last saved on. `.gitattributes`
 * already normalises line endings in the repository; this makes the script
 * agree with it rather than depending on it.
 */
function canonicalBody(body) {
	return body
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+$/gm, '')
		.replace(/\n+$/, '')
		.replace(/^\n+/, '');
}

function sha256(text) {
	return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function readPieces() {
	if (!existsSync(WRITING_DIR)) return [];

	const files = (await readdir(WRITING_DIR))
		.filter((name) => name.endsWith('.md') && !name.startsWith('_'))
		.sort();

	const pieces = [];

	for (const file of files) {
		const raw = await readFile(path.join(WRITING_DIR, file), 'utf8');
		const { frontmatter, body } = splitFrontmatter(raw);

		// `draft: true` only. An absent field means published, matching the
		// schema default in src/content.config.ts.
		if (readField(frontmatter, 'draft') === 'true') continue;

		const canonical = canonicalBody(body);
		if (canonical.length === 0) continue;

		pieces.push({
			slug: file.replace(/\.md$/, ''),
			title: readField(frontmatter, 'title') ?? file,
			kind: readField(frontmatter, 'kind') ?? 'essay',
			date: readField(frontmatter, 'date') ?? '',
			sha256: sha256(canonical),
		});
	}

	return pieces;
}

/* ------------------------------------------------------------------ *
 * The ledger
 * ------------------------------------------------------------------ */

async function readLedger() {
	if (!existsSync(LEDGER_PATH)) return {};
	return JSON.parse(await readFile(LEDGER_PATH, 'utf8'));
}

async function writeLedger(ledger) {
	// Sorted so a diff shows a new revision, not a reordering.
	const sorted = Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)));
	await writeFile(LEDGER_PATH, `${JSON.stringify(sorted, null, '\t')}\n`);
}

/* ------------------------------------------------------------------ *
 * OpenTimestamps
 * ------------------------------------------------------------------ */

function proofPath(slug, digest) {
	return path.join(PROOFS_DIR, `${slug}-${digest.slice(0, 8)}.ots`);
}

/**
 * Submit a digest to the calendar servers and write the pending proof.
 *
 * `OpenTimestamps.stamp()` does not throw when every calendar is unreachable —
 * it resolves with a timestamp carrying no attestations, which serializes to a
 * small, well-formed, completely worthless file. Writing that would be the
 * worst outcome available: the ledger would claim a proof exists, and the
 * absence would only be discovered on the day it was needed. So the result is
 * checked before anything touches the disk, and an empty one is an error.
 */
async function stamp(slug, digest) {
	const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
		new OpenTimestamps.Ops.OpSHA256(),
		Buffer.from(digest, 'hex'),
	);

	await OpenTimestamps.stamp(detached);

	const attestations = detached.timestamp.allAttestations();
	if (attestations.size === 0) {
		throw new Error(
			'no calendar server responded, so the proof would attest to nothing',
		);
	}

	await mkdir(PROOFS_DIR, { recursive: true });

	const file = proofPath(slug, digest);
	await writeFile(file, Buffer.from(detached.serializeToBytes()));

	return path.relative(ROOT, file);
}

/**
 * Ask the calendars whether a pending proof has made it into a block yet.
 *
 * A fresh stamp is a promise, not a proof: the calendar has committed to
 * including the digest, but the Bitcoin attestation only exists once the block
 * is mined and the calendar has caught up — usually a few hours, sometimes a
 * day. Until then the `.ots` file verifies only against the calendar. This is
 * why there is a second command. See RUNBOOK.md §6.
 */
async function upgradeAll(ledger) {
	let upgraded = 0;
	let pending = 0;

	for (const [slug, revisions] of Object.entries(ledger)) {
		for (const revision of revisions) {
			if (!revision.ots || revision.bitcoin) continue;

			const file = path.join(ROOT, revision.ots);
			if (!existsSync(file)) {
				console.warn(`  ! ${slug}: proof file missing (${revision.ots})`);
				continue;
			}

			const detached = OpenTimestamps.DetachedTimestampFile.deserialize(
				Buffer.from(await readFile(file)),
			);

			const changed = await OpenTimestamps.upgrade(detached);

			if (changed) {
				await writeFile(file, Buffer.from(detached.serializeToBytes()));
				revision.bitcoin = true;
				upgraded += 1;
				console.log(`  ✓ ${slug} @ ${revision.sha256.slice(0, 8)} — anchored in Bitcoin`);
			} else {
				pending += 1;
				console.log(`  … ${slug} @ ${revision.sha256.slice(0, 8)} — still pending`);
			}
		}
	}

	return { upgraded, pending };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const ledger = await readLedger();

if (UPGRADE_ONLY) {
	console.log('Upgrading pending OpenTimestamps proofs…\n');
	const { upgraded, pending } = await upgradeAll(ledger);

	if (upgraded > 0) await writeLedger(ledger);

	console.log(
		`\n${upgraded} upgraded, ${pending} still pending.` +
			(upgraded > 0 ? '\nCommit src/data/writing-ledger.json and proofs/.' : ''),
	);
	if (pending > 0) console.log('Pending proofs are normal for the first day. Run this again tomorrow.');
	process.exit(0);
}

const pieces = await readPieces();

if (pieces.length === 0) {
	console.log('No published writing to stamp.');
	process.exit(0);
}

let added = 0;
let proved = 0;
let drift = 0;

for (const piece of pieces) {
	const revisions = ledger[piece.slug] ?? [];
	const latest = revisions.at(-1);

	if (latest?.sha256 === piece.sha256) continue;

	if (CHECK_ONLY) {
		drift += 1;
		console.log(
			latest
				? `  ~ ${piece.slug} — text changed since the last stamped revision`
				: `  + ${piece.slug} — not stamped yet`,
		);
		continue;
	}

	// A new revision is appended; an existing one is never rewritten. An edited
	// piece keeps the record of what it used to say, which is the whole point of
	// a ledger rather than a checksum file.
	const revision = {
		sha256: piece.sha256,
		stampedAt: new Date().toISOString(),
		title: piece.title,
	};

	try {
		revision.ots = await stamp(piece.slug, piece.sha256);
		revision.bitcoin = false;
		proved += 1;
	} catch (error) {
		// A calendar being unreachable must not lose the hash — that is the part
		// that is time-sensitive, and git will date the commit that adds it. The
		// ledger entry is written without `ots`, which is also what makes the
		// next `npm run stamp` retry the submission rather than skip the piece.
		console.warn(`  ! ${piece.slug}: ${error.message}`);
		console.warn('    Hash recorded; run `npm run stamp` again to retry the proof.');
	}

	ledger[piece.slug] = [...revisions, revision];
	added += 1;
	console.log(
		`  + ${piece.slug} @ ${piece.sha256.slice(0, 8)}${revision.ots ? ` → ${revision.ots}` : ' (hash recorded, proof pending retry)'}`,
	);
}

if (CHECK_ONLY) {
	console.log(drift === 0 ? 'Ledger is current.' : `\n${drift} piece(s) need stamping.`);
	process.exit(drift === 0 ? 0 : 1);
}

if (added === 0) {
	console.log('Ledger is current — nothing to stamp.');
	process.exit(0);
}

await writeLedger(ledger);

// Reported separately on purpose. A hash recorded without a proof is still
// worth committing — git dates it — but it is not the thing this script exists
// to produce, and a summary that conflated the two would hide that.
console.log(`\n${added} revision(s) hashed, ${proved} with an OpenTimestamps proof.`);

if (proved < added) {
	console.log(
		`${added - proved} could not reach a calendar server. The hashes are recorded;` +
			' run `npm run stamp` again when you are back online to add the proofs.',
	);
}

console.log(`Commit src/data/writing-ledger.json${proved > 0 ? ' and proofs/' : ''}.`);

if (proved > 0) {
	console.log('Then run `npm run stamp:upgrade` tomorrow to complete the Bitcoin proofs.');
}
