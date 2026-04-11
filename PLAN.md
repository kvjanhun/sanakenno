# Sanakenno React Native Migration Plan

## Current Status (v0.2.0)

Phases 0–6 are complete. The iOS app is running on device with the full feature set:
mono-repo workspace, shared domain logic, Expo Router navigation, honeycomb gameplay,
MMKV persistence, haptics intensity levels, archive with score/rank history, stats screen,
rules screen, hints, celebrations, midnight rollover, and failed-guess recording.

What remains is release distribution (Phase 8) and Android parity (deferred from Phase 7).

---

## Architecture Decisions (still active)

### Agent Guidance For Paid Program Boundaries
When implementing any phase or task that requires Apple distribution tooling or
paid-program-only capabilities, the implementing agent must state explicitly:
"You will need the paid Apple Developer Program for this."

This applies in particular to:
- EAS iOS device builds
- TestFlight setup
- App Store Connect distribution setup
- Final release signing and submission work

### iOS-First Rollout
The first release is iPhone-only. Android parity is a deliberate later phase, not
concurrent work.

Constraints:
- Keep shared domain logic platform-neutral so Android remains a later client, not a rewrite.
- Do not introduce iOS-specific assumptions into `packages/shared`.

---

## Phase 7 (remaining): Android Parity

These tasks were explicitly deferred until the iOS app is stable.

1. Start Android implementation after the iOS app is validated and stable
2. Add Android-specific adjustments deliberately — do not inherit iOS decisions blindly
3. Profile performance on Android simulator and physical devices
4. Validate all gameplay, navigation, persistence, haptics fallbacks, and sharing on Android

---

## Phase 8: Release Preparation

`eas.json` is already scaffolded. The remaining tasks:

1. **Join the Apple Developer Program** before any of the distribution steps below.
   You will need the paid Apple Developer Program for this.
2. Validate a production iOS build via `eas build --platform ios --profile production`
3. Run release-quality smoke testing on a physical device
   (clean install, gameplay, archive, settings, date rollover)
4. Configure App Store Connect: app record, metadata, screenshots, age rating, privacy info
5. Submit to TestFlight; validate with personal device before wider distribution
6. Submit for App Store review
7. Document the ongoing release and maintenance workflow (version bump, build, submit cycle)

Android release preparation — add after Android parity (Phase 7) is complete:
- Prepare EAS Android build config and keystore
- Validate production Android build and smoke test on physical device
- Prepare Play Store listing and submit for review

---

## Testing Strategy (remaining gaps)

- Mobile E2E: no Playwright or Detox coverage yet for the native app. Add only if the
  lighter BDD + manual layers prove insufficient, but keep it on the radar before App Store
  submission.
- Android: no mobile-specific BDD scenarios tagged `@android` yet. Add when Phase 7 begins.