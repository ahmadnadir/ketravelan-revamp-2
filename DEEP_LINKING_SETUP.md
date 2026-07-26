# Deep Linking Setup (iOS + Android)

This project now supports:

- Android App Links (verified https links)
- iOS Universal Links (verified https links)
- In-app routing from incoming native URLs
- Website fallback when app is not installed (standard App Links/Universal Links behavior)

## 1) Replace required placeholders

You must replace these values before release:

1. In public/.well-known/apple-app-site-association and public/apple-app-site-association:
- TEAM_ID.com.ketravelan.app

2. In public/.well-known/assetlinks.json:
- RELEASE_SHA256_FINGERPRINT
- DEBUG_SHA256_FINGERPRINT

## 2) How to get iOS TEAM_ID

Use Apple Developer account Team ID.

- Apple Developer portal -> Membership -> Team ID
- Final appID format must be:
  TEAM_ID.com.ketravelan.app

## 3) How to get Android SHA-256 fingerprints

### Debug fingerprint

On macOS:

- keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android

Copy the SHA256 value into DEBUG_SHA256_FINGERPRINT.

### Release fingerprint

If you sign with your own keystore:

- keytool -list -v -alias <release_alias> -keystore <path_to_release_keystore>

Copy the SHA256 value into RELEASE_SHA256_FINGERPRINT.

## 4) Build and sync native projects

- npm run build
- npx cap sync ios
- npx cap sync android

## 5) Verify hosted association files

After deploying web, confirm these URLs return HTTP 200 and application/json:

- https://ketravelan.com/.well-known/apple-app-site-association
- https://ketravelan.com/apple-app-site-association
- https://ketravelan.com/.well-known/assetlinks.json
- https://www.ketravelan.com/.well-known/apple-app-site-association
- https://www.ketravelan.com/.well-known/assetlinks.json

## 6) iOS test steps (Universal Links)

Prerequisites:
- App installed from Xcode/TestFlight on a real device.
- Associated domains entitlement includes:
  applinks:ketravelan.com
  applinks:www.ketravelan.com

Steps:

1. Send yourself a link like:
- https://ketravelan.com/post/123

2. Tap from Notes, Messages, or Mail on device.

Expected:
- App opens directly.
- Route resolves to /community/stories/123.

Additional checks:

- https://ketravelan.com/discussion/456 should open /community/discussions/456.
- https://ketravelan.com/trip/<id> should open /trip/<id>.

If app is not installed:
- Link opens website in Safari.

## 7) Android test steps (App Links)

Prerequisites:
- App installed on Android 12+ preferred.
- assetlinks.json contains matching package + SHA-256 cert fingerprints.

Steps:

1. Open:
- Settings -> Apps -> Your app -> Open by default

2. Confirm supported web addresses include:
- ketravelan.com
- www.ketravelan.com

3. Tap link:
- https://ketravelan.com/post/123

Expected:
- App opens directly to /community/stories/123.

If app is not installed:
- Link opens website in browser.

## 8) Optional store fallback from website

Universal/App Links already satisfy website fallback.

If you also want explicit store fallback from the website UX:

- Keep an Install CTA on web pages that links to /install.
- Put App Store and Play Store URLs on /install page.

## 9) Troubleshooting

1. iOS still opens Safari:
- Reinstall app after changing associated domains.
- Verify AASA file is reachable without redirects/auth.
- Ensure appID uses correct TEAM_ID.

2. Android asks chooser or opens browser:
- Verify exact SHA-256 fingerprint in assetlinks.json.
- Verify package_name is com.ketravelan.app.
- Reinstall app after assetlinks changes.

3. Link opens app but wrong screen:
- Check alias mappings in src/lib/deepLinks.ts.
- Check route definitions in src/App.tsx.
