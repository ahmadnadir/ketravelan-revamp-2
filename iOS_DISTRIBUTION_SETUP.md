# iOS App Distribution Setup - Ketravelan

This guide covers the complete iOS app distribution setup for the Ketravelan app on the Apple App Store.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Production Build](#production-build)
4. [Code Signing & Provisioning](#code-signing--provisioning)
5. [App Store Connect Setup](#app-store-connect-setup)
6. [Archive & Distribution](#archive--distribution)
7. [Submission Checklist](#submission-checklist)

---

## Prerequisites

### Required Software
- **Xcode** 15.0+ (with Command Line Tools)
- **CocoaPods** (for dependency management)
- **node/npm** (for Capacitor)
- **Mac with macOS 13.0+**

### Apple Developer Account
- Apple Developer Program membership ($99/year)
- App Store Connect access
- Created bundle ID: `dev.ketravelan.app` (adjust if needed)

### Install Xcode Command Line Tools
```bash
xcode-select --install
```

### Install CocoaPods (if not installed)
```bash
sudo gem install cocoapods
```

---

## Development Setup

### 1. Generate iOS Project
```bash
# From project root
npm run build
npx cap add ios
npx cap sync ios
```

### 2. Install iOS Dependencies
```bash
cd ios/App
pod install
cd ../..
```

### 3. Open in Xcode
```bash
npx cap open ios
```

### 4. Configure Bundle ID
In Xcode:
1. Select "App" in project navigator
2. Select "App" target
3. Go to "Signing & Capabilities" tab
4. Set **Bundle Identifier**: `dev.ketravelan.app`
5. Set **Team**: Select your Apple Developer team

### 5. Configure App Info
In Xcode, select "App" target:
1. Go to "General" tab
2. Set **Display Name**: "Ketravelan"
3. Set **Bundle Identifier**: `dev.ketravelan.app`
4. Set **Version**: `1.0.0`
5. Set **Build**: `1`
6. Supported Orientations: Both (or your preference)

---

## Production Build

### Build Command
```bash
npm run build
npx cap copy ios
npx cap sync ios
```

Or use the convenience script:
```bash
npm run ios:prod
```

### Manual Build Process
1. Open Xcode project from `ios/App/App.xcworkspace` (NOT .xcodeproj)
2. Select "App" target
3. Select "Generic iOS Device" or your target device
4. Product → Build (Cmd+B)

---

## Code Signing & Provisioning

### Automatic Signing (Recommended)
1. In Xcode, select "App" target
2. Click "Signing & Capabilities"
3. Enable "Automatically manage signing"
4. Select your Apple Developer Team
5. Xcode will auto-create/renew provisioning profiles

### Manual Signing (Advanced)
1. Visit [Apple Developer Certificates](https://developer.apple.com/account/resources)
2. Create Distribution Certificate (if needed)
3. Create App ID: `dev.ketravelan.app`
4. Create App Store Provisioning Profile
5. Download and install both in Xcode

### Trusted Signing (Best Practice)
- Use App Store Connect for certificate management
- Avoid manual certificate/profile creation when possible

---

## App Store Connect Setup

### 1. Create App on App Store Connect
```
https://appstoreconnect.apple.com
```

Steps:
1. Tap "Apps" → "+" → "New App"
2. Select **Platform**: iOS
3. **Name**: Ketravelan
4. **Bundle ID**: dev.ketravelan.app
5. **SKU**: ketravelan-2026 (unique)
6. **Category**: Travel or Apps
7. Click "Create"

### 2. Configure App Information
Fill in:
- **App Name**: Ketravelan
- **Subtitle**: "Plan, share, and track your trips"
- **Description**: Detailed app description
- **Promotional Text**: Short marketing message
- **Keywords**: travel, trip planning, expense tracking, community
- **License Agreement**: Select or create custom

### 3. Upload App Icons
- **App Icon**: 1024×1024 px (PNG, no transparency)
- **Preview Screenshots**: 
  - iPhone 17 Pro Max: 1290×2796 px (6.9")
  - iPhone 17 Pro: 1170×2532 px (6.1")
  - iPad Pro 13": 2732×2048 px
- Write compelling descriptions for each screenshot

### 4. Version Release Information
- **Version Number**: 1.0.0 (matches `Info.plist`)
- **Release Notes**: "First release of Ketravelan"
- **Build Number**: 1 (auto-increment)

### 5. Content Rating
- Go to "Content Rating"
- Answer IARC questionnaire
- Save rating certificate

### 6. Privacy
- Go to "Privacy"
- Add privacy manifest
- Declare data practices:
  - Analytics (if using): Traffic, User Interaction
  - If no analytics: Select "No data is collected"

### 7. Pricing
- Default: **Free**
- If paid: Select price tier in App Store Connect

---

## Export Options Configuration

Create `ios/App/ExportOptions.plist` for distribution builds:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store</string>
	<key>teamID</key>
	<string>TEAM_ID_HERE</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>thinning</key>
	<string>&lt;none&gt;</string>
	<key>uploadBitcode</key>
	<true/>
</dict>
</plist>
```

Replace `TEAM_ID_HERE` with your Apple Team ID (found in Apple Developer account).

---

## Archive & Distribution

### Create TestFlight Build (Recommended First Step)

#### Option 1: Using Xcode GUI
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select "App" target
3. Select "Generic iOS Device"
4. **Product** → **Archive** (Cmd+Shift+K)
5. After archiving completes, click **"Distribute App"**
6. Select **"TestFlight & App Store"**
7. Select **"TestFlight"**
8. Follow wizard → "Upload"

#### Option 2: Using Command Line
```bash
cd ios/App

# Build archive
xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath "build/Ketravelan.xcarchive" \
  -derivedDataPath "build/DerivedData"

# Export for TestFlight
xcodebuild -exportArchive \
  -archivePath "build/Ketravelan.xcarchive" \
  -exportPath "build/Export" \
  -exportOptionsPlist "ExportOptions.plist"

# Upload IPA to TestFlight (requires xcrun altool or Transporter app)
xcrun altool --upload-app \
  -f "build/Export/Ketravelan.ipa" \
  -t ios \
  -u "your-apple-id@example.com" \
  -p "your-app-specific-password"
```

### TestFlight Review (1-2 hours typically)
- App will be reviewed internally by Apple
- Check App Store Connect for build status
- Once approved, TestFlight build is available

### Distribute to App Store

1. In App Store Connect, go to **Apps** → **Ketravelan**
2. Go to **TestFlight** tab
3. Once build is approved, you should see it in "Builds"
4. Go to **App Store** tab → **Version**
5. Ensure all fields are complete (description, rating, etc.)
6. Click **"Add for Review"** next to your TestFlight build
7. On the next page, select **"Release this version manually"** (or auto)
8. Click **"Submit for Review"**

---

## Submission Checklist

Before submitting to App Store:

### Code & Functionality
- [ ] All features working on physical iOS device
- [ ] No console errors or warnings
- [ ] Handles network loss gracefully
- [ ] Push notifications working (if enabled)
- [ ] All links navigate correctly
- [ ] Offline mode works (if applicable)
- [ ] Tested on iPhone SE (smallest) and Pro Max (largest)

### App Store Metadata
- [ ] App name finalized
- [ ] Subtitle is compelling
- [ ] Description is detailed and accurate
- [ ] Keywords are relevant and searchable
- [ ] Promotional text is engaging
- [ ] Screenshots are high-quality and labeled
- [ ] Preview videos (optional but recommended)

### Privacy & Legal
- [ ] Privacy Policy is current and accurate
- [ ] Terms of Service are included
- [ ] GDPR/CCPA compliance verified
- [ ] No hardcoded API keys or secrets
- [ ] Privacy manifest filled out

### Content Rating
- [ ] IARC content rating completed
- [ ] Rating is appropriate for app

### Build & Technical
- [ ] Version number matches Info.plist
- [ ] Build number is unique and incremented
- [ ] Minimum iOS version set correctly (13.0+)
- [ ] Supported devices correct (iPhone, iPad, etc.)
- [ ] All required capabilities enabled

### Marketing & Business
- [ ] Screenshots match current app version
- [ ] Promotional art prepared (1200×600 px)
- [ ] Category is correct
- [ ] Pricing is set (Free or tier)
- [ ] Availability regions selected

---

## After App Store Approval

### Track Status
- Check App Store Connect regularly
- Status will show: "Review in Progress" → "Ready for Sale"

### First Release Timing
- Apps take 1-5 days to review typically
- Can schedule release date in App Store Connect
- Or select "Release immediately when approved"

### Beta Testing with TestFlight
- Invite testers via TestFlight before public release
- Get feedback from testers
- Fix issues and submit updated builds
- Public link: Up to 10,000 testers without invitation

### Monitor Post-Launch
- Check crash reports in Xcode Organizer
- Monitor ratings and reviews
- Plan updates for crashes/issues
- Roll out features with phased releases

---

## CLI Commands (package.json)

Add these to `package.json`:

```json
"scripts": {
  "ios:dev": "npx cap open ios",
  "ios:build": "npm run build && npx cap copy ios && npx cap sync ios",
  "ios:prod": "npm run build && npx cap copy ios && npx cap sync ios && npx cap open ios",
  "ios:test": "npm run build && npx cap copy ios && npx cap sync ios",
  "ios:archive": "cd ios/App && xcodebuild archive -workspace App.xcworkspace -scheme App -configuration Release -archivePath build/Ketravelan.xcarchive"
}
```

---

## Troubleshooting

### CocoaPods Issues
```bash
cd ios/App
rm -rf Pods
rm Podfile.lock
pod install --repo-update
cd ../..
```

### Xcode Stale Build
```bash
cd ios/App
xcodebuild clean -workspace App.xcworkspace -scheme App
cd ../..
```

### Permission Errors
```bash
# Fix pod permissions
sudo chown -R $(whoami):admin ~/.cocoapods
pod repo update
```

### Signing Issues
- Clear Xcode derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`
- Revoke and regenerate certificates in Apple Developer account
- Re-enable "Automatically manage signing" in Xcode

### Build Fails with M1/M2 Mac
- Ensure Xcode 13.3+ installed
- Run: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`

---

## References

- [Apple App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Xcode Help](https://help.apple.com/xcode/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Last Updated**: February 23, 2026  
**Version**: 1.0  
**App**: Ketravelan  
**Bundle ID**: dev.ketravelan.app
