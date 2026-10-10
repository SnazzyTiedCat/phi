> **DRAFT — must be reviewed by a qualified attorney before publishing.** The privacy and AI-disclosure answers below must match the submitted build and the Privacy Policy.

# App Store Connect draft: Phi 1.0

Bundle ID: `com.MichaelLargentJr.PhiIos` · Version 1.0 · Operator: Michael Largent Jr (individual) · Contact: michaellargentjr@gmail.com

---

## 0. Read first: blockers (state of the working tree, 2026-10-08)

The repo was being changed by another agent while this draft was written. The findings below come from reading the working tree (branch `feat/ios-ship-ready`, uncommitted), not from HEAD. Re-run the greps before submission. Do not submit until each blocker is built, or the copy and privacy answers are changed to match what ships.

| # | Gap | Evidence in the working tree | Why it matters |
|---|---|---|---|
| 1 | No in-app privacy policy link | `SettingsSheet` still has only the "Font" picker and the "Legal" row (OFL text). | Apple requires the policy link inside the app as well as in App Store Connect. [UNCERTAIN] Confirm the current wording of Guideline 5.1.1(i). |
| 2 | No AI consent gate | `Phi/Services/Anthropic/AnthropicClient.swift` posts to `https://api.anthropic.com/v1/messages` with the user's key in `x-api-key`. It has no callers, and no screen shows a disclosure or asks permission. | Guideline 5.1.2(i) requires explicit permission before personal data goes to third-party AI. This is the most important blocker. |
| 3 | No in-app data or account deletion | Not present. The only delete is `KeychainStore.delete(account:)`, a helper with no UI. | Guideline 5.1.1(v) requires in-app account deletion if users can create an account. [UNCERTAIN] Whether an anonymous account counts is unresolved. Treat it as counting. |
| 4 | Material upload and storage not wired | `MaterialExtraction.swift` extracts text on device with PDFKit (no callers yet). `Material` now has `storagePath` and `contentHash`, but no code uploads a file or writes a row. The bucket and tables exist only as SQL in `Docs/supabase/`. | The label and policy describe upload and storage as collected. |
| 5 | Lessons, flashcards, quizzes, grades, and chat not saved | `Lesson.swift`, `ChatMessage.swift`, and `ContentHash.swift` are data models with no callers. No client writes to `ios.lessons` or `ios.chat_messages`. | Same as 4. |
| 6 | Anthropic key not yet entered or stored from the UI | `Phi/Services/KeychainStore.swift` stores the key as `ThisDeviceOnly`, which matches the policy. It has no callers, and there is no key-entry screen. | The policy describes the key-entry flow, which is not built. |
| 7 | Read-aloud not yet wired | `Phi/Services/Speech/SpeechNarrator.swift` uses `AVSpeechSynthesizer` on device. It has no callers. | Copy and policy describe it. Remove it from the description if it does not ship in 1.0. |
| 8 | Live Supabase project state is unverified | `Docs/supabase/rls_audit.md` (2026-07-03): anonymous sign-in was off, the `ios` schema was not exposed, and legacy `public.sources` and `public.lessons` still existed. `Docs/README.md` says the project is shared with usephi.io. | [UNCERTAIN] Whether legacy web-app data falls under this policy, and whether the label must cover it. |
| 9 | Export compliance key missing | `Phi/Info.plist` has no `ITSAppUsesNonExemptEncryption` key. The file is unchanged in the working tree. | App Store Connect asks on every build. See Section 9. |
| 10 | Reviewer access | AI features need a working key. Anonymous sign-in must be enabled. | See Section 7. |

Notes that are not blockers:
- `SupabaseVerificationHarness.swift` and `TurnstileWebView.swift` are deleted in the working tree. Earlier reads showed the harness, which was `#if DEBUG` only, and a Turnstile placeholder that made no network call. Neither is in the current build.
- `Phi.xcodeproj` now sets `IPHONEOS_DEPLOYMENT_TARGET` to 17.0 in the working tree, where HEAD has 26.5. Confirm the intended minimum OS before submission.
- The only package dependency is still `supabase-swift`.

---

## 1. App information

**Name (max 30):** Phi
[UNCERTAIN] Name availability was not checked. A short name is likely taken. Check it in App Store Connect before committing.

**Subtitle (28 / 30):** AI tutor for your coursework

**Promotional text (129 / 170):** Turn your own course materials into lessons, flashcards, quizzes, and a tutor you can question. Bring your own Anthropic API key.

**Keywords (97 / 100):** study,tutor,flashcards,quiz,lesson,textbook,homework,exam,review,notes,college,course,PDF,lecture
Keywords do not include third-party trademarks, such as "Claude" or "Anthropic."

**Copyright:** 2026 Michael Largent Jr

**What's New (1.0):** Initial release.

**Price and in-app purchases:** [TO BE SET]. The facts provided do not describe any purchase. [UNCERTAIN] If any paid feature is added, Apple's in-app purchase rules apply.

**Description (max 4,000):** Remove any bullet for a feature that is not in the submitted build.

> Phi is an AI tutor for the material you already study.
>
> Import your own textbook PDFs, text, or Markdown notes. Phi turns them into:
>
> • Lessons that work through your material section by section
> • Flashcards for active recall
> • Quizzes, with short-answer grading and explanations
> • A chat to ask questions while you work through a lesson
> • Read-aloud playback of lessons, using your device's speech
>
> BRING YOUR OWN KEY
> Phi uses your own Anthropic API key. The key is stored in your device's Keychain. Your requests go from your device to Anthropic, and Anthropic bills your usage directly.
>
> YOUR MATERIALS STAY PRIVATE TO YOUR ACCOUNT
> Phi creates an anonymous account on first launch, so you do not need an email address to start. Your materials and generated study content are stored in your account, and only your account can access them. Phi has no ads and no tracking.
>
> CHECK THE WORK
> AI can make mistakes. Use Phi alongside your teacher, your textbook, and your course materials, and follow your school's rules on AI use.
>
> Phi needs an internet connection and an Anthropic API key. Phi is an independent app. It is not made by or affiliated with any school, Apple, Anthropic, or Supabase.
>
> Privacy Policy: [TO-BE-HOSTED] · Terms of Use: [TO-BE-HOSTED] · Support: [TO-BE-HOSTED]

---

## 2. Category suggestions

- **Primary:** Education
- **Secondary:** Reference. [UNCERTAIN] Productivity is the alternative.
- **Not** the Kids category. The app is not made for children under 13 (see the Privacy Policy, Section 7).

---

## 3. Age rating (questionnaire answers)

Apple computes the final rating from your answers. The labels below may not match Apple's current wording exactly. [UNCERTAIN] Check each question against the questionnaire on submission day.

| Question area | Answer | Reasoning |
|---|---|---|
| Cartoon or fantasy violence | None | |
| Realistic violence | Infrequent / mild | Textbooks and AI chat can discuss historical or scientific violence. The operator cannot fully control AI output. |
| Prolonged graphic or sadistic violence | None | |
| Profanity or crude humor | Infrequent / mild | Literature or other user materials may contain profanity that the AI quotes. |
| Mature or suggestive themes | Infrequent / mild | Study materials cover mature topics, such as history, health, and literature. |
| Horror or fear themes | None | |
| Medical or treatment information | Infrequent / mild | Biology and health materials are common. Phi gives no medical advice (Terms, Section 6.2). |
| Alcohol, tobacco, or drug use or references | Infrequent / mild | Textbooks may mention these topics. |
| Sexual content or nudity | None | Anatomy in biology materials is educational. [UNCERTAIN] AI output cannot be fully controlled. The guardrails are product behavior, not a security boundary (see `WALKTHROUGH.md`). If in doubt, choose infrequent / mild. |
| Graphic sexual content and nudity | None | |
| Gambling or simulated gambling | None | |
| Contests | None | |
| Unrestricted web access | No | Phi does not browse the web. |
| User-generated content | Yes | Users upload materials, and the content stays private to each user. Nothing is shared with other users. [UNCERTAIN] Confirm how this question applies to private, single-user content. |
| Messaging or chat | [UNCERTAIN] | The only chat is with the AI tutor. There is no user-to-user messaging. Answer according to the wording of the question. |
| Age assurance and regional questions | [UNCERTAIN] | Some U.S. states and Apple have introduced age-verification rules for app stores and developers. Check the requirements in force on submission day. |

**Recommended result:** 13+ (conservative). The app is not in the Kids category.

---

## 4. App privacy ("nutrition label") answers

These answers must match `Docs/legal/PRIVACY.md` and `Phi/PrivacyInfo.xcprivacy`.

| Data type | Collected? | Linked to user? | Used to track? | Purpose | Notes |
|---|---|---|---|---|---|
| Contact info (name, email, phone, address) | No | n/a | No | n/a | No sign-up fields. The support email is outside the app. |
| Health and fitness | No | n/a | No | n/a | |
| Financial info | No | n/a | No | n/a | [UNCERTAIN] No purchases are described. Anthropic bills the user directly. |
| Location | No | n/a | No | n/a | No location permission in `Info.plist`. |
| Sensitive info | No | n/a | No | n/a | [UNCERTAIN] Sensitive information could appear inside user materials. It is covered by "User content" below. Counsel should confirm. |
| Contacts | No | n/a | No | n/a | |
| User content: other user content (materials, extracted text, generated lessons, flashcards, quizzes, grades, chat messages) | Yes | Yes | No | App functionality | Matches `NSPrivacyCollectedDataTypeOtherUserContent`. [UNCERTAIN] Whether a request sent from the device to Anthropic under the user's key counts as "collected." The conservative choice is to declare it. |
| Identifiers: user ID (anonymous account ID) | Yes | Yes | No | App functionality | Matches `NSPrivacyCollectedDataTypeUserID`. |
| Identifiers: device ID | No | n/a | No | n/a | No advertising identifier. |
| Usage data (analytics, product interaction) | No | n/a | No | n/a | No analytics SDK. |
| Diagnostics (crash, performance) | No | n/a | No | n/a | No crash-reporting SDK. [UNCERTAIN] Apple's own crash reports, if a user opts in, are governed by Apple. |
| Purchases | No | n/a | No | n/a | |
| Browsing or search history | No | n/a | No | n/a | |
| Photos or videos, audio, body, surroundings | No | n/a | No | n/a | Read-aloud runs on the device and records nothing. |
| Other data | No | n/a | No | n/a | |

**Data used to track you:** None.
**Data linked to you:** User content, user ID.

---

## 5. AI disclosure note (App Review Guideline 5.1.2(i))

Use this text in the App Review notes, and show the same disclosure in the app before the first AI request. The in-app consent step is not yet built (blocker 2).

> Phi uses a third-party AI service. When a user chooses to use AI features, the app sends the study materials and messages the user selects to Anthropic's API, using an Anthropic API key the user provides. Those requests go directly from the user's device to Anthropic. The operator of Phi does not receive them. Phi stores the user's own materials and the generated results in the user's private account, as described in the Privacy Policy. Before the first request, Phi shows this disclosure and asks for the user's permission. If the user declines, AI features do not run. Anthropic's terms and privacy policy apply to content sent to Anthropic.

[UNCERTAIN] Confirm that this text stays accurate if the chat or the request path changes. Any change to what is sent, or to who receives it, requires updating this note, the policy, and the label.

---

## 6. Required URLs

| Field | Status | Draft source |
|---|---|---|
| Privacy Policy URL (required) | [TO-BE-HOSTED] | `Docs/legal/PRIVACY.md` |
| Support URL (required) | [TO-BE-HOSTED] | `Docs/legal/SUPPORT.md` |
| Terms of Use / EULA (recommended) | [TO-BE-HOSTED] | `Docs/legal/TERMS.md`. If you do not upload custom terms, Apple's standard EULA applies. |
| Marketing URL (optional) | None | [UNCERTAIN] `Docs/README.md` mentions usephi.io. Do not use it for these pages until the operator confirms that it belongs to this app and that the hosted pages cover it. |

---

## 7. App Review information

- **Sign-in required:** No. The app creates an anonymous account automatically. [UNCERTAIN] Confirm the answer in App Store Connect. Anonymous sign-in is not a third-party login, so Sign in with Apple should not be required.
- **Review notes:** AI features need an Anthropic API key. Give the reviewer a key in the App Review notes field, never in the repository. [UNCERTAIN] The operator must decide whether to share a key with Apple and who pays for its use.
- **Backend readiness:** Before review, anonymous sign-in must be enabled and the `ios` schema must be exposed on the Supabase project. `Docs/supabase/rls_audit.md` records that both were off on 2026-07-03. Without them, the reviewer cannot use the app.

---

## 8. Platforms and version

- **Devices:** iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"`). iPad screenshots are required.
- **Minimum OS:** [UNCERTAIN] `IPHONEOS_DEPLOYMENT_TARGET` is 17.0 in the working tree and 26.5 at HEAD. Set the intended value and confirm it before submission.
- **Version / build:** 1.0 / 1 (`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`)
- **Language:** English. [UNCERTAIN] Confirm before submission.

---

## 9. Export compliance

Phi uses HTTPS through the operating system and the Supabase SDK, and does not contain its own cryptography. This likely qualifies for the standard-encryption exemption, which would set `ITSAppUsesNonExemptEncryption` to `NO` in `Info.plist`. The key is not there yet. This draft does not change `Info.plist`. [UNCERTAIN] Confirm the answer with counsel or Apple's export-compliance guidance.

---

## 10. Pre-submission checklist

- [ ] Blockers 1 to 10 in Section 0 are resolved, or the copy and labels are revised to match what ships.
- [ ] Re-run the grep for required-reason APIs (file timestamps, disk space, boot time, active keyboards, UserDefaults) and for network, analytics, and SDK references. The source changed during this draft. `PrivacyInfo.xcprivacy` declares UserDefaults only, as of the last check.
- [ ] Privacy Policy, Terms, and Support pages are hosted, and their URLs are entered in Section 6.
- [ ] A privacy policy link is available inside the app.
- [ ] `Phi/PrivacyInfo.xcprivacy` is in the app bundle. `Phi/` is a filesystem-synchronized group, so it should be included automatically. Confirm in the archive.
- [ ] Xcode's privacy report after archiving has been compared with Section 4. The grep covered only `Phi/`. It did not check the privacy manifests of the supabase-swift package or its transitive dependencies. [UNCERTAIN]
- [ ] The Release build excludes the DEBUG harness.
- [ ] Reviewer key and notes are entered in App Store Connect, not in the repository.
- [ ] The age-rating questionnaire is completed.
- [ ] The name is available.
- [ ] Export-compliance answer is recorded.
