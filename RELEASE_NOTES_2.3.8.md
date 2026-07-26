# Ketravelan v2.3.8

Release date: 2026-07-10

## Highlights

- Improved onboarding date of birth flow with a dedicated modal picker.
- Better child safety and parental control messaging in onboarding and settings.
- Fixed mobile scrolling behavior in onboarding screens (native webview-safe layout).
- Refined comments UI to feel more chat-like.
- Fixed comment composer typing artifact where entered text looked spaced/offset on mobile.

## Changes

### Onboarding

- Replaced direct DOB input behavior with a structured DOB modal picker for more reliable mobile UX.
- Added clearer context text that DOB is used for child safety and parental controls.
- Updated onboarding layout to use app shell scroll containers for consistent mobile scrolling.

### Family Safety

- Improved Social Features Level PIN dialogs for Full Access/Disabled flows.
- Added clearer parental control copy in modal descriptions.
- Improved dialog mobile overflow handling.

### Community / Story Comments

- Updated comment section visuals toward a chat-style presentation.
- Improved composer sizing and alignment on mobile.
- Removed overlay text preview layer in comment input to prevent visual spacing artifacts while typing.

## Notes

- This release includes UX and behavior fixes focused on mobile usability, especially in native app webviews.
