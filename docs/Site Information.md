# Site Information

The complete behavioural reference for this site: every page, component, content field, build-time data source and utility, and what each one does.

**How to maintain this file.** It is updated in the *same commit* as the change it describes, never as a follow-up. If a change adds or alters a page, a component's visible behaviour, a content field, or a data source, it belongs here. Sections marked *(not built yet)* are filled in as the phases in [task.md](../task.md) land — a section describing something that doesn't exist yet is worse than no section, so keep the marker until the thing is real.

Describe what something *does*, from the outside. Architecture and conventions live in [CLAUDE.md](../CLAUDE.md); this file is what the site does.

---

## Deployment

Live at **https://personal-site-phi-seven-43.vercel.app**, built from `main` at `yderrick/personal-site`. Every push to `main` rebuilds and redeploys; pull requests get their own preview URLs. The production URL is set as `site` in `astro.config.mjs` — RSS and canonical URLs read it, so pointing a custom domain here later means changing that one value.

**What triggers a rebuild**, since the site is static and its data is fetched at build time:

| Trigger | Latency | Where it lives |
|---|---|---|
| A push to `main` here | immediate | Vercel's Git integration |
| The daily refresh | up to 24h | `.github/workflows/refresh.yml`, 06:15 UTC |
| A push touching `log/**` in another repo | ~1 min | `templates/publish-log.yml`, copied into that repo |

The third is optional per repo. Without it a log entry written elsewhere still reaches the site, just
at the next daily refresh — the fast path, not the only path. All three call the same Vercel deploy
hook, so the hook URL is a shared credential: if it leaks, delete it in Vercel, create a new one, and
update the secret in every repo that holds it.

---

## Pages

### `/` — Home
Tagline and intro, then the three most recent published log entries, the two most recent pieces of
writing, and up to two pinned projects. Pinned projects are those with `pinned: true` in their
blurb; if none are pinned it falls back to the two most recently pushed. The writing block is hidden
entirely when there is nothing published, rather than showing an empty section.

### `/log` — Daily log
Reverse-chronological list of all published entries, each showing its date, title, opening line and
tags. Above the list is a tag bar listing every tag in use with a count; the tags are derived from
the entries, so there is no second list to maintain. Drafts never appear.

**Coverage.** The log carries one entry for every day with commits, across all repositories, going
back to the first commit on 22 June 2026 — so the days in the log and the days in the `/projects`
heatmap are the same set. Entries dated before 6 September 2026 were written afterwards from commit
history and are labelled `reconstructed`; a note at the top of the page explains this. The date on an
entry is when the work happened, and the label says whether the writing happened then too.

### `/log/[...slug]` — Entry
One log entry: date, title, tags, rendered body, and links to the adjacent entries. The links are
labelled **Older** and **Newer** rather than previous/next, because "previous" is ambiguous in a
reverse-chronological list. Slug derives from the filename, so `2026-09-05.md` → `/log/2026-09-05`.

An entry fetched from another repository is namespaced by repo — `/log/daylog/2026-09-06` — and
carries a quiet "from the log of *daylog*" line under its title. That is why the route is a rest
parameter: a remote entry's path has two segments. Entries written here keep their existing
single-segment URLs, which are already live and linked.

### `/log/tags/[tag]` — Tag
Entries carrying one tag, newest first, with a count and a link back to the full log. A page exists
for every tag used by a published entry; a tag used only by drafts generates no page.

### `/writing` — Writing
Essays, poems and fragments — the writing that isn't about work. A separate stream from `/log` on
purpose: that one is a record of what I built, this one isn't about building anything.

One reverse-chronological list via `src/components/WritingList.astro`, with a count of each kind
under the heading rather than a filter bar — with a handful of pieces, three tabs to click would be
more furniture than help. Links out to `/writing/rss.xml` and `/writing/proof`.

### `/writing/[...slug]` — Piece
One essay, poem or fragment. The filename is the slug, so the URL is `/writing/<slug>` with no date
in it; `date` lives in frontmatter, which means a piece can be re-dated or reclassified without
breaking a link someone has shared.

**Rendering branches on `kind`.** An essay or fragment renders through `render(entry)` and
`<Content />` like a log entry. A poem does not go through Markdown at all: Sätteri follows
CommonMark, where a single newline collapses, and it has no `breaks` option — so a poem's body is
escaped and emitted a line at a time by `src/lib/verse.ts` and `Verse.astro`, preserving line
breaks, blank-line stanzas and leading indentation exactly as typed. Poems also set narrower
(`--measure-verse`), carry a smaller title, and lose the rule under the header: verse wants air, not
furniture.

Prev/next links at the foot, labelled Older/Newer. Tags are displayed but are not links — there are
no `/writing/tags/` routes (see Known gaps).

### `/writing/proof` — Authorship record
The dated hash of every published piece, and a plain statement of what each layer of evidence
actually establishes. Reads `src/data/writing-ledger.json` rather than the collection, so a piece
that has been unpublished keeps its record — a ledger that could be edited by deleting a file would
not be a ledger. Includes the commands to re-verify every hash, and to verify an OpenTimestamps
proof independently of this repository.

### `/writing/rss.xml` — Writing feed
The writing as RSS 2.0, generated by `src/pages/writing/rss.xml.ts`, separate from the log feed.
Two feeds because they are two different invitations: someone following the log for the engineering
has not asked for poems, and the reverse holds too. Same `public/rss.xsl` stylesheet. A poem carries
an empty description — flattening verse into a line of prose misrepresents it, and an empty
description degrades better in a reader than a mangled one. `<category>` carries the kind first,
then any tags.

### `/projects` — Showcase
An activity summary followed by a bento grid of repositories, pinned first then most recently pushed.

The summary reports commits over the last 52 weeks, days with commits, the longest unbroken run of
days, and total tagged releases, above a calendar heatmap of the last 18 weeks. Both public and
allowlisted private repositories feed it.

Cards show name, blurb, language, commit count, release count with the latest tag, and last-active
date. A public repo's name links to GitHub. **A private repo carries a "Private" badge and no link at
all** — nothing on the card implies the code is one click away. The page footer states the date the
data was fetched, and says explicitly when it is showing a saved snapshot rather than live data.

### `/now` — Current focus
What I'm working on at the moment. Prose lives in `src/content/now/index.md`, same arrangement as
`/about`, plus a required `updated` date that the page prints as "Last checked …".

The date is required and hand-set on purpose. A `/now` page's whole claim is that it is current, so
one that has quietly stopped being true is worse than no page at all; deriving the date from the
file's mtime would refresh it on a reformat, and only a person can say the words still hold. Past 60
days the build prints a warning naming the file and its age, and the page adds "— overdue a rewrite"
beside the date. A warning rather than an error: a stale sentence should never fail a deploy, and the
daily refresh build would otherwise break the site on a schedule.

### `/about`
Bio and contact links. The prose lives in `src/content/about/index.md` as plain Markdown, so the
writing can be changed without touching the page markup; `headline` in its frontmatter is the large
line at the top. The links come from `LINKS` in `src/consts.ts`, which the footer reads too.

### `/404`
Shown for any address that doesn't exist. Names the real routes so a wrong link is a detour
rather than a dead end.

### `/rss.xml` — Feed
Every published log entry as RSS 2.0, generated by `src/pages/rss.xml.ts`. It reads through
`src/lib/log.ts` like every other surface, so drafts are excluded by the same single filter rather
than a second one that could drift. Entries fetched from other repositories are included — a reader
subscribing to the log wants the whole log, not the part of it that happens to live in this repo.

Items carry the entry's excerpt rather than its full text, because a feed that formats entries
differently from the pages they link to is worse than one that links out. (Full text would not need
a second Markdown engine: Sätteri exports `markdownToHtml`. An earlier version of this file said it
had no string-rendering entry point, which was wrong.) Tags become
`<category>` elements, and so do an entry's source repo and the word `reconstructed`, so provenance
travels with an item read far from the page that explains it.

`public/rss.xsl` styles the raw XML for browsers, which is where a feed URL gets opened far more
often than it gets pasted into a reader. Its colours are duplicated from `tokens.css` rather than
imported — the browser transforms this file before any stylesheet loads, so it cannot reach the
site's custom properties. It is the one deliberate exception to the single-source-of-truth rule for
design tokens.

Discovery: a `<link rel="alternate">` in `BaseLayout` on every page — one per feed, each titled so a
reader's client can tell them apart — plus "Log feed" and "Writing feed" links in the footer and a
"Follow by RSS" link on `/log` and `/writing`.

---

## Content

### Log entries — `log/*.md`

One file per entry, named `YYYY-MM-DD.md`. A second entry on the same day is `YYYY-MM-DD-2.md`.

The folder sits at the repository root rather than under `src/` because every repo I work in keeps its log in the same place, and this site's own log is the reference implementation of that shared shape. The full cross-repo contract is [`Log Format.md`](Log%20Format.md).

| Field | Type | Required | Behaviour |
|---|---|---|---|
| `title` | string | yes | Shown on the list, the entry page and the browser title |
| `date` | date | yes | `YYYY-MM-DD`. Drives sort order and the URL |
| `tags` | string[] | no | Lowercase. The tag filter's options are derived from these; there is no separate tag list to maintain |
| `draft` | boolean | no, defaults `false` | `true` hides the entry from every production surface while leaving it visible in `npm run dev` |
| `backfilled` | boolean | no, defaults `false` | `true` marks an entry written after the fact from commit history rather than on the day. The list and entry pages show a badge saying so; entries written on the day simply omit the field |

**Draft behaviour in full.** A `draft: true` entry is absent from: the `/log` list, every tag page, `/log/[...slug]` (no route is generated for it), the home page's recent-entries block, and the RSS feed. A draft in *another* repository is stricter still — it is excluded in dev too, because there is nothing to preview and that repo has already said it is not for publication. This is a privacy guarantee, not a convenience — any new surface reading log entries goes through `src/lib/log.ts`, which applies the filter in one place.

*Verified 2026-09-05* by adding a `draft: true` entry with unique marker strings, then checking that
those strings appear on the list, entry, tag and home surfaces under `npm run dev`, and appear
nowhere in `dist/` after `npm run build` — with no entry route and no tag page generated for it.
Re-run that check whenever a new surface starts reading the collection.

**Ordering.** Entries sort by date, newest first, tie-broken by descending filename. Two entries
share a date whenever a day has more than one, so without the tie-break their relative order would
depend on whatever sequence the loader happened to return. The tie-break also puts `-2` above the
plain file, which matches what the suffix means: the second entry written that day.

### Essays and poems — `src/content/writing/*.md`

One file per piece, flat, named for its slug (`low-tide.md` → `/writing/low-tide`). Deliberately
**not** date-prefixed like `log/`: a poem is identified by its title, not the day it was finished,
and reclassifying a piece must never break a URL that has been shared.

| Field | Type | Required | Behaviour |
|---|---|---|---|
| `title` | string | yes | Shown on the list, the piece page and the browser title |
| `date` | date | yes | `YYYY-MM-DD`. Drives sort order. Not part of the URL |
| `kind` | `essay` \| `poem` \| `fragment` | no, defaults `essay` | Drives rendering, not just labelling — a `poem` bypasses Markdown entirely. Also the leading `<category>` in the feed |
| `tags` | string[] | no | Lowercase. Displayed, but not links — there are no tag routes yet |
| `draft` | boolean | no, defaults `false` | `true` hides the piece from every production surface while leaving it visible in `npm run dev` |
| `updated` | date | no | Set when the text is revised after publishing. The page prints "Revised …" and links to the authorship record, which holds the hash of each earlier version |

**Draft behaviour in full.** A `draft: true` piece is absent from: the `/writing` list, the home
page's writing block, `/writing/[...slug]` (no route is generated for it), `/writing/rss.xml`, the
sitemap, and the authorship ledger — `npm run stamp` skips drafts, because an unpublished piece has
nothing to claim yet and a hash in a public ledger would announce that it exists. Filtered in one
place, `src/lib/writing.ts`, exactly as the log is.

*Verified 2026-09-14* by adding a `draft: true` piece with a unique marker string, confirming it
renders under `npm run dev` (list and page, HTTP 200), then confirming after `npm run build` that
the marker appears nowhere in `dist/`, no route was generated, and it is absent from the feed and
the sitemap. Also confirmed `npm run stamp -- --check` leaves it unstamped. Re-run that check
whenever a new surface starts reading the collection.

**What `draft` does not do.** This repository is public, so a drafted piece is off the site but
still readable by anyone who opens the repo. Writing that must stay unread goes in a
`_`-prefixed file: the collection's glob (`**/[^_]*.md`) skips it and `.gitignore` keeps it out of
the repository entirely. This is the only actually-private option.

### About page — `src/content/about/index.md`

The body of `/about`, as Markdown. Frontmatter is `title` (browser tab) and `headline` (the large
line above the body). Headings, lists, bold and links are all styled by the page. Kept as content
rather than markup so the bio can be rewritten without editing an `.astro` file.

### Project blurbs — `src/content/projects/*.md`

Optional hand-written descriptions for pinned repos, matched to API data by repo name. The API supplies the facts (stars, language, last push date); the blurb supplies the writing and an optional screenshot. A blurb with no matching repo is ignored rather than rendered.

---

## Build-time data

### Log entries from other repositories — `src/lib/log-sources.ts`, `src/lib/remote-log-loader.ts`

Every repo keeps its daily log in a root-level `log/` folder ([`Log Format.md`](Log%20Format.md)).
This fetches those folders over the GitHub REST API at build time and feeds them into the
`remoteLog` content collection, which shares one schema object with the local `log` collection so the
two cannot drift apart.

**Currently allowlisted:** `worldbuilder-engine` and `budget-app` (both private). Their `log/` folders are published in full.

**What appears.** Nothing, unless a repository is named in `LOG_SOURCE_REPOS`. Unlike the projects
showcase, public repos are *not* included automatically — a log folder is prose, and "the repo is
public" is not the same statement as "every note in it was meant to be read". Adding a repo to that
array publishes **every** non-draft entry in its `log/`, past and future, in full.

**Ids and URLs.** Remote entries are namespaced by repo (`daylog/2026-09-06`), so two repositories
logging on the same day never collide. Local entries keep their bare ids and existing URLs.

**Failure handling**, deliberately different at the two levels:

| Failure | Behaviour |
|---|---|
| One entry's frontmatter fails the schema, or has no readable YAML | Skipped, with a build warning naming the file. The build continues — a typo in another repo must not break this deploy |
| A whole repo fails to fetch (404, network, revoked token) | The *entire* remote fetch falls back to `src/data/log-fallback.json` and is marked stale. Publishing some repos while claiming to be current is the failure this prevents |

*Verified 2026-09-06* against the live API with `LOG_SOURCE_REPOS = ['personal-site']`: 22 entries
fetched, validated and rendered; a bogus repo name produced the snapshot fallback and a warning; a
deliberately unsatisfiable remote schema skipped every entry without failing the build.

### GitHub repositories

Fetched once per build from the GitHub REST API. Nothing is fetched in the browser — by the time a
visitor loads the page it is static HTML, and the site ships no JavaScript at all. The token is used
only on the build machine and never reaches the output.

**What appears.** Public repositories are included automatically. A private repository appears only
if its name is listed in `SHOWCASED_PRIVATE_REPOS` in `src/lib/github.ts` — an allowlist, so
forgetting to update it hides a project rather than exposing one. Forks, archived repos and anything
in `HIDDEN_REPOS` are excluded either way.

**What a private repository publishes:** name, language, commit cadence, release count and
last-active date, plus its hand-written blurb. Never a URL, a file name or a commit message.

**Data sources.** Repository metadata comes from `/user/repos`; weekly commit counts from
`/stats/participation`; day-level counts from `/stats/commit_activity`; release cadence from `/tags`.
The `/stats/*` endpoints compute asynchronously and answer `202` — or `200` with an empty body — on a
cold cache, so they are polled a few times before being given up on.

**Failure behaviour.** On any failure the build logs a warning and renders from
`src/data/projects-fallback.json`, a committed snapshot, then labels the page as showing saved data.
The build never fails.

A missing or under-scoped token counts as a failure even though the API returns `200`: without one,
only public repos come back, and the page would silently omit every private project while claiming to
be current. The fetch checks that every allowlisted private repo is present and falls back if any is
missing.

`GITHUB_TOKEN` is declared through `astro:env` with `access: 'secret'` and `context: 'server'`. It is
optional — with it unset the build succeeds using the snapshot — but production needs it set in
Vercel's environment variables for private repositories to appear.

### Authorship ledger — `src/data/writing-ledger.json`, `scripts/stamp-writing.mjs`

A committed record of when each piece of writing existed, maintained by `npm run stamp` and read by
`/writing/proof`. Not part of the build: the script is run by hand before a publishing commit, and
the build only reads the JSON it produces.

**What is hashed.** The body, not the file. Frontmatter carries `draft` and `updated`, which change
without a word of the text changing; hashing the whole file would manufacture revisions that aren't
revisions. The body is normalised to LF and stripped of trailing whitespace first, so a checkout on
another platform — or an editor that trims line ends — doesn't invalidate a proof. Because a poem
renders as exact text, the bytes hashed are the bytes a reader sees.

**Shape.** Keyed by slug; each value is an array of revisions, appended to and never rewritten, so
an edited piece keeps the record of what it used to say. A revision is `{ sha256, stampedAt, title,
ots?, bitcoin? }`.

**Three layers, doing different jobs.** The hash identifies the text but proves nothing on its own,
because the author commits it. Git and GitHub date the commit server-side, which is good evidence if
you trust GitHub. The OpenTimestamps `.ots` proof under `proofs/` anchors the hash in a Bitcoin
block and needs no trust in anyone. `/writing/proof` says all three of these out loud rather than
implying the strongest one.

**Partial results are failures.** `OpenTimestamps.stamp()` resolves successfully when every calendar
server is unreachable, returning a timestamp with no attestations that serializes to a small,
well-formed, worthless file. The script checks `allAttestations()` before writing anything and
treats an empty result as an error: the hash is still recorded (git will date it), `ots` is left
absent, and the next `npm run stamp` retries. A ledger that claimed a proof it did not have would be
worse than one that admits the gap — the absence would only be discovered on the day it mattered.

**A fresh proof is pending, not finished.** The Bitcoin attestation only exists once a block is
mined and the calendar has caught up, usually within a day. `npm run stamp:upgrade` completes them
and flips `bitcoin` to `true`. See RUNBOOK §6.

### Freshness

Vercel rebuilds when this repository is pushed. Work done in any *other* repository would therefore
never reach the site, and the activity numbers would go stale while still looking current.
`.github/workflows/refresh.yml` fires a Vercel deploy hook on a daily schedule (06:15 UTC) so the page
tracks reality. It reads a `VERCEL_DEPLOY_HOOK` secret on this repository and fails loudly if the hook
is missing or rejected, because a refresh that quietly stops working is the exact failure it exists to
prevent. It can also be run on demand from the Actions tab.

**Watch the token expiry.** `GITHUB_TOKEN` in Vercel is what lets the build see private repositories.
When it expires the site does not break — it falls back to the snapshot and says so on the page — but
it stops being current. The "Showing a saved snapshot" line is the signal that it needs renewing.

---

## Components *(fill in as built)*

| Component | Used on | What it does |
|---|---|---|
| `src/layouts/BaseLayout.astro` | Every page | Document head (title, description, canonical, Open Graph), self-hosted font imports, skip link, nav, footer. Takes optional `title` and `description` props; `title` is suffixed with the site name |
| `src/components/Heatmap.astro` | `/projects` | Calendar heatmap of daily commit counts — one column per week, one row per weekday. Intensity is bucketed into four steps of the single accent colour. Scrolls horizontally inside its own container on narrow screens |
| `src/components/ProjectCard.astro` | `/`, `/projects` | One repository: name, blurb, language, commit and release counts, last-active date. Links out only for public repos. Hides the commit count when it is zero, because GitHub's stats lag a newly created repo and "0 commits" beside "last active today" would be wrong |
| `src/components/LogList.astro` | `/`, `/log`, `/log/tags/[tag]` | Renders a list of log entries: date, title, opening line, tags. Takes `entries` and an optional `summaries` flag. Shows a "Draft" badge on draft entries, which is only ever reachable in dev, and the source repo's name in the date gutter for an entry fetched from another repository |
| `src/components/WritingList.astro` | `/`, `/writing` | Renders a list of writing: date, kind, title, opening line, tags. A sibling of `LogList` rather than a widening of it — `LogList` is typed to a union that carries remote-log provenance, which writing has none of. Skips the summary for a poem, since flattening verse to one line reads as damage rather than a preview |
| `src/components/Verse.astro` | `/writing/[...slug]` | A poem's body as exact text: one `<span class="line">` per line, each with a hanging indent so a wrap is visually distinct from a line the author broke. Blank lines keep a line's height so stanza breaks survive |
| `src/components/Nav.astro` | Every page, via `BaseLayout` | Site nav. Marks the current route with `aria-current="page"`. Routes flagged `ready: false` render as plain dotted-underlined text rather than links, so nothing 404s while the site is being built |

---

## Utilities

| Module | What it does |
|---|---|
| `src/consts.ts` | Site title, tagline, description, the nav route list, and `LINKS` — the contact and profile links. Both defined here only; the nav and footer read them rather than hardcoding anything |
| `src/lib/log.ts` | Reads the log collection. The single place drafts are filtered — every page and feed calls this rather than `getCollection('log')` directly. Also owns entry sorting, tag counting, adjacent-entry lookup, UTC date formatting and list excerpts |
| `src/lib/writing.ts` | Reads the writing collection. The single place its drafts are filtered — every page and feed calls this rather than `getCollection('writing')` directly. Also owns sorting, hrefs, adjacent-piece lookup, and a guard that fails the build if a piece takes a slug a static `/writing/` route already owns |
| `src/lib/content.ts` | Helpers shared by every collection: UTC date formatting, ISO dates, and the derived list excerpt. `log.ts` re-exports them under their previous names, so its callers were unchanged when they moved here |
| `src/lib/verse.ts` | Turns a poem's raw body into HTML without parsing Markdown. Escapes first, then applies `*italic*`, so the only tags in the output are the `<em>` pairs it adds |
| `src/lib/github.ts` | Build-time repo fetch, disclosure allowlist, activity statistics and snapshot fallback |
| `src/lib/showcase.ts` | Merges the GitHub data with the `projects` collection blurbs, and formats relative dates |

---

## Metadata and assets

Every page carries a canonical URL, a description, Open Graph and Twitter card tags, and a shared
social image at `/og.png` (1200×630, generated from the site's own palette and type). `BaseLayout`
builds all of it; a page only supplies `title` and `description`.

Icons: `favicon.svg` (an amber block cursor on the site's ground — deliberately not animated, since a
favicon can't honour `prefers-reduced-motion`), `favicon.ico` at 32×32 for older clients, and
`apple-touch-icon.png` at 180×180. `theme-color` is set to the page ground so mobile browser chrome
matches.

`sitemap-index.xml` is generated at build time by `@astrojs/sitemap` and lists every real route; the
404 is excluded. `robots.txt` points at it.

---

## Styling

`src/styles/tokens.css` holds every colour, font, spacing, radius and motion value as a CSS custom property. Components consume tokens; no component hardcodes a hex value or a font stack. A missing value means a new token, not a local exception. `src/styles/global.css` imports the tokens and applies base element styles; it is imported once, by `BaseLayout`.

**Direction — "amber phosphor".** Dark-mode-first on a warm-tinted ground (`#14110c`) with a single amber accent (`#ffb000`). Amber monochrome CRTs were the alternative to green phosphor and were chosen for long-session readability; the palette takes the changelog/terminal association the log needs without the green-on-black cliché. There is no second hue — the accent is also the focus-ring colour.

**Type.** Bricolage Grotesque (display), Public Sans (body), JetBrains Mono (dates, tags and other data). All three are self-hosted variable fonts via `@fontsource-variable`, imported in `BaseLayout` — no font CDN, so no render-blocking third-party request. An English-language visitor downloads three woff2 subsets totalling about 106 KB; the other subsets are `unicode-range`-gated and never fetched.

**Measure.** `--measure` (64ch) caps prose. `--measure-verse` (46ch) caps poems: a poem's line
breaks are the author's, so the column only has to be wide enough that the browser rarely overrides
them.

**Contrast.** Every foreground/background pair in the token set clears WCAG AA (4.5:1): body text 15.3:1, muted text 5.2:1 on the page ground and 4.9:1 on card surfaces, accent 10.3:1. Muted-on-surface is the tightest pair — check it before darkening any surface token.

Motion respects `prefers-reduced-motion` globally rather than per component.

---

## Known gaps

Things that are deliberately not built, or built partially, so they don't get rediscovered as bugs:

- **`AIstudio` is deliberately not on the site.** It is private and not in `SHOWCASED_PRIVATE_REPOS`, so it is excluded by default. Its GitHub description would need rewriting before it were added.
- **`src/data/log-fallback.json` goes stale between refreshes.** It is a committed snapshot, so it only contains what `npm run snapshot:log` last fetched. Re-run it after a run of entries lands in an allowlisted repo, or a GitHub outage will serve a build several entries behind. See RUNBOOK §6.
- **There are no `/writing/tags/[tag]` routes.** Tags are stored and displayed on writing, but they
  do not link anywhere. With a handful of pieces, `kind` is the only facet worth browsing by; the
  log's tag routes are the template if that changes.
- **Four pages each declare their own `.prose` block.** `/log/[...slug]`, `/about`, `/now` and
  `/writing/[...slug]` repeat nearly the same scoped Markdown element styles. Factoring them into
  one shared stylesheet is worthwhile, but it risks visual regressions on three working pages and
  was kept out of the commit that added the fourth.
- **A newly created repository reports zero commits for a while.** GitHub's `/stats/participation` lags behind a repo's first pushes, so `personal-site` shows no commit count despite being active. The card hides a zero count rather than displaying it; this corrects itself once GitHub's statistics catch up.
