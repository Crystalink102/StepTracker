# Pre-Launch Checklist - 5tepTracker

## Before Google Console Verification Completes

### Store Listing Assets Needed
- [ ] **Screenshots** (min 2, recommended 4-8, 9:16 ratio for phone)
      Take screenshots of: Home screen, Activity tracking, Leaderboard, Stats, Profile/Level
- [ ] **Feature Graphic** (1024x500 PNG or JPG)
      Hero banner shown at top of Play Store listing
- [ ] **Store icon** - Already done (512x512 via Expo adaptive icon build)

### Store Listing Copy
- [x] Short description (80 char) - see description.md
- [x] Full description - see description.md
- [x] Category: Health & Fitness
- [x] Contact email: support@5teptracker.com

### Legal & Compliance
- [x] Privacy Policy written (website/privacy.html)
- [x] Terms of Service written (website/terms.html)
- [ ] **Privacy Policy URL** - Confirm your Vercel domain and that /privacy loads correctly
- [x] Data Safety form answers prepared (see data-safety.md)
- [x] Content Rating answers prepared (see content-rating.md)
- [x] Non-exempt encryption: false (already in app.json for iOS)

### Google Cloud Console (DO NOW)
- [ ] **Restrict Google Maps API key** to Android apps only
      1. Go to console.cloud.google.com > APIs & Services > Credentials
      2. Click on the Maps API key
      3. Under "Application restrictions", select "Android apps"
      4. Add: Package name `com.steptracker.app` + SHA-1 from EAS build
      5. Under "API restrictions", restrict to "Maps SDK for Android" only
      Get SHA-1 with: `eas credentials -p android`

### EAS / Build Config
- [x] eas.json production profile configured with autoIncrement
- [x] appVersionSource: "remote" (version managed by EAS)
- [ ] **Production AAB build** - Run `eas build -p android --profile production` (builds .aab for Play Store, not .apk)
- [ ] **EAS Submit setup** - Will need Google Play service account JSON key
      1. In Google Play Console > Setup > API access
      2. Create/link Google Cloud project
      3. Create service account with "Release manager" role
      4. Download JSON key
      5. Run `eas credentials` to configure

### App Config Verification
- [x] Package name: com.steptracker.app
- [x] Version: 1.0.0
- [x] Version code: 1 (auto-increment enabled)
- [x] Target SDK: 34
- [x] Min SDK: 26
- [x] All permissions declared
- [x] Deep link scheme: steptracker://

---

## After Verification Completes

1. [ ] Create app in Google Play Console
2. [ ] Fill in store listing (copy from description.md)
3. [ ] Upload screenshots + feature graphic
4. [ ] Complete Data Safety form (copy from data-safety.md)
5. [ ] Complete Content Rating questionnaire (copy from content-rating.md)
6. [ ] Set up pricing (Free)
7. [ ] Select countries/regions for distribution
8. [ ] Set up Google Play service account for EAS Submit
9. [ ] Build production AAB: `eas build -p android --profile production`
10. [ ] Submit for review: `eas submit -p android --profile production`
11. [ ] Set up internal testing track first (recommended before production)

---

## Post-Launch
- [ ] Update DownloadBanner.tsx to link to Play Store URL instead of GitHub releases
- [ ] Update website download link to Play Store URL
- [ ] Monitor Android Vitals in Play Console for crashes/ANRs
- [ ] Respond to any Play Store policy issues within 7 days
