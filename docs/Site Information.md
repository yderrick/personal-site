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
Tagline and intro, then the three most recent published log entries and up to two pinned projects.
Pinned projects are those with `pinned: true` in their blurb; if none are pinned it falls back to the
two most recently pushed.

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

Items carry the entry's excerpt rather than its full text. Rendering the body would mean a second
Markdown engine in the build (the site renders through Sätteri, which has no string-rendering entry
point) and a feed formatting entries differently from the pages they link to. Tags become
`<category>` elements, and so do an entry's source repo and the word `reconstructed`, so provenance
travels with an item read far from the page that explains it.

`public/rss.xsl` styles the raw XML for browsers, which is where a feed URL gets opened far more
often than it gets pasted into a reader. Its colours are duplicated from `tokens.css` rather than
imported — the browser transforms this file before any stylesheet loads, so it cannot reach the
site's custom properties. It is the one deliberate exception to the single-source-of-truth rule for
design tokens.

Discovery: a `<link rel="alternate">` in `BaseLayout` on every page, an "RSS" link in the footer, and
a "Follow by RSS" link on `/log`.

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
| `src/components/Nav.astro` | Every page, via `BaseLayout` | Site nav. Marks the current route with `aria-current="page"`. Routes flagged `ready: false` render as plain dotted-underlined text rather than links, so nothing 404s while the site is being built |

---

## Utilities

| Module | What it does |
|---|---|
| `src/consts.ts` | Site title, tagline, description, the nav route list, and `LINKS` — the contact and profile links. Both defined here only; the nav and footer read them rather than hardcoding anything |
| `src/lib/log.ts` | Reads the log collection. The single place drafts are filtered — every page and feed calls this rather than `getCollection('log')` directly. Also owns entry sorting, tag counting, adjacent-entry lookup, UTC date formatting and list excerpts |
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

**Contrast.** Every foreground/background pair in the token set clears WCAG AA (4.5:1): body text 15.3:1, muted text 5.2:1 on the page ground and 4.9:1 on card surfaces, accent 10.3:1. Muted-on-surface is the tightest pair — check it before darkening any surface token.

Motion respects `prefers-reduced-motion` globally rather than per component.

---

## Known gaps

Things that are deliberately not built, or built partially, so they don't get rediscovered as bugs:

- **`AIstudio` is deliberately not on the site.** It is private and not in `SHOWCASED_PRIVATE_REPOS`, so it is excluded by default. Its GitHub description would need rewriting before it were added.
- **`src/data/log-fallback.json` is empty until a repo is allowlisted.** `npm run snapshot:log` fills it; see RUNBOOK §6. Empty is correct while `LOG_SOURCE_REPOS` is empty, but leaving it empty *after* allowlisting means a GitHub failure drops remote entries entirely instead of serving them stale.
- **A newly created repository reports zero commits for a while.** GitHub's `/stats/participation` lags behind a repo's first pushes, so `personal-site` shows no commit count despite being active. The card hides a zero count rather than displaying it; this corrects itself once GitHub's statistics catch up.
