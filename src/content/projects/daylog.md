---
repo: daylog
summary: A personal Android app built around a hard privacy constraint — everything is processed on-device, with exactly one network egress point.
pinned: true
span: normal
---

A single-user Android app in Kotlin, built to a set of invariants that are asserted in code and tests
rather than just written down: raw audio never leaves the device, derived biometric data never leaves
the device, and there is exactly one place in the entire app that touches the network.

The interesting engineering is in the constraint. On-device processing rules out the easy cloud
answer for most of the pipeline, cloud backup is disabled at the manifest level so the OS can't copy
data off the phone on the app's behalf, and unresolved states fail closed — the default on timeout is
delete, not keep.

Structurally it's a Compose app over a pure-Kotlin core with no Android imports, which keeps the
fiddliest logic testable without an emulator in the loop.
