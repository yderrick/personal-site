# Changelog

All notable changes to the site itself — pages, components, styles, build logic. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is semantic (patch = fix or tweak, minor = new page or feature, major = redesign).

**Log entries are not releases.** Adding or editing content in `src/content/log/` is a plain commit and does not appear here.

Each released version has a matching annotated git tag (`vX.Y.Z`), so any prior state can be restored with `git checkout vX.Y.Z`.

## [Unreleased]

## [0.1.0] - 2026-09-05

First release. Covers Phases 1 to 3 — scaffold, design system and the daily log — up to Release Gate 1.

### Added
- Astro 7 static site, deployed on Vercel from `main`. `npm run build` runs `astro check` first, so
  type errors fail the build.
- Design system in `src/styles/tokens.css`: one accent (amber `#ffb000`) on a warm near-black ground,
  a type scale, spacing, radii and motion durations, all as CSS custom properties. `global.css`
  applies them to base elements and handles `prefers-reduced-motion` once, globally.
- Self-hosted variable fonts via `@fontsource-variable` — Bricolage Grotesque (display), Public Sans
  (body), JetBrains Mono (dates and tags). No font CDN.
- `BaseLayout.astro` with skip link, canonical URL and Open Graph tags; `Nav.astro` reading its route
  list from `src/consts.ts`.
- The `log` content collection, its zod schema, and `src/lib/log.ts` — the single place drafts are
  filtered, plus sorting, tag counting, adjacent-entry lookup and UTC date formatting.
- `/log` with a derived tag bar, `/log/[slug]` with Older/Newer links, and `/log/tags/[tag]`.
- Home page showing the three most recent published entries.
- Three seed entries written from real work.

### Notes
- The site ships **zero JavaScript**. `<ClientRouter />` was considered and deliberately left out.
- Every foreground/background pair in the token set clears WCAG AA.

### Removed
- Initial planning documents are no longer listed as unreleased; they shipped with this version.

<!--
Template for a release — copy, don't improvise the shape:

## [0.2.0] - 2026-09-12

### Added
- Tag filtering on `/log`, with the tag set derived from entry frontmatter.

### Changed
- Project cards moved from a uniform grid to the bento layout.

### Fixed
- Draft entries no longer appear in the RSS feed.

### Removed
- Unused `client:load` directive on the nav; it ships zero JS again.
-->
