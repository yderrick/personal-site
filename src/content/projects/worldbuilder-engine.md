---
repo: worldbuilder-engine
summary: An offline-first workspace for planning and writing long fiction — manuscript editor, story planner, lore graph and timeline in one app.
pinned: true
span: wide
---

A writing environment for people working on something long enough to lose track of. React, TypeScript
and Vite, syncing to Firebase in real time — but it runs entirely client-side against a local mock
backend when no Firebase project is configured, so it works with zero setup and keeps working
offline.

The parts I've spent most of my time on are the ones that have to stay consistent with each other: a
manuscript editor that auto-links entities as you type, a Kanban and timeline story planner, a
force-directed relation graph, and a character dashboard built on established models rather than
invented ones. Changing a character in one place has to be true everywhere else, which is most of the
engineering.

It's an installable PWA with a genuinely different mobile shell below 768px rather than a squeezed
desktop layout.
