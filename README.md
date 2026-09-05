# Personal Site + Daily Dev Log

A static personal site built with Astro and deployed on Vercel. It does three things: introduces who I am and what I'm working on, keeps a timestamped daily log of what I build and learn, and shows an auto-updating gallery of my public GitHub projects.

Every push to `main` rebuilds and redeploys in under a minute. No CMS, no database, no server — content is Markdown in this repo, and project data is fetched from the GitHub API at build time.

**[docs/Site Information.md](docs/Site%20Information.md) is the complete reference** — every page, component, content field and data source, and what each one does. Start there if you want to know what the site does.

See [CLAUDE.md](CLAUDE.md) for architecture and working conventions, [task.md](task.md) for the build roadmap, and [CHANGELOG.md](CHANGELOG.md) for version history.

## Getting started

```bash
npm install
npm run dev       # http://localhost:4321
```

No configuration needed. The site builds with no environment variables set — the GitHub API is called unauthenticated, and if that fails or hits its rate limit the build falls back to a committed snapshot rather than erroring.

### Optional: a GitHub token

Unauthenticated GitHub API requests are limited to 60 per hour per IP, which is easy to burn through on repeated local builds. To raise the limit, create a `.env` file with a fine-grained token that has **public repository read access only**:

```
GITHUB_TOKEN=github_pat_...
```

The token is declared in `astro.config.mjs` via `astro:env` with `access: 'secret'`, so the build refuses to bundle it into client-side code. For production, add the same variable in the Vercel project's environment settings. It stays optional — the site builds fine without it.

## Commands

- `npm run dev` — start the Astro dev server
- `npm run build` — type-check and build to `dist/`
- `npm run preview` — serve the production build locally
- `npx astro sync` — regenerate content-collection types after a schema change

There is no deploy command. Pushing to `main` is the deploy.

## Writing a log entry

One Markdown file per entry, at `src/content/log/YYYY-MM-DD.md`:

```yaml
---
title: "Shipped the auth flow"
date: 2026-09-05
tags: [webdev, bugfix]
draft: false
---

Body goes here. Plain Markdown.
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Short, sentence case |
| `date` | yes | `YYYY-MM-DD`; drives sort order and the URL |
| `tags` | no | Lowercase, single words where possible; the tag filter is derived from these |
| `draft` | no | Defaults to `false` |

Two entries on the same day: `2026-09-05-2.md`.

**Drafts.** `draft: true` entries are visible in `npm run dev` and excluded from every production build — the log list, tag pages, the RSS feed and the home page. Write freely, publish when comfortable. Verify with `npm run build && npm run preview` if you're unsure.

Then `git add`, commit, `git push` — live in about a minute. Content commits don't get a version bump or a changelog entry; only code and design changes do.

## Projects showcase

`/projects` is built from a build-time call to the GitHub REST API, sorted by last push. Each card shows the repo name, description, primary language, stars and last-push date. Push a new public repo and it appears on the next deploy — no manual step.

Forks, archived repos and anything listed in `HIDDEN_REPOS` in `src/lib/github.ts` are filtered out. For pinned favourites, add a Markdown file in `src/content/projects/` with a hand-written blurb and a screenshot; it's merged over the API data by repo name, so the facts stay automatic and the writing stays mine.

If the API is unreachable at build time, the build uses `src/data/projects-fallback.json` and logs a warning instead of failing.

## Deploying

The repo is connected to a Vercel project. Pushes to `main` deploy to production; pull requests get their own preview URLs. Build settings are Vercel's Astro defaults (`npm run build`, output `dist/`).

To add a custom domain later, point it at the Vercel project in the dashboard — nothing in the repo needs to change except the `site` value in `astro.config.mjs`, which the RSS feed and canonical URLs read from.

## Structure

```
src/
  content/
    log/            one .md per daily entry
    projects/       hand-written blurbs for pinned repos
  content.config.ts collection schemas (Astro 7 — note: not src/content/config.ts)
  components/
  layouts/
  lib/
    log.ts          the one place drafts are filtered
    github.ts       build-time repo fetch + fallback
  pages/
  styles/
    tokens.css      every colour, font and spacing value
  data/
    projects-fallback.json
docs/
  Site Information.md
```
