# Opening prompts for Claude Code

> **Historical.** Moved here from the project root on 2026-09-05, when Phase 1 began. Kept as a record of the intended opening prompts; the placeholders below (`<url>`, `<other-repo>`) were never filled and the Phase 1 prompt still says Astro 6, which the build superseded. Do not treat this file as current guidance — `CLAUDE.md` and `task.md` are authoritative.

Scratch file for kicking off each phase — not part of the site. Delete it, or move it to `docs/`, once the build is underway.

Before the first session: put `CLAUDE.md`, `README.md`, `task.md`, `CHANGELOG.md` and `docs/Site Information.md` in the empty project folder, fill in the `<username>` / `<repo>` placeholders at the top of `CLAUDE.md`, then open the folder in VS Code and start Claude Code there. It reads `CLAUDE.md` automatically.

---

## Phase 1 — scaffold and get something live

> Read `CLAUDE.md` and `task.md` first. We're starting Phase 1 only — don't touch anything from Phase 2 onward.
>
> Scaffold a new Astro 6 project in this directory using the minimal template with TypeScript strict mode. Check the installed Astro version and confirm the content-collections API matches what `CLAUDE.md` describes before writing any collection code — I want `src/content.config.ts` and the `glob()` loader, not the legacy paths.
>
> Then: add `astro check` to the build script, write a `.gitignore` covering `dist/`, `.astro/`, `node_modules/`, `.env` and `.vercel`, and get a plain placeholder home page rendering locally with `npm run dev`.
>
> Stop there and tell me what you've done. I'll create the GitHub repo and connect Vercel myself, then come back to you to confirm the deploy.

After the repo exists and Vercel is connected:

> The repo is live at `<url>`. Set `site` in `astro.config.mjs` to it, push a trivial change, and confirm the auto-deploy lands. Then tick off the Phase 1 items in `task.md` and give me the phase report.

---

## Phase 2 — design system and shell

> Phase 2 from `task.md`. Read the design section of `CLAUDE.md` first.
>
> Start with `src/styles/tokens.css` — every colour, type scale step, spacing value, radius and motion duration as a CSS custom property. Dark-mode-first. Propose two or three accent-colour options with reasoning before you commit to one; I don't want the default purple-blue every AI-built site uses. Same for the type pairing: suggest a distinctive display face for headings and a clean sans for body, self-hosted, and tell me the tradeoffs.
>
> Wait for me to pick before you build the shell.

---

## Phase 3 — the log

> Phase 3 from `task.md`. Define the `log` collection, build the list and entry pages, and wire up tag filtering.
>
> The draft valve matters most here. Before you build anything else, write `src/lib/log.ts` as the single helper every surface uses, then make sure a `draft: true` entry is visible in `npm run dev` and absent from `npm run build && npm run preview` — check the list page, the tag pages, the entry route and the home page block. Show me that verification before we talk about styling.
>
> Use these three real entries as seed content rather than lorem ipsum: [paste three]

---

## Phase 4 — projects

> Phase 4 from `task.md`. Build `src/lib/github.ts` and the `/projects` grid.
>
> Do the failure path first: the build must never fail because the GitHub API was rate-limited or down. Fetch, catch everything, fall back to `src/data/projects-fallback.json`. Prove it by pointing the fetch at a bad URL and running a full build — it should warn and complete.
>
> Then the bento grid. Varied card sizes, not a uniform grid.

---

## Everyday prompts, once the site is live

**A log entry:**

> Add a log entry for today — I worked on X, fixed Y, learned Z. Draft it in my voice per `CLAUDE.md`, show it to me before committing.

**From commits:**

> Run `git log --author=<me> --since=midnight` in `~/code/<other-repo>` and draft today's log entry from what those commits actually accomplished — not a list of commit messages. Flag anything that looks like it shouldn't be public.

**A fix:**

> Symptom: [what you see]. Location: [rough guess at the file]. Desired fix: [what "fixed" looks like]. Reproduce it first, confirm it fails the way I described, then fix it.
