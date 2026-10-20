# 0003. No analytics or third-party crash reporting

- Status: accepted
- Date: 2026-10-20

## Context

Issue #32: decide whether to ship crash reporting (e.g. Sentry) in the first release. The app is
fully offline, has no account, and its privacy promise is part of the product.

## Decision

Ship no analytics and no third-party crash reporting. Rely on the crash reports Apple provides
(Xcode Organizer / App Store Connect) from users who opted in at the OS level.

## Alternatives considered

- **Sentry (opt-in).** Better stack traces and breadcrumbs, but adds a network dependency, a
  privacy label entry ("Diagnostics"), a consent screen and source-map upload to every build.
- **Self-hosted endpoint.** Same privacy cost, plus infrastructure to run.

## Consequences

- The App Store privacy label is "Data Not Collected", and the app makes no network requests.
- Crash diagnosis depends on Apple's reports and on TestFlight feedback. If that proves
  insufficient, revisit with an explicit opt-in.
