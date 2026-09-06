# Runbook

The things I do to this site that aren't writing code. Step by step, so I don't have to remember
them or work them out again in six months.

> **This file is kept current by Claude.** When something changes that I need to remember — a new
> step, a gotcha, a credential that expires — it gets added here rather than only being said once in
> a chat. If a step below doesn't match what you see on screen, the site changed and this didn't;
> say so and it gets fixed.

**Live site:** https://personal-site-phi-seven-43.vercel.app
**Repo:** https://github.com/yderrick/personal-site

---

## Contents

1. [Trigger a rebuild by hand](#1-trigger-a-rebuild-by-hand)
2. [Add a new project to the site](#2-add-a-new-project-to-the-site)
3. [Update the About page](#3-update-the-about-page)
4. [Write a log entry](#4-write-a-log-entry)
5. [Renew the GitHub token](#5-renew-the-github-token)
6. [When something looks wrong](#6-when-something-looks-wrong)
7. [Things to remember](#7-things-to-remember)
8. [Waiting on you](#8-waiting-on-you)

---

## 1. Trigger a rebuild by hand

**When you need this:** you pushed work to another repo and want the activity numbers on `/projects`
to update now rather than waiting for tomorrow's automatic run.

The site rebuilds on its own **daily at 06:15 UTC**, and whenever you push to this repo. Everything
below is only for when you don't want to wait.

### Steps

1. Go to **https://github.com/yderrick/personal-site/actions**
2. In the left sidebar, click **Daily refresh**.
3. On the right, click the **Run workflow** button.
4. Leave the branch as **main** and click the green **Run workflow**.
5. Refresh the page after a few seconds — a new run appears at the top.
6. Wait for the green tick (about 10 seconds). It calls Vercel; Vercel then builds, which takes
   roughly another 30 seconds.
7. Check https://personal-site-phi-seven-43.vercel.app/projects/ — the bottom line should show
   today's date.

### If the run fails

A red ✗ means the deploy hook was rejected or is missing. Click into the run to see the error. The
usual cause is the hook having been deleted in Vercel — see
[Rotate the deploy hook](#rotate-the-deploy-hook).

---

## 2. Add a new project to the site

Which steps you need depends on whether the repo is public or private.

### If the repo is PUBLIC

**Nothing to do.** Public repos are picked up automatically on the next build. Wait for the daily
refresh, or [trigger one by hand](#1-trigger-a-rebuild-by-hand).

Optionally, give it a blurb — see [Add a blurb](#add-a-blurb-optional-but-recommended) below.

### If the repo is PRIVATE

Private repos are an **allowlist**. Nothing private appears unless you explicitly add it, which is
deliberate: if you forget a step, a project goes missing rather than something private going public.

There are **two** places to update, and missing either one means the project won't show.

#### Step 1 — Add it to the allowlist in the code

Open [`src/lib/github.ts`](src/lib/github.ts) and find this line near the top (around line 20):

```ts
const SHOWCASED_PRIVATE_REPOS: readonly string[] = ['worldbuilder-engine', 'daylog'];
```

Add the repo name exactly as it appears on GitHub:

```ts
const SHOWCASED_PRIVATE_REPOS: readonly string[] = ['worldbuilder-engine', 'daylog', 'new-project'];
```

#### Step 2 — Give the token access to that repo

**This step only applies to a fine-grained token** (one starting `github_pat_`), which is limited to
the repos you picked when you created it. A new repo is not automatically included.

If you created a **classic** token with the `repo` scope (starting `ghp_`), skip this step — classic
tokens cover every repo you own, including new ones.

Not sure which you have? Check https://github.com/settings/tokens — classic tokens are listed under
*Tokens (classic)*, fine-grained ones under *Fine-grained tokens*.

To update a fine-grained token:

1. Go to **https://github.com/settings/personal-access-tokens**
2. Click the token you made for this site.
3. Under **Repository access**, click **Select repositories** and add the new repo.
4. Click **Update token** at the bottom.

You do *not* need to generate a new token or change anything in Vercel for this — the same token
gains the access.

#### Step 3 — Commit and push

```bash
git add -A
git commit -m "Show new-project on the projects page"
git push
```

Pushing triggers a rebuild automatically.

#### Step 4 — Check it worked

Open https://personal-site-phi-seven-43.vercel.app/projects/ and look for the new card.

**If it's missing and the page says "Showing a saved snapshot"**, the token can't see the repo — Step
2 didn't take. The site deliberately refuses to publish a partial list, so it fell back to saved data
rather than quietly leaving your project out. Redo Step 2, then rebuild.

### Add a blurb (optional, but recommended)

The GitHub API supplies the facts — language, commit counts, releases, last active. A blurb supplies
the writing. **For a private repo with no GitHub description, the blurb is the only description the
card will have**, so it matters more there.

Create `src/content/projects/<repo-name>.md`:

```markdown
---
repo: new-project
summary: One line describing what it is. This shows on the card.
pinned: false
span: normal
---

A longer description. Not currently rendered on the card, but kept for when the project detail
pages exist.
```

| Field | Meaning |
|---|---|
| `repo` | Must match the GitHub repo name exactly, or the blurb is ignored |
| `summary` | The one line shown on the card |
| `pinned` | `true` puts it first on `/projects` and makes it eligible for the home page |
| `span` | `normal`, `wide` (full width) or `tall`. Varies the bento layout |

Only **two** pinned projects appear on the home page, most recently pushed first.

### To hide a project

- **Private repo:** remove its name from `SHOWCASED_PRIVATE_REPOS`.
- **Public repo:** add its name to `HIDDEN_REPOS` on the line just below (around line 23).

Forks and archived repos are excluded automatically.

---

## 3. Update the About page

The About page is built from **two** files, split so you can change the writing without touching any
code.

### To change the words

Edit **[`src/content/about/index.md`](src/content/about/index.md)**. It's plain Markdown — rewrite,
reorder, add or delete sections freely. Headings (`##`), bullet lists, **bold** and links all render
correctly and are already styled.

The frontmatter at the top has two fields:

```markdown
---
title: About
headline: An engineer who noticed the barrier had moved.
---
```

- `title` — the browser tab title. Rarely needs changing.
- `headline` — the big line at the top of the page. Keep it short; it's set very large.

Everything below the `---` is the body.

Then:

```bash
git add -A
git commit -m "Update the About page"
git push
```

### To change the links

Edit the `LINKS` array in **[`src/consts.ts`](src/consts.ts)**. Both the About page and the site
footer read from it, so one edit updates both.

```ts
export const LINKS: readonly SiteLink[] = [
	{ label: 'GitHub', href: 'https://github.com/yderrick', inFooter: true },
	{ label: 'Email', href: 'mailto:crystaladdison17@gmail.com', inFooter: true },
	// { label: 'LinkedIn', href: 'https://www.linkedin.com/in/…' },
	// { label: 'CV (PDF)', href: '/derrick-yao-dzotefe-cv.pdf' },
];
```

- **To add a link:** add a line. Delete the `//` from a commented-out one to enable it.
- **`inFooter: true`** also shows it in the footer on every page. Leave it off to show the link only
  on About.
- **To add your CV:** drop the PDF into the **`public/`** folder, then point `href` at
  `/the-file-name.pdf`. Anything in `public/` is served from the site root as-is.
- **To add a second email:** add another entry with a distinct label, e.g.
  `{ label: 'Email (work)', href: 'mailto:…' }`.

### To check it

`npm run dev`, open http://localhost:4321/about, and read it before pushing.

---

## 4. Write a log entry

1. Create a file at `src/content/log/YYYY-MM-DD.md` using today's date.
2. Frontmatter:

   ```markdown
   ---
   title: 'What I did, in plain words'
   date: 2026-09-06
   tags: [astro, webdev]
   draft: false
   ---

   Body goes here. Plain Markdown.
   ```

3. `git add -A && git commit -m "Log entry for 6 Sept" && git push`

**Two entries on the same day:** name the second `YYYY-MM-DD-2.md`. It sorts *above* the first, since
it was written later.

**Drafts.** Setting `draft: true` hides the entry from the live site completely — the list, tag
pages, its own URL, and the home page — while leaving it visible in `npm run dev`. Write freely,
publish when you're ready.

**Content is not a release.** Log entries are a plain commit: no version bump, no changelog entry, no
tag. Only code and design changes get those.

---

## 5. Renew the GitHub token

**Your current token expires 6 September 2027.** There's a reminder set for 30 August 2027.

When it expires the site does not break. It falls back to the last saved snapshot and says so on the
page. But it stops being current, and nobody will tell you — so the reminder matters.

### Steps

1. Go to **https://github.com/settings/personal-access-tokens**
2. Click **personal-site-build** → **Regenerate token**, or create a new one with the same settings:
   - **Repository access:** Only select repositories → every repo you want on the site
   - **Permissions → Repository:** **Contents: Read-only** and **Metadata: Read-only**
3. Copy the new token (shown once).
4. Go to **https://vercel.com/dashboard** → **personal-site** → **Settings** → **Environment
   Variables**.
5. Find `GITHUB_TOKEN`, click **Edit**, paste the new value, **Save**.
6. **Redeploy** — saving an environment variable does *not* rebuild the site:
   **Deployments** → top entry → **⋯** → **Redeploy** (untick "Use existing Build Cache").
7. Confirm the bottom of `/projects` says "Fetched when the site was last built".

---

## 6. When something looks wrong

### `/projects` says "Showing a saved snapshot"

This is the site telling you the live fetch didn't fully succeed, so it used committed data instead
of publishing an incomplete page. It is working as designed — but the numbers are frozen, so fix it.

Causes, most likely first:

| Cause | Fix |
|---|---|
| Token expired | [Renew it](#5-renew-the-github-token) |
| A new private repo isn't in the token's repo list | [Step 2 above](#step-2--give-the-token-access-to-that-repo) |
| `GITHUB_TOKEN` missing in Vercel | Add it, then **redeploy** |
| You added an env var but didn't redeploy | Redeploy |
| GitHub API was down or rate-limited | Wait, then rebuild |

To see the actual reason: **Vercel → Deployments → click the build → Building** logs, and look for a
line starting `[github]`. It names the problem directly.

### Numbers look out of date

Check the date on the bottom line of `/projects`. If it's not today or yesterday, the daily refresh
may have stopped — check https://github.com/yderrick/personal-site/actions for red runs.

### A commit count shows nothing for a brand-new repo

Expected. GitHub's statistics lag behind a repo's first pushes, sometimes for a day or two. The card
hides a zero rather than showing a misleading "0 commits" next to "last active today". It corrects
itself.

### Rotate the deploy hook

If the hook URL leaks, or a refresh fails with an authorisation error:

1. **Vercel → personal-site → Settings → Git → Deploy Hooks** — delete the old one, create a new one
   for `main`, copy the URL.
2. Update the secret:
   ```bash
   gh secret set VERCEL_DEPLOY_HOOK --repo yderrick/personal-site --body '<new-url>'
   ```
3. Test it: Actions → Daily refresh → Run workflow.

The hook only triggers builds — it can't read data or expose anything. The worst case from a leak is
wasted build minutes.

---

## 7. Things to remember

- **Deploy = `git push origin main`.** There is no deploy command, and you should never run one.
- **The daily refresh exists because Vercel only rebuilds when *this* repo is pushed.** Work in
  `worldbuilder-engine` or `daylog` would otherwise never reach the site, and the activity numbers
  would quietly go stale while still looking current.
- **Private repos publish cadence, never content.** Name, blurb, language, commit counts, release
  counts and last-active date. Never a URL, a file name, or a commit message. Commit messages are
  written assuming nobody outside will read them.
- **`AIstudio` is deliberately not on the site.** It's private and not in the allowlist. Its GitHub
  description currently reads "Vibe Codes", which would want rewriting before it were added.
- **Adding a private project needs two steps**, the code allowlist *and* the token's repo access.
  Missing the second is the most likely mistake, and the symptom is the whole page falling back to
  the snapshot rather than just that one project going missing.
- **The site ships zero JavaScript.** If a change would add some, it needs to earn it.
- **`/about` is still unbuilt** — it shows in the nav as dimmed, non-clickable text.

### Credentials and where they live

| What | Where it lives | Expires |
|---|---|---|
| `GITHUB_TOKEN` | Vercel → Settings → Environment Variables | **6 Sept 2027** |
| `VERCEL_DEPLOY_HOOK` | GitHub → repo → Settings → Secrets → Actions | No expiry |

Neither is ever committed to the repo. `.env` is gitignored; if you create one locally for testing,
it stays on your machine.

---

## 8. Waiting on you

Things I've built the slot for but don't have the content for. Each is a one-line change once you
hand it over — send it and I'll wire it in, or follow the steps in
[Update the About page](#3-update-the-about-page).

| Item | Status |
|---|---|
| **LinkedIn** | ✅ Live — `linkedin.com/in/derrick-dzotefe-a871071ab` |
| **Second email** | ✅ Live — `dzotefederrickyao@gmail.com` is now primary (it matches the CV and LinkedIn), with `crystaladdison17@gmail.com` as "Second inbox" |
| **CV / résumé** | ✅ Live — a web-safe version at `/derrick-yao-dzotefe-cv.pdf`. See below for what differs from your original |

### The published CV is a web-safe version, on purpose

`DZOTEFE YAO DERRICK_CV.pdf` contains the personal contact details of three other people:

- Edmund Asamoah — email and mobile number
- Emmanuel Kpogo — two emails and a mobile number
- Daniel Gbeve — mobile number

Putting that file on a public website publishes **their** phone numbers and email addresses to
anyone, including scrapers, and Google will index it. They agreed to be referees for applications
you send — not to be listed on the open internet. They can't consent to something they don't know
about, which is why this is worth a moment rather than a shrug.

Your own mobile number, `0547967841`, is on it too. That one is your call, but a phone number on a
public page reliably attracts spam.

So the file on the site is a **regenerated** version at `public/derrick-yao-dzotefe-cv.pdf`, with the
references section replaced by "References available on request" — the normal convention for a CV
handed out broadly. Your original file is untouched; keep sending that one to specific employers.

**Other differences from your original, so nothing surprises you:**

- LinkedIn and GitHub added to the header contact line.
- Skills rewritten to reflect the experience above it: added *stock reconciliation and custody
  transfer* and *ERP systems (Odoo), NPA portal, ICUMS*, which your roles demonstrate but the old
  list omitted. Changed *"Artificial Intelligence and Machine Learning"* to *"Software development
  with AI tooling"* — closer to what you actually do, and a claim you can defend in an interview.
  **If you'd rather have the original wording back, say so.**
- Your phone number is still on it. You chose to keep it; it's the one remaining piece of personal
  data on a public, indexable file.
- The layout was rebuilt from your content rather than edited in place, so it looks different from
  your Word original.

**To replace it with your own version:** export a PDF, name it `derrick-yao-dzotefe-cv.pdf`, and drop
it into `public/` overwriting the existing file. Commit and push. Nothing else changes — the link
already points there.
