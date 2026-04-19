# Security Policy

## Supported versions

Only the `main` branch and the latest image (`ghcr.io/lawndlwd/atom-lab:latest`) receive security fixes.

## Reporting a vulnerability

**Do not open a public issue.** Email **levendmohammadfr@gmail.com** with:

- A description of the issue and its impact.
- Steps to reproduce (PoC welcome).
- Affected version / commit SHA if known.

Expect an acknowledgement within 72 hours. I'll work with you on a fix and a coordinated disclosure timeline.

## Scope

In scope:

- Auth bypass, session fixation, CSRF.
- SQL / command / prototype-pollution injection.
- Data exposure across users (row-level isolation bugs).
- Push / web-push abuse (sending notifications as another user).

Out of scope:

- Rate-limit absence on non-auth routes (tracked as a feature, not a CVE).
- Issues requiring physical access to the device.
- Missing security headers behind a user's own reverse proxy — they own that layer.
