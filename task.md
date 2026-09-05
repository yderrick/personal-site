# Project Task Roadmap: Personal Site + Daily Dev Log

> Feature/task status lives here. Released version history (what actually shipped, tagged) lives in [CHANGELOG.md](CHANGELOG.md).
>
> Phases run in order. Nothing is designed before something is live. Two Release Gates: after Phase 3 and after Phase 5 — at each, the full release steps in [CLAUDE.md](CLAUDE.md) run and the live URL is verified before the next phase starts.

- [ ] **Phase 1: Scaffold & First Deploy** *(goal: a blank page live at a public URL)*
  - [ ] **Module 1: Project skeleton**
    - [ ] `npm create astro@latest` — minimal template, TypeScript strict, Astro 7.
    - [ ] Confirm `src/content.config.ts` (not the legacy `src/content/config.ts` path) and the `glob()` loader API.
    - [ ] Add `astro check` to the build script so type errors fail the build.
    - [ ] `.gitignore` covering `dist/`, `.astro/`, `node_modules/`, `.env`, `.vercel`.
  - [ ] **Module 2: Repo & hosting**
    - [ ] Initialise git, first commit, push to GitHub as `yderrick/personal-site`.
    - [ ] Connect the repo to a Vercel project; accept the Astro build defaults.
    - [ ] Confirm the placeholder page is live at `personal-site.vercel.app`.
    - [ ] Push a trivial change and confirm auto-redeploy lands in under a minute.
    - [ ] Set `site` in `astro.config.mjs` to the live URL (RSS and canonical URLs read it).

- [ ] **Phase 2: Design System & Shell**
  - [ ] **Module 3: Tokens**
    - [ ] `src/styles/tokens.css` — colour, type scale, spacing, radius, motion duration as CSS custom properties.
    - [ ] Pick the accent colour deliberately; not default purple/blue.
    - [ ] Self-host the display + body faces (`@fontsource` or local `woff2`); no render-blocking CDN.
    - [ ] `prefers-reduced-motion` handling at the token/global level, once, not per component.
  - [ ] **Module 4: Layout shell**
    - [ ] `BaseLayout.astro` — head, skip link, nav, footer, `<ClientRouter />` if view transitions are wanted.
    - [ ] Nav component with the active-route state; single source for the route list.
    - [ ] Landing page: intro, tagline, placeholder slots for pinned projects and recent entries.
    - [ ] Phone-viewport pass on the shell before committing.

- [ ] **Phase 3: Daily Log** *(→ **Release Gate 1** after this phase)*
  - [ ] **Module 5: Collection**
    - [ ] Define the `log` collection in `src/content.config.ts`: `glob()` loader + zod schema (`title`, `date`, `tags`, `draft`).
    - [ ] `src/lib/log.ts` — the single helper every surface uses to read entries; filters drafts in production, keeps them in dev.
    - [ ] Seed three real entries so layout decisions are made against real text, not lorem ipsum.
  - [ ] **Module 6: Pages**
    - [ ] `/log` — reverse-chronological list, changelog/terminal styling, monospace dates.
    - [ ] Tag filtering, with the tag set derived from entries rather than hand-maintained.
    - [ ] `/log/[slug]` — entry page via `getStaticPaths()` + `render(entry)`; prev/next links.
    - [ ] Home page shows the three most recent non-draft entries.
    - [ ] **Verify the draft valve**: a `draft: true` entry appears in `npm run dev` and appears nowhere in `npm run build && npm run preview` — list, tag pages, entry route, home page.
  - [ ] **Release Gate 1** — version bump, changelog, docs sync, tag, push; verify the log live on a phone and a desktop.

- [ ] **Phase 4: Projects Showcase**
  - [ ] **Module 7: GitHub fetch**
    - [ ] `src/lib/github.ts` — build-time fetch of `/users/yderrick/repos`, sorted by push date.
    - [ ] Filter forks, archived repos, and a `HIDDEN_REPOS` list.
    - [ ] Optional `GITHUB_TOKEN` through `astro:env` with `access: 'secret'`; build must succeed with it unset.
    - [ ] Fallback to `src/data/projects-fallback.json` on any fetch failure or rate limit — warn, never fail the build.
    - [ ] Test the failure path deliberately (bad URL / offline) and confirm the build still completes.
  - [ ] **Module 8: Grid**
    - [ ] Bento layout with varied card sizes, not a uniform grid.
    - [ ] Card: name, description, language, stars, last push, link.
    - [ ] `src/content/projects/*.md` blurbs merged over API data by repo name for 2–3 pinned favourites, with screenshots.
    - [ ] Home page pinned-projects block reads the same data.

- [ ] **Phase 5: About & Polish** *(→ **Release Gate 2** after this phase)*
  - [ ] **Module 9: About**
    - [ ] `/about` — short bio, links out.
  - [ ] **Module 10: Polish pass**
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
