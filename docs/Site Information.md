# Site Information

The complete behavioural reference for this site: every page, component, content field, build-time data source and utility, and what each one does.

**How to maintain this file.** It is updated in the *same commit* as the change it describes, never as a follow-up. If a change adds or alters a page, a component's visible behaviour, a content field, or a data source, it belongs here. Sections marked *(not built yet)* are filled in as the phases in [task.md](../task.md) land — a section describing something that doesn't exist yet is worse than no section, so keep the marker until the thing is real.

Describe what something *does*, from the outside. Architecture and conventions live in [CLAUDE.md](../CLAUDE.md); this file is what the site does.

---

## Deployment

Live at **https://personal-site-phi-seven-43.vercel.app**, built from `main` at `yderrick/personal-site`. Every push to `main` rebuilds and redeploys; pull requests get their own preview URLs. The production URL is set as `site` in `astro.config.mjs` — RSS and canonical URLs read it, so pointing a custom domain here later means changing that one value.

---

## Pages

### `/` — Home
Tagline and intro, then two slots: recent log entries and pinned projects. Both slots are currently
placeholders that say which phase builds them and why they're empty — the log collection lands in
Phase 3 and the projects fetch in Phase 4. The slot markup is replaced, not added to, when those land.

### `/log` — Daily log
Reverse-chronological list of all published entries, each showing its date, title, opening line and
tags. Above the list is a tag bar listing every tag in use with a count; the tags are derived from
the entries, so there is no second list to maintain. Drafts never appear.

### `/log/[slug]` — Entry
One log entry: date, title, tags, rendered body, and links to the adjacent entries. The links are
labelled **Older** and **Newer** rather than previous/next, because "previous" is ambiguous in a
reverse-chronological list. Slug derives from the filename, so `2026-09-05.md` → `/log/2026-09-05`.

### `/log/tags/[tag]` — Tag
Entries carrying one tag, newest first, with a count and a link back to the full log. A page exists
for every tag used by a published entry; a tag used only by drafts generates no page.

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

*Verified 2026-09-05* by adding a `draft: true` entry with unique marker strings, then checking that
those strings appear on the list, entry, tag and home surfaces under `npm run dev`, and appear
nowhere in `dist/` after `npm run build` — with no entry route and no tag page generated for it.
Re-run that check whenever a new surface starts reading the collection.

**Ordering.** Entries sort by date, newest first, tie-broken by descending filename. Two entries
share a date whenever a day has more than one, so without the tie-break their relative order would
depend on whatever sequence the loader happened to return. The tie-break also puts `-2` above the
plain file, which matches what the suffix means: the second entry written that day.

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
| `src/layouts/BaseLayout.astro` | Every page | Document head (title, description, canonical, Open Graph), self-hosted font imports, skip link, nav, footer. Takes optional `title` and `description` props; `title` is suffixed with the site name |
| `src/components/LogList.astro` | `/`, `/log`, `/log/tags/[tag]` | Renders a list of log entries: date, title, opening line, tags. Takes `entries` and an optional `summaries` flag. Shows a "Draft" badge on draft entries, which is only ever reachable in dev |
| `src/components/Nav.astro` | Every page, via `BaseLayout` | Site nav. Marks the current route with `aria-current="page"`. Routes flagged `ready: false` render as plain dotted-underlined text rather than links, so nothing 404s while the site is being built |

---

## Utilities

| Module | What it does |
|---|---|
| `src/consts.ts` | Site title, tagline, description, and the nav route list. The route list is defined here only — the nav reads it rather than hardcoding links |
| `src/lib/log.ts` | Reads the log collection. The single place drafts are filtered — every page and feed calls this rather than `getCollection('log')` directly. Also owns entry sorting, tag counting, adjacent-entry lookup, UTC date formatting and list excerpts |
| `src/lib/github.ts` | Build-time repo fetch, filtering and fallback |

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

- **`/projects` will render an empty grid until a public repo exists.** As of 2026-09-05 the `yderrick` account owns three repositories and all three are private. The showcase reads `/users/yderrick/repos`, which returns public repos only, so an empty result is the correct and expected output — not a broken fetch. The empty state needs to say something sensible rather than render a bare grid.
