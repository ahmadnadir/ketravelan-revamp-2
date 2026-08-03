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

## Additional product updates included in v2.5.2

- Trip Card travel styles update:
  - Improved travel style rendering and display consistency on cards.
  - Travel styles and related chips were cleaned up to reduce clutter and improve scanability.
- Home currency logic enhancement:
  - Improved currency conversion and display handling for user home currency flows.
  - Better handling of converted totals and budget display consistency.
- Trip Details previous-route logic:
  - Improved return-path behavior so back navigation returns users to the correct previous screen context.
  - Added cleaner return parameter handling and fallback routing.
- Feedback system rollout:
  - Added in-app feedback/report form with screenshot attachments.
  - Added confirmation email with reference ID and key report details.
  - Added successful submission toast behavior aligned with the app's standard notification style.
- Navigation architecture improvements:
  - Added reusable scroll/header hooks and modular trip-details navigation components.
  - Improved mobile scroll transitions and reduced competing sticky/floating nav behaviors.

## Version metadata

- Web/app package version updated to `2.5.2`.
- Android version updated to:
  - `versionName: 2.5.2`
  - `versionCode: 27`
