# Site Information

The complete behavioural reference for this site: every page, component, content field, build-time data source and utility, and what each one does.

**How to maintain this file.** It is updated in the *same commit* as the change it describes, never as a follow-up. If a change adds or alters a page, a component's visible behaviour, a content field, or a data source, it belongs here. Sections marked *(not built yet)* are filled in as the phases in [task.md](../task.md) land — a section describing something that doesn't exist yet is worse than no section, so keep the marker until the thing is real.

Describe what something *does*, from the outside. Architecture and conventions live in [CLAUDE.md](../CLAUDE.md); this file is what the site does.

---

## Deployment

Live at **https://personal-site-phi-seven-43.vercel.app**, built from `main` at `yderrick/personal-site`. Every push to `main` rebuilds and redeploys; pull requests get their own preview URLs. The production URL is set as `site` in `astro.config.mjs` — RSS and canonical URLs read it, so pointing a custom domain here later means changing that one value.

---

## Pages

### `/` — Home *(not built yet)*
Intro and tagline, 2–3 pinned projects, the three most recent published log entries.

### `/log` — Daily log *(not built yet)*
Reverse-chronological list of all published entries. Filterable by tag. Drafts never appear.

### `/log/[slug]` — Entry *(not built yet)*
One log entry: title, date, tags, body. Slug derives from the filename, so `2026-09-05.md` → `/log/2026-09-05`.

### `/projects` — Showcase *(not built yet)*
Bento grid of public GitHub repos, sorted by last push, with hand-written blurbs merged in for pinned favourites.

### `/about` *(not built yet)*
Short bio and links out.

### `/rss.xml` *(optional, Phase 6)*
Feed of published log entries.

---

## Content

### Log entries — `src/content/log/*.md`

One file per entry, named `YYYY-MM-DD.md`. A second entry on the same day is `YYYY-MM-DD-2.md`.

| Field | Type | Required | Behaviour |
|---|---|---|---|
| `title` | string | yes | Shown on the list, the entry page and the browser title |
| `date` | date | yes | `YYYY-MM-DD`. Drives sort order and the URL |
| `tags` | string[] | no | Lowercase. The tag filter's options are derived from these; there is no separate tag list to maintain |
| `draft` | boolean | no, defaults `false` | `true` hides the entry from every production surface while leaving it visible in `npm run dev` |

**Draft behaviour in full.** A `draft: true` entry is absent from: the `/log` list, every tag page, `/log/[slug]` (no route is generated for it), the home page's recent-entries block, and the RSS feed. This is a privacy guarantee, not a convenience — any new surface reading log entries goes through `src/lib/log.ts`, which applies the filter in one place.

### Project blurbs — `src/content/projects/*.md`

Optional hand-written descriptions for pinned repos, matched to API data by repo name. The API supplies the facts (stars, language, last push date); the blurb supplies the writing and an optional screenshot. A blurb with no matching repo is ignored rather than rendered.

---

## Build-time data

### GitHub repositories

Fetched once per build from the GitHub REST API (`/users/yderrick/repos`, sorted by push date). Nothing is fetched in the browser — the grid is static HTML by the time it reaches a visitor.

Filtered out: forks, archived repos, and any name in `HIDDEN_REPOS` in `src/lib/github.ts`.

**Failure behaviour.** Unauthenticated requests are rate-limited to 60/hour per IP, and the API can be unavailable. On any failure the build logs a warning and renders from `src/data/projects-fallback.json`, a committed snapshot. The build does not fail. A visitor sees a slightly stale grid rather than a broken deploy.

An optional `GITHUB_TOKEN` (via `astro:env`, `access: 'secret'`) raises the rate limit for repeated local builds. Everything works with it unset.

---

## Components *(fill in as built)*

| Component | Used on | What it does |
|---|---|---|
| | | |

---

## Utilities

| Module | What it does |
|---|---|
| `src/lib/log.ts` | Reads the log collection. The single place drafts are filtered — every page and feed calls this rather than `getCollection('log')` directly |
| `src/lib/github.ts` | Build-time repo fetch, filtering and fallback |

---

## Styling

`src/styles/tokens.css` holds every colour, font, spacing, radius and motion value as a CSS custom property. Components consume tokens; no component hardcodes a hex value or a font stack. A missing value means a new token, not a local exception.

Motion respects `prefers-reduced-motion` globally rather than per component.

---

## Known gaps

Things that are deliberately not built, or built partially, so they don't get rediscovered as bugs:

- **`/projects` will render an empty grid until a public repo exists.** As of 2026-09-05 the `yderrick` account owns three repositories and all three are private. The showcase reads `/users/yderrick/repos`, which returns public repos only, so an empty result is the correct and expected output — not a broken fetch. The empty state needs to say something sensible rather than render a bare grid.
