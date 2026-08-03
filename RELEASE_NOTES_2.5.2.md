# Ketravelan 2.5.2

Release date: 2026-08-04

## What is new

- Added native in-app Feedback form (replacing external Google Form flow).
- Added `user_reports` storage flow with screenshot attachments and submission reference IDs.
- Added automatic feedback confirmation email to the reporting user, including:
  - Reference ID
  - Feedback category and area
  - Summary and key detail highlights
- Improved feedback submission UX:
  - Uses system toast success/error feedback
  - Keeps users on the form and resets fields after successful submit

## Trip Details UX updates (mobile)

- Removed floating behavior from `Overview / Itinerary / Members` section pill.
- Preserved sticky top action navigation (back/favorite/share/more) while scrolling.
- Decoupled tab section pin-state logic from top action header visibility to prevent regressions.

## Version metadata

- Web/app package version updated to `2.5.2`.
- Android version updated to:
  - `versionName: 2.5.2`
  - `versionCode: 27`
