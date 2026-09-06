# Personal Site + Daily Dev Log

A static personal site built with Astro and deployed on Vercel. It does three things: introduces who I am and what I'm working on, keeps a timestamped daily log of what I build and learn, and shows an auto-updating gallery of my public GitHub projects.

Every push to `main` rebuilds and redeploys in under a minute. No CMS, no database, no server — content is Markdown in this repo, and project data is fetched from the GitHub API at build time.

**[docs/Site Information.md](docs/Site%20Information.md) is the complete reference** — every page, component, content field and data source, and what each one does. Start there if you want to know what the site does.

See [RUNBOOK.md](RUNBOOK.md) for how to run the thing — triggering a rebuild, adding a project, renewing the GitHub token. [CLAUDE.md](CLAUDE.md) covers architecture and working conventions, [task.md](task.md) the build roadmap, and [CHANGELOG.md](CHANGELOG.md) version history.

## Getting started

```bash
npm install
npm run dev       # http://localhost:4321
```

No configuration needed. The site builds with no environment variables set — the GitHub API is called unauthenticated, and if that fails or hits its rate limit the build falls back to a committed snapshot rather than erroring.

### The GitHub token

The projects page reads private repository metadata, so production needs a token. Create a `.env`
file with one that has **read access to your repositories**:

```
GITHUB_TOKEN=github_pat_...
```

The token is declared in `astro.config.mjs` via `astro:env` with `access: 'secret'`, so the build
refuses to bundle it into client-side code — and the site ships no JavaScript anyway, so nothing but
the resulting numbers reaches a visitor. Add the same variable in the Vercel project's environment
settings for production.

It stays optional: with it unset the build still succeeds, but it can only see public repositories, so
it falls back to the committed snapshot and labels the page accordingly.

## Commands

- `npm run dev` — start the Astro dev server
- `npm run build` — type-check and build to `dist/`
- `npm run preview` — serve the production build locally
- `npx astro sync` — regenerate content-collection types after a schema change

There is no deploy command. Pushing to `main` is the deploy.

## Writing a log entry

One Markdown file per entry, at `log/YYYY-MM-DD.md`:

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

`/projects` is built from a build-time call to the GitHub REST API. It shows commit cadence, release
counts and a daily activity heatmap, so the page answers "how often does this person actually ship?"
rather than just listing names.

Most of my work is in private repositories. Those still appear — with their language, commit rhythm,
release count and last-active date — but with a **Private** badge and no link. The API supplies the
facts; nothing about the code, its files or its commit messages is published.

Which repos appear is an allowlist, not a blocklist:

- Public repos are included automatically.
- A private repo appears only if its name is in `SHOWCASED_PRIVATE_REPOS` in `src/lib/github.ts`.
  Adding a future project is one string in that array.
- Forks, archived repos and anything in `HIDDEN_REPOS` are excluded either way.

Add a Markdown file in `src/content/projects/` for a hand-written blurb, merged over the API data by
repo name. For private repos this is the description — GitHub's own is empty.

If the API is unreachable, rate-limited, or the token is missing, the build logs a warning and renders
`src/data/projects-fallback.json` instead of failing, and the page says it is showing saved data.

### Keeping it current

Vercel only rebuilds when *this* repo is pushed, so commits elsewhere wouldn't show up.
`.github/workflows/refresh.yml` triggers a daily rebuild via a Vercel deploy hook. It needs a
`VERCEL_DEPLOY_HOOK` secret here, and `GITHUB_TOKEN` set in the Vercel project's environment
variables.

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
