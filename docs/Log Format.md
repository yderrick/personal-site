# The log format — a contract between repositories

**Status: frozen. The aggregator that consumes it is not built yet.**

Every repository I work in keeps a daily log in a root-level `log/` folder. This site aggregates
those logs into one timeline at `/log`. That only works if every repo writes the same shape, so this
file is the contract: write a log folder that matches it and the site can publish it without any
per-repo special-casing.

This site's own log (`log/` in `yderrick/personal-site`) is the reference implementation — it obeys
this contract like any other repo.

---

## 1. Location and file names

```
<repo root>/
  log/
    2026-09-06.md
    2026-09-06-2.md      ← a second entry on the same day
    _scratch.md          ← ignored: leading underscore
```

- The folder is `log/`, at the repository root. Not `logs/`, not `docs/log/`, not under `src/`.
- One Markdown file per entry, named `YYYY-MM-DD.md` — the same date as the `date` frontmatter field.
- A second entry on the same day is `YYYY-MM-DD-2.md`, then `-3`, and so on.
- A file whose name starts with `_` is ignored entirely. Use it for notes that are not entries.
- Subdirectories are not read. Keep the folder flat.

## 2. Frontmatter

```yaml
---
title: "Shipped the auth flow"
date: 2026-09-06
tags: [webdev, bugfix]
draft: false
backfilled: false
---
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | **yes** | One line. Shown on the list, the entry page and the browser title |
| `date` | `YYYY-MM-DD` | **yes** | Must match the filename. Drives sort order and the URL |
| `tags` | string[] | no, defaults `[]` | Lowercase, single word where possible. The tag index is derived from these — there is no second list to maintain |
| `draft` | boolean | no, defaults `false` | `true` means the entry is never published. See §4 |
| `backfilled` | boolean | no, defaults `false` | `true` means the entry was written after the fact from commit history rather than on the day. The site says so on the page |

**Unknown fields are ignored, not rejected.** A repo may carry extra frontmatter for its own tooling
— `ticket`, `hours`, whatever — and the site will strip it. This is deliberate: it means a repo can
evolve its own log tooling without waiting on this contract to change.

**`repo` is not a field.** Which repository an entry came from is supplied by the aggregator, which
knows because it fetched it. Writing it by hand would create a second source of truth that can
disagree with the first.

## 3. Body

Standard Markdown. Headings, lists, code blocks, links and emphasis all render.

Two constraints that come from the entry being published somewhere other than where it was written:

- **No repo-relative links or images.** `![](./screenshot.png)` and `[the config](../src/config.ts)`
  resolve against the *site*, not the source repo, so they 404 once published. Use an absolute URL,
  or leave it out.
- **The first paragraph is the excerpt.** List views take a ~160-character summary from the opening
  paragraph, so open with a sentence that reads sensibly on its own rather than with a heading or a
  bare link.

## 4. What gets published — read this one carefully

Two independent gates, both of which must be open:

**Gate 1 — the repository is allowlisted.** A repo's log is fetched only if its name appears in the
aggregator's allowlist on this site. This mirrors `SHOWCASED_PRIVATE_REPOS` in `src/lib/github.ts`
and exists for the same reason: the failure mode of forgetting to edit an array must be *"my log is
missing from the site"*, never *"my private working notes are on the internet"*.

Consequence: **a new repo publishes nothing until you deliberately add it.** Creating `log/` in a
repo is safe by default.

**Gate 2 — the entry is not a draft.** `draft: true` is never published, from any repo.

Note the difference from this repo: here, a draft stays visible under `npm run dev` so it can be
previewed. There is no dev preview of another repo's log, so in a source repo `draft: true` means
simply *not published, anywhere*.

**What the log folder is not.** A `log/` folder in a private repo is prose you wrote for yourself,
and the allowlist is the only thing standing between it and the public. Unlike the projects
showcase — which publishes commit counts and cadence, and deliberately never a commit message —
there is no partial disclosure here. An allowlisted repo publishes its non-draft entries in full.
Allowlist a repo only when you are content for every non-draft entry in it, past and future, to be
read by a stranger.

## 5. URLs

- This site's own entries keep their existing bare paths: `/log/2026-09-06`. They are already live,
  linked and in the RSS feed, and breaking them to gain symmetry is a bad trade.
- Entries from any other repo are namespaced by repo: `/log/daylog/2026-09-06`.

This also settles collisions — two repos logging on the same day are different URLs.

## 6. How the aggregator handles a bad entry

The failure granularity is deliberately different at the two levels:

- **A single malformed entry** — missing `title`, unparseable `date`, invalid YAML — is **skipped,
  with a warning in the build log**, and the build continues. One bad file in another repository must
  not be able to break this site's deploy.
- **A whole repository failing to fetch** — network error, revoked token, renamed repo — is **a build
  failure that falls back to the committed snapshot** and marks the page stale, exactly as
  `src/lib/github.ts` does for projects. Silently dropping an entire repo's worth of entries while
  the page claims to be current is the failure this rule exists to prevent.

Both are visible. Neither is silent.

## 7. Starting a new repo

Create the folder, copy the template, and write. Nothing is published until the repo is allowlisted
on this site (§4).

```bash
mkdir -p log
cat > log/$(date +%F).md <<'EOF'
---
title: ""
date: 2026-09-06
tags: []
draft: true
---

EOF
```

Template for an entry:

```markdown
---
title: "What I did, in one line"
date: 2026-09-06
tags: [tag, tag]
draft: false
---

An opening paragraph that reads on its own, because list views use it as the summary.

Then the detail — what broke, what it turned out to be, what I'd do differently.
```
