---
repo: budget-app
summary: A free, phone-first budgeting app for how money actually moves in Ghana — mobile money first, cedis by default, and one honest "safe to spend" number.
pinned: true
span: normal
---

A budgeting app for me, my family and people I invite, built around mobile money rather than bank
feeds, because bank linking isn't live in Ghana and an app can't read SMS from the Play Store. Pasted
MoMo and bank texts are read into an inbox instead, and nothing touches a balance until it's
confirmed.

React, TypeScript and Firebase on the free plan only. With no server functions, the database rules
are the only guard, so the invite list is enforced there and tested by breaking it on purpose. Saves
land on the phone first and work offline; a change the server later refuses is undone with a visible
message rather than quietly disappearing.

The money rules came before any screen: every amount is whole pesewas, a transfer is saved and deleted
as one so it can't make money appear or vanish, and a MoMo payment can be split across categories
with its fee carried as its own linked entry. "Safe to spend" never counts money that hasn't arrived.
