# Mobile App Distribution Guide - Ketravelan
## iOS & Android Deployment Strategy - February 23, 2026

---

## Executive Summary

This guide covers the complete mobile app distribution process for Ketravelan on both iOS (Apple App Store) and Android (Google Play Store). The app is built with Capacitor, enabling code sharing between platforms while maintaining native performance.

**Current Status (Feb 23, 2026):**
- ✅ Android Build: `assembleDebug` SUCCESS
- ✅ Capacitor Sync: COMPLETE
- ✅ Web Build: READY
- ✅ Database: MIGRATED
- 🔄 iOS: DOCUMENTATION READY
- 📋 Android: READY FOR RELEASE
- 📋 iOS: READY FOR RELEASE (macOS only)

---

## Quick Start

### Prerequisites
**For Both Platforms:**
- Node.js 16+
- npm or bun
- Capacitor CLI (`npm install -g @capacitor/cli`)

**For Android:**
- Android Studio
- JDK 11+
- Android SDK 31+ (API level)
- Gradle 7.0+
- Google Play Developer account ($25 one-time)

**For iOS:**
- Mac with macOS 12.0+
- Xcode 15.0+
- Apple Developer account ($99/year)
- CocoaPods

### Build Commands

```bash
# Build web assets (required for both platforms)
npm run build

# Android Setup
npm run android:prod      # Build, sync, and open in Android Studio

# iOS Setup (macOS only)
npm run ios:prod          # Build, sync, and open in Xcode
npm run ios:build         # Build and sync without opening
npm run ios:dev           # Just open existing iOS project

# iOS Distribution Build
./scripts/build-ios-dist.sh   # Create TestFlight-ready archive
```

---

## Android Distribution

### 1. Prepare Signing Key

**Create Release Keystore:**
```bash
keytool -genkey -v -keystore ~/ketravelan-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias ketravelan-key
```

**Store these securely:**
- Keystore file: `~/ketravelan-release.jks`
- Key alias: `ketravelan-key`
- Store password: (save in secure vault)
- Key password: (save in secure vault)

### 2. Configure Gradle Signing

Create `android/keystore.properties`:
```properties
storeFile=/Users/username/ketravelan-release.jks
storePassword=your_store_password
keyAlias=ketravelan-key
keyPassword=your_key_password
```

Add to `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

### 3. Build Release APK/AAB

```bash
# Bundle for Play Store (AAB - Android App Bundle)
cd android
./gradlew bundleRelease

# Or build APK for direct installation
./gradlew assembleRelease

# Output locations:
# AAB: android/app/build/outputs/bundle/release/app-release.aab
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### 4. Set Up Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
   - App name: "Ketravelan"
   - Category: Travel
   - Type: App
3. Accept declarations: COPPA, etc.
4. Create app

### 5. Configure Play Store Listing

**Go to: App → Ketravelan → Store Listing**

#### App Details
- **App Name**: Ketravelan
- **Short Description** (80 chars): "Plan, share, and track your trips"
- **Full Description** (4,000 chars):
  ```
  Ketravelan is your all-in-one travel companion for planning, sharing, 
  and tracking group trips with friends and family.
  
  FEATURES:
  • Create and manage group trips effortlessly
  • Split expenses fairly with automatic calculations
  • Track all shared costs in real-time
  • Share updates with your travel community
  • Discover amazing destinations
  • Connect with fellow travelers
  
  Whether it's a weekend getaway, family vacation, or adventure expedition,
  Ketravelan makes group travel planning simple and fun.
  ```

#### App Icon & Graphics
- **App Icon**: 512×512 px PNG
- **Feature Graphic**: 1024×500 px PNG
- **Screenshots** (5-8):
  - Landscape: 1280×720 px (preferred)
  - Portrait: 1080×1920 px
- **Preview Video** (optional): 15-30 seconds, WebM
- **Promo Graphics** (optional): 180×120 px

#### Categorization
- **Category**: Travel
- **Content Rating**: Use IARC questionnaire
- **Target Audience**: Teens and Adults

### 6. Set Up App Signing (Google Play)

1. Go to **Setup** → **App signing**
2. Choose **Google-managed signing** (recommended)
3. Google will manage release signing certificate
4. Upload your release AAB

### 7. Submit for Review

1. Go to **Release** → **Create new release**
2. **Choose Release channel**:
   - Internal testing (1-5 testers for quick testing)
   - Alpha (longer internal testing)
   - Beta (wider testing, feedback collection)
   - Production (public release)
3. **Add release notes**:
   ```
   Version 1.0.0 - Release Candidate
   
   Initial release of Ketravelan with full feature set:
   - Trip planning and management
   - Expense splitting
   - Community features
   - Real-time updates
   
   Thank you for using Ketravelan!
   ```
4. **Upload AAB file**: `android/app/build/outputs/bundle/release/app-release.aab`
5. **Review content rating**: Finalize if not done
6. **Review privacy info**: Ensure all data practices disclosed
7. **Click "Review and rollout"**
8. **Confirm release**

### 8. After Release

- **Monitor**: Check crash reports, ANR rates
- **Ratings**: Respond to reviews
- **Updates**: Plan bug fix releases
- **Analytics**: Track user engagement

---

## iOS Distribution

### 1. Prerequisites Check

```bash
# Verify Xcode
xcode-select --version

# Verify CocoaPods
pod --version

# Verify Apple Developer account setup
ls ~/Library/MobileDevice/Provisioning\ Profiles/
```

### 2. Xcode Configuration

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select **App** target
3. Go to **Signing & Capabilities**
4. Ensure **Automatically manage signing** is enabled
5. Select your Apple Developer Team
6. Verify **Bundle ID**: `dev.ketravelan.app`

### 3. Set Version & Build Numbers

In Xcode:
1. Select **App** target → **General** tab
2. Set **Version**: `1.0.0`
3. Set **Build**: `1` (increment for each submission)
4. Set **Minimum Deployment**: iOS 13.0

### 4. Build for App Store

```bash
# Option 1: Use build script (recommended)
./scripts/build-ios-dist.sh

# Option 2: Manual in Xcode
# 1. Select "Generic iOS Device"
# 2. Product → Archive
# 3. Click "Distribute App"
# 4. Choose "TestFlight & App Store"
```

### 5. Create App on App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **Apps** → **+** → **New App**
3. **Platform**: iOS
4. **Name**: Ketravelan
5. **Bundle ID**: dev.ketravelan.app
6. **SKU**: ketravelan-2026
7. **Category**: Travel
8. **Click Create**

### 6. Configure App Store Listing

**Go to: App → Ketravelan → App Information**

#### Localization
- **App Name**: Ketravelan
- **Subtitle**: Plan, share, and track your trips
- **Promotional Text**: Discover amazing group travel experiences
- **Description**: [Same as Android above]
- **Keywords**: travel, trip planning, expense tracking, group travel
- **Support URL**: https://www.ketravelan.app/support
- **Privacy Policy URL**: https://www.ketravelan.app/privacy

#### App Preview
- **Screenshots**: 5-8 per device type
  - iPhone 6.7": 1290×2796 px
  - iPhone 6.1": 1170×2532 px
  - iPad 12.9": 2048×2732 px
- **Preview Video** (optional): 15-30 seconds

#### Content Rating
- Go to **Ratings**
- Complete IARC questionnaire

### 7. Submit to TestFlight First

1. Go to **TestFlight** tab
2. Build should appear after upload (takes ~10 min)
3. Once build is available:
   - Add internal testers (yourself at minimum)
   - Mark as "Ready to Submit" after testing
4. Apple reviews internally (1-2 hours)
5. Once approved, ready for App Store submission

### 8. Submit to App Store

1. Go to **App Store** tab → **Version**
2. Ensure all information is complete
3. **Add for Review**:
   - Select build from TestFlight
   - Review content rating
   - Set release date (manual or automatic)
4. **Submit for Review**
5. Wait for Apple review (1-5 days typically)

### 9. After Approval

- App shows "Ready for Sale"
- Either releases automatically or on scheduled date
- Monitor crash reports in Organizer

---

## Publication Timeline

### Week Before Launch (Feb 16-22)
- [ ] Testing on both physical devices
- [ ] Finalize app store descriptions/screenshots
- [ ] Set up Google Play Console and App Store Connect
- [ ] Create signing credentials (Android keystore)
- [ ] Build test versions for both platforms

### Launch Day (Feb 23)
- [ ] Final QA on both platforms
- [ ] Android: Submit to Play Store (review: 2-4 hours)
- [ ] iOS: Submit to App Store (review: 1-5 days)
- [ ] Monitor submission status
- [ ] Prepare press release

### Post-Launch (Week of Feb 23)
- [ ] Monitor app store reviews
- [ ] Check crash reports daily
- [ ] Respond to user feedback
- [ ] Plan first hotfix if needed
- [ ] Track download metrics
- [ ] Share social media updates

---

## Feature Matrix

| Feature | Android | iOS | Web |
|---------|---------|-----|-----|
| Trip Planning | ✅ | ✅ | ✅ |
| Expense Tracking | ✅ | ✅ | ✅ |
| Community | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | Via web |
| Offline Mode | ✅ | ✅ | Limited |
| Google Sign-in | ✅ | ✅ | ✅ |
| Apple Sign-in | ❌ | ✅ | ✅ |
| Face/Touch ID | Through OS | Through OS | N/A |

---

## Troubleshooting

### Android Issues

**Build fails with `Unable to resolve dependency`**
```bash
cd android
./gradlew clean
./gradlew build --refresh-dependencies
```

**APK/AAB not found after build**
```bash
# Check build output
./gradlew bundleRelease --stacktrace

# Verify Java version (should be 11+)
java -version
```

**Google Play console won't accept AAB**
- Ensure signed with release keystore
- Check bundle version code is unique
- Verify no reserved characters in version name

### iOS Issues

**CocoaPods dependency conflicts**
```bash
cd ios/App
rm Podfile.lock
pod install --repo-update
```

**Xcode build failures**
```bash
# Clean all caches
rm -rf ~/Library/Developer/Xcode/DerivedData/*
xcodebuild clean -workspace ios/App/App.xcworkspace -scheme App
```

**Provisioning profile issues**
1. Go to Apple Developer → Certificates, Identifiers & Profiles
2. Revoke problematic profiles
3. Let Xcode auto-create new ones via "Automatically manage signing"

**TestFlight build upload stuck**
- Check network connection
- Verify Apple ID credentials
- Clear Xcode cache and retry

---

## Security & Privacy Checklist

- [ ] No hardcoded API keys or secrets
- [ ] All API calls use HTTPS only
- [ ] User data encrypted in transit and at rest
- [ ] Privacy Policy is accurate and current
- [ ] Terms of Service are complete
- [ ] No test/debug accounts in production build
- [ ] Debug logging disabled for sensitive data
- [ ] No analytics tracking without consent
- [ ] GDPR/CCPA compliance verified
- [ ] Data deletion functionality present

---

## Monitoring Post-Launch

### Metrics to Track
- **Daily Active Users (DAU)**
- **Monthly Active Users (MAU)**
- **Crash Rate** (target: < 0.1%)
- **ANR Rate** (Android, target: < 0.2%)
- **Average Session Duration**
- **Retention Rate** (Day 1, Day 7, Day 30)
- **Feature Usage** (most/least used features)

### Tools
- **Google Play Console**: Android analytics
- **App Store Connect**: iOS analytics
- **Xcode Organizer**: Crash logs
- **Firebase Console**: Backend analytics

### Response Plan
- **Critical Crash**: Hotfix within 24-48 hours
- **UI Bug**: Fix in next weekly release
- **Feature Request**: Plan for next version
- **Security Issue**: Immediate action

---

## Future Roadmap

### Post-Launch (Q1-Q2 2026)
- [ ] Improve onboarding
- [ ] Add in-app messaging
- [ ] Implement analytics
- [ ] Optimize performance
- [ ] Add more integrations

### Version 1.1
- [ ] Dark mode optimization
- [ ] Offline sync
- [ ] More payment methods
- [ ] Enhanced notifications

### Version 2.0
- [ ] AR trip planning
- [ ] Advanced analytics
- [ ] API for third-party integrations
- [ ] Web dashboard improvements

---

## Support & Resources

### Documentation
- [iOS_DISTRIBUTION_SETUP.md](iOS_DISTRIBUTION_SETUP.md) - Detailed iOS guide
- [iOS_SUBMISSION_CHECKLIST.md](iOS_SUBMISSION_CHECKLIST.md) - Pre-submission checklist
- [Android Build Guide](./docs/android-build.md) - Android-specific details

### Official Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

### Support Contacts
- **Apple Developer Support**: https://developer.apple.com/support/
- **Google Play Support**: https://play.google.com/console/support
- **Capacitor Community**: https://discord.gg/capacitorjs

---

**Document Version**: 1.0  
**Last Updated**: February 23, 2026  
**Next Review**: After first app releases  
**Owner**: Development Team  
**Status**: READY FOR DEPLOYMENT
