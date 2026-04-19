# Overview

**Identity** is a personal tracking + journaling PWA. You define your identities ("I am a reader.") with a daily action ("Read 1 page before bed") and a scheduled time; the app buzzes your phone at that time and asks you to cast a vote for who you're becoming.

## Core loop

1. **Today** — timeline ordered by scheduled time. Check off what you did.
2. **Week** — seven-day streak strip per identity.
3. **Review** — on Sunday, five fixed questions lock the week.
4. **Journal** — per-user tabs (e.g. Market / Lab) holding rich BlockSuite notes.
5. **Habits** — the _rule_ sits at the top (cooldown, minimum streak, cap). New identities stay locked until the rule lets them unlock.

## Who it's for

Anyone who wants to run their own daily-identity tracker without shipping their journal to a third party. Multi-user with an email allowlist — drop your friends' emails in `ALLOWED_EMAILS` and they can sign up on your box.

## What it is not

- Not a social app. No feeds, no sharing, no followers.
- Not a to-do list. Votes are binary: done / not done.
- Not a habit streak gamification tool. The rule throttles _adding_ habits, not shaming you for missing them.
