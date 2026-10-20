# Releasing Rounds (iOS)

The app is built and submitted with [EAS](https://docs.expo.dev/eas/) from `apps/mobile`.
Steps marked **(owner)** need the Apple Developer account holder.

## One-time setup

1. **(owner)** Sign in to Expo and link the project:
   ```bash
   cd apps/mobile
   pnpm dlx eas-cli@latest login
   pnpm dlx eas-cli@latest init
   ```
   `init` writes the EAS project id into `app.json`; commit that change.
2. **(owner)** Create the app in [App Store Connect](https://appstoreconnect.apple.com):
   - Bundle ID: `com.mohamadsobhie.rounds`
   - Name: Rounds (if taken, use the subtitle variant from [`store/listing.md`](store/listing.md))
   - Primary category: Health & Fitness
3. **(owner)** Let EAS manage signing on the first build (it creates the distribution certificate
   and provisioning profile in your Apple account when prompted).

## Test on a real iPhone first

Background audio can only be verified on a device (issues #4 and #16).

```bash
cd apps/mobile
pnpm dlx eas-cli@latest build --profile development --platform ios
```

Install the build from the link EAS prints, then run `pnpm start` and open the app. Checklist:

- [ ] Start "Hill intervals" with music playing in another app; lock the phone
- [ ] Countdown beeps, step chimes and spoken cues play on time for 20 minutes, screen locked
- [ ] Music keeps playing underneath
- [ ] A phone call or Siri mid-workout: cues resume at the right step afterwards
- [ ] Pause from the app, lock, unlock, resume: cues line up with the screen
- [ ] Finish a workout with the screen locked: it appears in Activity

## Build and submit to TestFlight

```bash
cd apps/mobile
pnpm dlx eas-cli@latest build --profile production --platform ios
pnpm dlx eas-cli@latest submit --profile production --platform ios --latest
```

Build numbers increment automatically (`appVersionSource: remote`). Bump `version` in `app.json`
for each App Store release.

In App Store Connect, before the first external TestFlight or App Store review:

- [ ] App Privacy: **Data Not Collected** (see [`store/privacy-policy.md`](store/privacy-policy.md))
- [ ] Privacy policy URL (the policy page, once the repository is public or hosted)
- [ ] Export compliance: answered in the build (`ITSAppUsesNonExemptEncryption = false`)
- [ ] App Review notes: paste [`store/review-notes.md`](store/review-notes.md)
- [ ] Screenshots (6.9" iPhone): from `docs/screenshots`, or retake on an iPhone 17 Pro Max simulator
- [ ] Description, keywords, subtitle and promotional text: [`store/listing.md`](store/listing.md)
