# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal site + daily dev log — a static Astro site that does three jobs: a home base (who I am, what I'm working on), a timestamped daily log of what I built/learned/shipped, and an auto-updating showcase of my public GitHub repos. Deployed on Vercel's free tier; every push to `main` rebuilds and goes live in under a minute.

`docs/Site Information.md` is the behavioural reference — every page, component, content field and build-time data source, and what each one does. Read it when you need to know what something *is*; this file covers how to work on it.

- GitHub username: `yderrick`
- Repo: `yderrick/personal-site`
- Live URL: `personal-site.vercel.app`

## Commands

- `npm run dev` — Astro dev server (localhost:4321)
- `npm run build` — type-check (`astro check`) then build to `dist/`
- `npm run preview` — serve the production build locally
- `npx astro sync` — regenerate content-collection types after a schema change

There is no deploy command. **Deploy = `git push origin main`.** Vercel builds from the repo. Never run a manual deploy CLI; if a deploy is wrong, fix it in the repo and push again.

## Astro version — read this before writing any Astro code

This project targets **Astro 7**. Several APIs that models reach for by default were removed in Astro 5/6 and do not exist here:

- Content config lives at **`src/content.config.ts`** (not `src/content/config.ts`).
- Collections use **`loader: glob({ pattern, base })`** from `astro/loaders` — not `type: 'content'` / `type: 'data'`.
- **`Astro.glob()`, `getEntryBySlug()`, `entry.render()`, `entry.slug` are gone.** Use `getCollection()`, `getEntry()`, `entry.id`, and `import { render } from 'astro:content'` → `const { Content } = await render(entry)`.
- Zod comes from **`astro/zod`**, not a direct `zod` import.
- View transitions are **`<ClientRouter />`**, not `<ViewTransitions />`.
- `output: 'hybrid'` was removed — this site is `output: 'static'`.
- Env vars go through **`astro:env`** (`envField` in `astro.config.mjs`); anything secret uses `access: 'secret'` so the build refuses to expose it.

Changed in Astro 7 specifically — these bite even if your Astro 6 memory is good:

- **The compiler is Rust-based and stricter about invalid HTML.** Unclosed non-void tags are now errors, and semantically invalid markup is no longer silently auto-corrected — it passes through as written. Close every tag.
- **Markdown renders through [Sätteri](https://satteri.bruits.org/), not remark/rehype.** `@astrojs/markdown-remark` is not installed. Don't reach for a remark or rehype plugin without checking what Sätteri does natively first.
- **`compressHTML` defaults to `'jsx'`**, not `true` — whitespace is stripped using JSX rules.
- `@astrojs/db` was removed entirely. Not used here, but don't suggest it.
- Node **v22.12+** is required; odd-numbered Node majors are unsupported.

**Styling is vanilla CSS + tokens** — see the design system section. Tailwind is not installed and adding it is a deliberate decision, not a default. If it ever is added, Tailwind 4 ships as `@tailwindcss/vite` and goes in `vite.plugins`, never in `integrations` via `@astrojs/tailwind`.

If a snippet you're about to write uses one of the removed APIs, that's the signal your memory of Astro is pre-7. Check `docs/` or the installed version's types instead of guessing.

## Architecture

### Zero-JS by default (critical pattern)

Astro ships no JavaScript unless a component asks for it. Every `client:*` directive is a deliberate decision that has to earn itself, not a reflex. Before adding one, ask whether CSS or a `<details>` element does the job. If an island is genuinely needed, prefer `client:visible` over `client:load`, and note in the PR/commit message why it exists.

### Content collections

The daily log is a content collection: one Markdown file per entry at `src/content/log/YYYY-MM-DD.md`, loaded by `glob()` and validated by a zod schema in `src/content.config.ts`. Frontmatter shape:

```yaml
---
title: "Shipped the auth flow"
date: 2026-09-05
tags: [webdev, bugfix]
draft: false
---
```

**The draft valve is a privacy feature, not a convenience.** `draft: true` entries must be excluded from every production build path — the list page, the tag index, the RSS feed, `getStaticPaths()` for `/log/[slug]`, and the home page's recent-entries block. They stay visible in `npm run dev` so I can write freely. Any new surface that reads the log collection filters drafts in the same commit it's added; there is one shared helper for this (`src/lib/log.ts`), and new code routes through it rather than calling `getCollection('log')` raw.

Two entries on one day get `YYYY-MM-DD-2.md`. Tags are lowercase, single-word where possible; the tag list is derived from the entries, never hand-maintained in a second place.

### Projects showcase (build-time GitHub fetch)

`src/lib/github.ts` calls the GitHub REST API at build time (`/users/yderrick/repos`, sorted by push date) and returns the cards rendered on `/projects`. Rules for this module:

- **The build must never fail because GitHub did.** Unauthenticated requests are rate-limited (60/hr/IP) and the API can just be down. Wrap the fetch, catch everything, and fall back to a committed `src/data/projects-fallback.json` snapshot so the site still builds.
- A local `GITHUB_TOKEN` (via `astro:env`, `access: 'secret'`) raises the rate limit during repeated dev builds. It's optional — the site must build with it unset.
- Filter out forks, archived repos, and anything on the `HIDDEN_REPOS` list in that module.
- Hand-written blurbs for pinned projects live in `src/content/projects/*.md` and are merged over the API data by repo name. The API supplies facts (stars, language, last push); the markdown supplies voice.

### Routes

`/` landing · `/log` full list, filterable by tag · `/log/[slug]` entry · `/projects` bento grid · `/about` · `/rss.xml`. Adding a route means adding it to the nav component and to `docs/Site Information.md` in the same commit.

## Design system

Design tokens — colours, type scale, spacing, radii — live in **one place** (`src/styles/tokens.css`) and are consumed as CSS custom properties. Never hardcode a hex value or a font stack in a component; if a value is missing, add a token.

Direction, so this doesn't read as a template:
- Dark-mode-first, **one** accent colour, and not the default AI-purple/blue.
- One distinctive display face for headings, a clean sans for body. Self-host or use `@fontsource` — no render-blocking font CDN.
- Motion is subtle (fade/slide on scroll) and always respects `prefers-reduced-motion`.
- `/projects` is a **bento layout** — varied card sizes, not a uniform grid.
- Log entries carry a changelog/terminal aesthetic; monospace for dates and tags.

Responsiveness is not a later phase: every new page or component is checked at a phone viewport in `npm run preview` before it's committed. "Works on desktop" is half-done.

## Version control & release workflow

Single `main` branch, pushed to `yderrick/personal-site`. Vercel deploys `main`; pull requests get preview URLs.

**Standing authorization** — for changes to the *site itself* (layout, components, styles, build logic), without asking each time:
1. Bump `package.json` `"version"` — patch for fixes/tweaks, minor for a new page or feature, major for a redesign.
2. Add a `CHANGELOG.md` entry under a new `## [X.Y.Z] - YYYY-MM-DD` heading.
3. Update `docs/Site Information.md` if the change touched a page, component, content field or data source — **same commit**, never a follow-up.
4. `git add`, commit with a clear message.
5. `git tag -a vX.Y.Z -m "..."`.
6. `git push origin main && git push origin vX.Y.Z`.

**Content is not a release.** Adding or editing a log entry is a plain commit and push — no version bump, no changelog entry, no tag. Only code and design changes go through the steps above.

Keep `README.md`, `task.md` and `docs/Site Information.md` in sync when a change affects what they describe — don't let them drift from reality.

This covers routine commit/tag/push only. Still confirm before anything destructive (force-push, `git reset --hard`, rewriting published history, deleting tags/branches, changing Vercel project settings or domains).

## Phased build

The build runs in phases (see `task.md` for the full checklist). While a phase is in progress the per-task standing authorization is suspended:
- Each completed step gets a normal commit — no version bump, no tag.
- Each completed **phase** ends with a commit and a short written report of what landed and how it was verified.
- **Release Gate** after Phase 3 and after Phase 5: full release steps run, and I verify the live URL before the next phase starts.

Phase 1 is done when a blank page is live at a public URL. Get something deployed before anything is designed.

## Daily log workflow

The normal ask is: *"Add a log entry for today — I worked on X, fixed Y, learned Z."* Then:
1. Create `src/content/log/<today>.md` with valid frontmatter and `draft: false` unless I say otherwise.
2. Write it in my voice — first person, plain, past tense, no marketing register, no "excited to share".
3. Show me the draft; I tweak, then push.

I may instead ask you to read `git log --author=crystaladdison17@gmail.com --since=midnight` across my other repos and draft the summary from the commits. In that case: summarise what the commits *accomplished*, not the commit messages themselves, and flag anything that looks like it shouldn't be public before including it.

# Working with Claude on this project

## Model selection

- **Sonnet (default)** — most work: components, content collections, routing, styling, debugging.
- **Opus** — the hardest problems: design-system decisions, build-time data flow, bugs Sonnet can't crack.
- **Haiku** — grunt work: changelog edits, doc sync, mechanical renames, drafting log entries from a summary I've already given.

## Task scoping

- Name the file, the scenario, and how to verify the result. Not "fix the projects page."
- Point at an existing component/pattern in the repo instead of describing a convention in prose.
- Break large tasks up and review incrementally.
- Feedback should be "make X more like Y", not "make it better."

## Bug reports — always three things

1. **Symptom** — what's observably wrong, not a diagnosis.
2. **Location** — the file or function it probably lives in, even a rough guess.
3. **Desired fix** — what "fixed" looks like behaviourally.

> Example: "Symptom: `/log` shows draft entries on the live site but not locally. Location: probably the filter in `src/pages/log/index.astro` or `src/lib/log.ts`. Desired fix: drafts never appear in a production build. Reproduce with a `draft: true` entry and `npm run build && npm run preview` first, confirm it shows, then fix."

## Context and token efficiency

- Don't dump the repo into context — point at the relevant files.
- Fresh session between unrelated tasks.
- Keep this file under ~200 lines; it loads every session.
