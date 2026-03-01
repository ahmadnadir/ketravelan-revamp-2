# iOS App Store Submission Checklist - Ketravelan

Complete this checklist before submitting to the App Store on February 23, 2026.

## Pre-Submission (Week Before)

### Code Quality
- [ ] All features tested on physical iOS device (iPhone 12 or later)
- [ ] No console errors, warnings, or crashes
- [ ] Handles network failures gracefully
- [ ] Offline functionality works correctly
- [ ] Sign out flow works properly
- [ ] All navigation routes work
- [ ] Deep links functional (if applicable)
- [ ] Biometric authentication tested
- [ ] Push notifications working (if enabled)
- [ ] All API calls return proper error states

### User Experience
- [ ] App launches within 5 seconds
- [ ] No blank screens or frozen UI
- [ ] Text is readable (minimum 11pt font)
- [ ] Colors have sufficient contrast (WCAG AA standard)
- [ ] Buttons are easily tappable (minimum 44×44 pt)
- [ ] Gestures are intuitive
- [ ] Back navigation works consistently
- [ ] No extraneous debug UI visible

### Device Testing
- [ ] Tested on iPhone SE (smallest, 4.7")
- [ ] Tested on iPhone Pro Max (largest, 6.7")
- [ ] Tested on iPad (if supporting iPad)
- [ ] Portrait and landscape modes tested
- [ ] Notch/Dynamic Island safe area tested
- [ ] Landscape orientation disabled (if not needed)
- [ ] Accessibility features tested (VoiceOver, Zoom)

### Platform Compliance
- [ ] Minimum iOS 13.0 or higher specified in Xcode
- [ ] No deprecated APIs used
- [ ] App supports both light and dark mode (or is tested in both)
- [ ] App handles iOS privacy features gracefully
- [ ] No hardcoded API keys or credentials visible
- [ ] No test/debug code left behind

---

## Xcode Configuration

### Target Settings
- [ ] Team selected in Signing & Capabilities
- [ ] Bundle ID: `dev.ketravelan.app`
- [ ] Version Number: `1.0.0` (matches Info.plist)
- [ ] Build Number: `1` (unique for each submission)
- [ ] Deployment Target: iOS 13.0+
- [ ] Device orientation set correctly

### Capabilities
- [ ] Push Notifications enabled (if needed)
- [ ] Sign in with Apple enabled (if used)
- [ ] User Privacy-Protected Data enabled (if collecting data)
- [ ] App Clips enabled (if applicable)

### Signing Certificate
- [ ] Distribution Certificate created in Apple Developer account
- [ ] App Store Provisioning Profile created
- [ ] Automatic signing enabled (recommended)
- [ ] All provisioning profiles up to date

### Privacy Configuration
- [ ] Privacy manifest (PrivacyInfo.xcprivacy) included
- [ ] All required privacy items declared
- [ ] Privacy policy URL configured in app

---

## App Store Connect Setup

### App Information
Go to **App Store Connect** → **Apps** → **Ketravelan** → **App Information**

#### Localizations
- [ ] English (or primary language) configured
- [ ] App Name: "Ketravelan"
- [ ] Subtitle: "Plan, share, and track your trips"
- [ ] Support URL: https://www.ketravelan.app/support
- [ ] Support Email: support@ketravelan.com
- [ ] Privacy Policy URL: https://www.ketravelan.app/privacy
- [ ] Marketing URL: https://www.ketravelan.app (optional)

#### Category
- [ ] Primary Category: Travel (or Maps/Navigation)
- [ ] Secondary Category: Lifestyle (optional)

### Version Information

Go to **App Store Connect** → **Apps** → **Ketravelan** → **App Store** → **Version**

#### General
- [ ] Version Number: 1.0.0
- [ ] Build Number: 1
- [ ] Release Date: Choose manually or immediate

#### Description (Localization)
**Description** (English, max 4,000 characters):
```
Ketravelan is your all-in-one travel companion for planning, sharing, and tracking group trips.

Key Features:
• Create and manage group trips easily
• Split expenses fairly with built-in splitting
• Track shared costs automatically
• Share trip updates with your community
• Discover travel destinations
• Connect with fellow travelers

Perfect for:
- Weekend getaways with friends
- Family vacations
- Group tours
- Adventure expeditions
- Study abroad programs

Start your journey with Ketravelan today!
```

**Promotional Text** (optional, max 170 characters):
```
Plan amazing group trips and split costs effortlessly with Ketravelan.
```

**Keywords** (comma-separated, max 100 characters):
```
travel, trip planning, expense tracking, group travel, budgeting, adventure
```

### Ratings & Accessibility

Go to **App Store Connect** → **Apps** → **Ketravelan** → **App Store** → **Ratings**

#### Content Rating
- [ ] Content Rating Questionnaire completed
  - Go to **Ratings**
  - Click **Edit** next to IARC Rating
  - Answer all questions honestly
  - Save certificate

#### Privacy & Data Collection
- [ ] Privacy Questions answered (exact questions listed in App Store Connect)
  - [ ] Does your app collect, use, or share any user data?
  - [ ] Does your app use third-party sign-in services?
  - [ ] Does your app use advertising?
  - [ ] Does your app contain or require health data?

### Build Submission

#### Select Build
- [ ] Build has been approved by Apple on TestFlight
- [ ] Use same build number for submission (no re-uploading)

#### App Review Info
- [ ] Provide reviewer notes if app has special features:
  ```
  Example: "Use test account: demo@example.com / password123"
  ```
- [ ] Contact information for review issues
- [ ] Indication of restricted content (if any)
- [ ] Demo account credentials (if needed for sign-in)

### Pricing & Availability

Go to **App Store Connect** → **Apps** → **Ketravelan** → **Pricing & Availability**

- [ ] Price Tier: Free (or select paid tier)
- [ ] Availability:
  - [ ] Select "Worldwide" or specific countries
  - [ ] Age Restrictions set (default is 4+)
  - [ ] First Release Date: February 23, 2026 (or your planned date)
  - [ ] Release Schedule: Automatic (or select manual date)

### Screenshots & Preview

Go to **App Store Connect** → **Apps** → **Ketravelan** → **App Store** → **Screenshots**

#### iPhone Screenshots (Required)
- [ ] 5-8 screenshots recommended
- [ ] Resolution: 1170×2532 px (iPhone 15 Pro)
- [ ] Format: PNG or JPG

**Screenshot Examples:**
1. **Home/Explore**: Feature hero screenshot
2. **Create Trip**: Show trip creation flow
3. **Expense Tracking**: Show expense splitting
4. **Community**: Show social features
5. **Map/Destinations**: Show exploration feature

#### Screenshot Descriptions (Localization)
For each screenshot, add a compelling description:
```
Screenshot 1: "Browse and discover amazing travel destinations"
Screenshot 2: "Create group trips and invite friends easily"
Screenshot 3: "Split expenses fairly with real-time tracking"
Screenshot 4: "Share your journey with your community"
Screenshot 5: "Track all trip details in one place"
```

#### Preview Video (Optional)
- [ ] Video length: 15-30 seconds (max 500 MB)
- [ ] Shows app in action
- [ ] Resolution: 1170×2532 px
- [ ] No watermarks or logos

#### App Preview Logo (Recommended)
- [ ] Logo: 1200×600 px PNG (transparent background)

---

## Privacy & Security

### Privacy Manifest (PrivacyInfo.xcprivacy)
Create `App/PrivacyInfo.xcprivacy` in Xcode (File → New → Privacy Manifest):

#### Required Reasons
If your app uses restricted APIs, declare reasons:

**Example for Analytics:**
```
NSPrivacyTracking: false
NSPrivacyTrackingDomains: []
NSPrivacyCollectedDataTypes:
  - NSPrivacyCollectedDataType: NSPrivacyCollectedDataTypeUserID
    NSPrivacyCollectedDataTypeLinked: false
    NSPrivacyCollectedDataTypeTracking: false
    NSPrivacyCollectedDataTypePurposes:
      - NSPrivacyCollectedDataTypePurposeAppFunctionality
```

**If no tracking:**
```
NSPrivacyTracking: false
NSPrivacyCollectedDataTypes: []
NSPrivacyAccessedAPITypes: []
```

### App Privacy Policy
- [ ] Privacy policy is accessible in app
- [ ] URL: https://www.ketravelan.app/privacy
- [ ] Covers:
  - What data is collected
  - How data is used
  - Data retention policy
  - User rights
  - Third-party services used
  - Cookies and tracking info

### Security & Data Protection
- [ ] No user passwords stored in plaintext
- [ ] API communication uses HTTPS only
- [ ] Sensitive data encrypted at rest
- [ ] GDPR/CCPA compliant (if applicable)
- [ ] Data deletion functionality tested
- [ ] No debug logging of sensitive info

---

## Final Review (Day Before Submission)

### Quality Assurance
- [ ] Fresh device install tested
- [ ] Create new account and test signup flow
- [ ] Login with existing account and test
- [ ] All main features work end-to-end
- [ ] All links in description are valid
- [ ] Support email responds quickly
- [ ] Privacy policy link works
- [ ] Terms of service accessible

### Screenshots & Metadata
- [ ] All screenshots match current app version
- [ ] Screenshots are horizontal (landscape) if possible
- [ ] Description has no typos or grammar errors
- [ ] Keywords are relevant and not spammy
- [ ] Category is correct and specific
- [ ] Support contact info is valid

### Build Validation
- [ ] Build signed with correct certificate
- [ ] Provisioning profile is valid and current
- [ ] Build works on physical device
- [ ] No test accounts or credentials visible
- [ ] Build number is unique and incremented
- [ ] Version number matches submission version

---

## Submission Day

### Final Submission Steps
1. **In App Store Connect:**
   - [ ] Review all information one final time
   - [ ] Ensure all required fields are filled
   - [ ] Click **Prepare for Submission**
   - [ ] Review warnings about compliance
   - [ ] Click **Submit for Review**

2. **Confirmation:**
   - [ ] App shows "Waiting for Review"
   - [ ] Email confirmation received
   - [ ] Take note of submission timestamp

3. **Tracking:**
   - [ ] Save AppStore Connect URL
   - [ ] Set calendar reminder for review period (1-5 days)
   - [ ] Watch for approval email

### After Submission
- [ ] Do NOT make changes to submitted build
- [ ] Continue with web deployment
- [ ] Prepare press release if applicable
- [ ] Set up social media announcement

---

## Common Rejection Reasons to Avoid

❌ **Don't Submit If:**
- App crashes on device
- Metadata contains misleading claims
- App requires sign-in for basic functionality
- Broken links in app or metadata
- Hardcoded API keys visible
- Missing privacy policy
- Unclear app purpose
- Low quality screenshots
- Excessive permissions requested
- Incomplete app information

---

## Post-Approval Actions

### App Approved ✓
1. [ ] Set release date or release immediately
2. [ ] Announce on social media
3. [ ] Send press release
4. [ ] Update website with App Store link
5. [ ] Monitor crash reports in Xcode Organizer
6. [ ] Respond to customer reviews
7. [ ] Plan first update with improvements

### App Rejected ✗
1. [ ] Read detailed rejection reason
2. [ ] Make required changes
3. [ ] Submit new build (increment build number)
4. [ ] Resubmit with explanation
5. [ ] Response typically faster if clear fix

---

## Useful Links

- [App Store Connect](https://appstoreconnect.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Privacy Guidelines](https://developer.apple.com/app-store/privacy-guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Xcode Help](https://help.apple.com/xcode/)

---

**Submission Date**: February 23, 2026  
**App**: Ketravelan  
**Version**: 1.0.0  
**Bundle ID**: dev.ketravelan.app  
**Platform**: iOS  

✓ = Completed
