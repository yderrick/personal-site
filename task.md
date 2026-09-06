# Project Task Roadmap: Personal Site + Daily Dev Log

> Feature/task status lives here. Released version history (what actually shipped, tagged) lives in [CHANGELOG.md](CHANGELOG.md).
>
> Phases run in order. Nothing is designed before something is live. Two Release Gates: after Phase 3 and after Phase 5 — at each, the full release steps in [CLAUDE.md](CLAUDE.md) run and the live URL is verified before the next phase starts.

- [x] **Phase 1: Scaffold & First Deploy** *(goal: a blank page live at a public URL)*
  - [x] **Module 1: Project skeleton**
    - [x] `npm create astro@latest` — minimal template, TypeScript strict, Astro 7.
    - [x] Confirm `src/content.config.ts` (not the legacy `src/content/config.ts` path) and the `glob()` loader API.
    - [x] Add `astro check` to the build script so type errors fail the build.
    - [x] `.gitignore` covering `dist/`, `.astro/`, `node_modules/`, `.env`, `.vercel`.
  - [x] **Module 2: Repo & hosting**
    - [x] Initialise git, first commit, push to GitHub as `yderrick/personal-site`.
    - [x] Connect the repo to a Vercel project; accept the Astro build defaults.
    - [x] Confirm the placeholder page is live at `personal-site-phi-seven-43.vercel.app`.
    - [x] Push a trivial change and confirm auto-redeploy lands in under a minute.
    - [x] Set `site` in `astro.config.mjs` to the live URL (RSS and canonical URLs read it).

- [x] **Phase 2: Design System & Shell**
  - [x] **Module 3: Tokens**
    - [x] `src/styles/tokens.css` — colour, type scale, spacing, radius, motion duration as CSS custom properties.
    - [x] Pick the accent colour deliberately; not default purple/blue.
    - [x] Self-host the display + body faces (`@fontsource` or local `woff2`); no render-blocking CDN.
    - [x] `prefers-reduced-motion` handling at the token/global level, once, not per component.
  - [x] **Module 4: Layout shell**
    - [x] `BaseLayout.astro` — head, skip link, nav, footer. `<ClientRouter />` deliberately **not** added: it ships JS, and the zero-JS-by-default rule means it has to earn itself. Revisit if navigation ever feels janky.
    - [x] Nav component with the active-route state; single source for the route list.
    - [x] Landing page: intro, tagline, placeholder slots for pinned projects and recent entries.
    - [x] Phone-viewport pass on the shell before committing.

- [x] **Phase 3: Daily Log** *(→ **Release Gate 1** after this phase)*
  - [x] **Module 5: Collection**
    - [x] Define the `log` collection in `src/content.config.ts`: `glob()` loader + zod schema (`title`, `date`, `tags`, `draft`).
    - [x] `src/lib/log.ts` — the single helper every surface uses to read entries; filters drafts in production, keeps them in dev.
    - [x] Seed three real entries so layout decisions are made against real text, not lorem ipsum.
  - [x] **Module 6: Pages**
    - [x] `/log` — reverse-chronological list, changelog/terminal styling, monospace dates.
    - [x] Tag filtering, with the tag set derived from entries rather than hand-maintained.
    - [x] `/log/[slug]` — entry page via `getStaticPaths()` + `render(entry)`; prev/next links.
    - [x] Home page shows the three most recent non-draft entries.
    - [x] **Verify the draft valve**: a `draft: true` entry appears in `npm run dev` and appears nowhere in `npm run build && npm run preview` — list, tag pages, entry route, home page.
  - [x] **Release Gate 1** — version bump, changelog, docs sync, tag, push; verify the log live on a phone and a desktop. Shipped as `v0.1.0`.

- [ ] **Phase 4: Projects & Activity** *(revised 2026-09-05 — see note)*

  > **Why this changed.** The site's job is to show an employer what I actually do day to day and how
  > often I ship. Three of four repos are private, so a showcase limited to public repos would show an
  > empty page and imply I don't work. A build-time authenticated fetch can read cadence and metadata
  > for private repos without exposing the code — visitors get the evidence, not the access.
  >
  > **Disclosure rule.** Public repos are included automatically. Private repos appear only if listed
  > explicitly in `SHOWCASED_PRIVATE_REPOS`, and show name, description, language, commit cadence,
  > last-active date and release tags — never commit messages, file names or a link. Adding a future
  > project is one string in that array.

  - [x] **Module 7: GitHub fetch**
    - [x] `src/lib/github.ts` — build-time fetch of owned repos, sorted by push date.
    - [x] Public repos auto-included; private repos require an explicit `SHOWCASED_PRIVATE_REPOS` entry.
    - [x] Filter forks, archived repos, and a `HIDDEN_REPOS` list.
    - [x] Per-repo activity via `/stats/participation` (52 weekly commit counts) **and
          `/stats/commit_activity`** (day-level counts — weekly buckets made a young repo's dense
          month look like an idle year). Handles the async 202-then-retry on a cold cache.
    - [x] Release cadence via `/tags`; latest tag and count.
    - [x] Optional `GITHUB_TOKEN` through `astro:env` with `access: 'secret'`; build succeeds with it
          unset. A partial result (token missing, so private repos absent) is treated as a failure
          rather than published as if current.
    - [x] Fallback to `src/data/projects-fallback.json` on any fetch failure or rate limit — warn, never fail the build.
    - [x] Test the failure path deliberately (bad URL / offline) and confirm the build still completes.
    - [x] Confirm no token, repo URL or commit message for a private repo reaches `dist/`.
  - [x] **Module 8: Grid**
    - [x] Bento layout with varied card sizes, not a uniform grid.
    - [x] Public card: name, description, language, stars, last push, link.
    - [x] Private card: same minus the link, plus a "Private" badge and commit cadence.
    - [x] Activity view: daily commit heatmap over 18 weeks, plus totals, active days and longest run.
    - [x] `src/content/projects/*.md` blurbs merged over API data by repo name.
    - [x] Home page pinned-projects block reads the same data.
  - [ ] **Module 9: Freshness** *(new — the site makes a claim about recent activity, so stale data misleads)*
    - [x] Vercel deploy hook + a scheduled GitHub Action in this repo that fires it daily.
          *(Workflow committed; the deploy hook and secret still need creating — see the report.)*
    - [x] Show the data's as-of date on the page, so a failed refresh is visible rather than silent.

- [ ] **Phase 5: About & Polish** *(→ **Release Gate 2** after this phase)*
  - [ ] **Module 10: About**
    - [ ] `/about` — short bio, links out.
  - [ ] **Module 11: Polish pass**
    - [ ] Favicon set and `og:image`.
    - [ ] Meta tags: title/description per page, canonical URLs, Open Graph, `sitemap.xml`.
    - [ ] Full responsive sweep at 360px / 768px / 1440px.
    - [ ] Accessibility pass: heading order, focus visibility, colour contrast, alt text, keyboard-only navigation.
    - [ ] Lighthouse run; check no unintended JavaScript is shipping (every `client:*` directive justified).
    - [ ] 404 page.
  - [ ] **Release Gate 2** — version bump, changelog, docs sync, tag, push; verify live.

- [ ] **Phase 6: Optional Extras** *(nothing here blocks anything; pick up when wanted)*
  - [ ] RSS feed for the log at `/rss.xml` — drafts excluded, via the same `src/lib/log.ts` helper.
  - [ ] `/now` page — what I'm currently focused on.
  - [ ] Analytics (Vercel Analytics or Plausible free tier).
  - [ ] Custom domain — point DNS at Vercel, update `site` in `astro.config.mjs`.
  - [ ] Log-entry drafting from `git log --author=crystaladdison17@gmail.com --since=midnight` across other repos.
  - [ ] Search across log entries (client-side index; only if the log gets big enough to need it).
