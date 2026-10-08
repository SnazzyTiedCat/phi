> **DRAFT — must be reviewed by a qualified attorney before publishing.**

# Phi Privacy Policy

**Effective date:** 2026-10-08
**Applies to:** the Phi app for iPhone and iPad (bundle ID `com.MichaelLargentJr.PhiIos`), version 1.0.
**Operator:** Michael Largent Jr, an individual developer. [ADDRESS]
**Contact:** michaellargentjr@gmail.com

> **Drafting note (delete before publishing).** This policy describes Phi 1.0 as designed. The working tree on 2026-10-08 contains the building blocks for the features below (on-device PDF and text extraction, Keychain storage for the Anthropic key, a direct Anthropic client, on-device speech, and the data models). None of them is wired to the UI yet. Nothing in the source uploads files, writes to the database, calls Anthropic from a screen, shows the AI consent step, links to this policy from inside the app, or deletes data. The "Delete my data" control is planned. Check this policy against the build that is actually submitted. The blocker list is in `Docs/appstore/METADATA.md`, Section 0.

## The short version

- Phi has no sign-up. On first launch it creates an anonymous account for you. We do not ask for your name, email address, or phone number.
- The study materials you import, the text extracted from them, and the lessons, flashcards, quizzes, grades, and chat messages Phi generates are stored in our Supabase project. Each account's data is isolated from every other account's.
- Phi uses your own Anthropic API key. The key stays in your device's Keychain. We never receive it. When Phi generates AI content, your device sends your materials and messages directly to Anthropic.
- Phi has no analytics, advertising, or tracking SDKs. We do not track you across apps or websites.
- You can ask us to delete your data. An in-app "Delete my data" control is planned but not yet available. Until it ships, use the steps in Section 8.

## 1. What we collect and where it goes

| Data | What it is | Where it is stored | Why |
|---|---|---|---|
| Anonymous account ID | A random identifier that Supabase Auth creates on first launch. It is not tied to a name, email address, or phone number. | Supabase (our database). The app's session is kept in the iOS Keychain on your device. | To keep your data separate from other people's data. |
| Study materials you import | Text, PDF, or Markdown files you choose to upload | Supabase Storage, in a private bucket that only your account can access | To build lessons from your materials |
| Extracted text | Text taken from your materials | Supabase Postgres database | To generate lessons, flashcards, and quizzes |
| AI-generated content | Lessons, flashcards, quizzes, short-answer grades, and chat messages | Supabase Postgres database | To show your study content and keep your chat history for each lesson |
| Your Anthropic API key | The key you obtain from Anthropic | iOS Keychain on your device only | To let your device call Anthropic for you. It is never sent to us. |
| Read-aloud | Spoken playback of lesson text | Generated on your device by Apple's speech system. Nothing is sent anywhere. | To read lessons aloud |

**What we do not collect.** We do not collect your name, email address, phone number, location, contacts, photos, camera or microphone input, purchase history, or advertising identifier. The iOS app does not request access to any of these.

**Technical data.** Our hosting provider, Supabase, processes technical information such as IP addresses and request logs to deliver its service. [UNCERTAIN] The retention period for these logs and Supabase's exact role under its data processing terms need to be confirmed against Supabase's current terms.

## 2. How we use your data

- To provide Phi's features: importing materials, generating lessons, flashcards, and quizzes, grading short answers, and saving your chat history.
- To keep your account working, protect the service, and fix bugs.
- We do not sell your data, use it for targeted advertising, or use it to build profiles. [UNCERTAIN] Confirm that the operator will not use study content to train any model. Anthropic's use of content sent through its API is governed by Anthropic's terms, not by this policy.

## 3. Who receives your data

- **Supabase** hosts our database, file storage, and sign-in service. It processes data on our behalf. [UNCERTAIN] The region where the Supabase project is hosted has not been confirmed, and it must be stated here once it is.
- **Anthropic**, only when you use your own key. Requests go directly from your device to Anthropic's API. We do not receive or see those requests. The materials and results that a request is built from are stored in your account, as described in Section 1. Anthropic's terms and privacy policy govern what Anthropic does with the content it receives. [UNCERTAIN] Anthropic's current retention period for API inputs and outputs must be checked before publication, because this policy should not state a period that Anthropic does not apply.
- **Apple** distributes the app. Apple processes downloads, and any diagnostic data you choose to share with Apple, under Apple's own privacy policy.
- We disclose data to others only when required by law or to protect the rights and safety of users.

Phi is not affiliated with Anthropic, Apple, or Supabase.

## 4. AI features and your permission

Before Phi sends your materials or messages to Anthropic for the first time, Phi will show you what will be sent and ask for your permission. If you decline, AI features do not run.

[UNCERTAIN] This consent step is required by App Review Guideline 5.1.2(i) for sharing personal data with third-party AI. It is not built in the current source and must ship before submission.

AI output can be wrong. See the Terms of Use.

## 5. How long we keep your data

- We keep your data until you delete it, or until we delete your account.
- [UNCERTAIN] Supabase backups may keep copies of data for a period after deletion. The backup retention period must be confirmed and stated here.
- Anthropic keeps content under its own terms. You can review those terms through your Anthropic account.
- Items in the iOS Keychain (the sign-in session and your Anthropic key) may remain on your device after you delete the app. Delete your data in the app first, or revoke your Anthropic key in your Anthropic account. [UNCERTAIN] Keychain behavior on uninstall must be confirmed on a device before this sentence is published.

## 6. Security

- Data travels over encrypted connections (HTTPS).
- Row-level security in our database ensures that each account can read and change only its own rows. Storage files are in a private bucket that is restricted the same way.
- Your Anthropic key is stored in the iOS Keychain.
- No system is perfectly secure. If we learn of a breach affecting your data, we will notify you as required by law.

## 7. Children and students

Phi is designed for high-school and college students. It is not directed to children under 13, and children under 13 should not use it. If we learn that we have collected personal information from a child under 13, we will delete it. A parent or guardian who believes a child has provided information to us can contact us at the address above.

[UNCERTAIN] This section does not resolve several open questions. These include COPPA obligations if children under 13 use the app, the age of digital consent under GDPR Article 8 (which varies by EU member state and may be 13 to 16), any parental-consent rules that apply to users aged 13 to 17, and whether schools that provide Phi to students create additional obligations. Counsel must review this section.

## 8. Your choices and rights

- **Delete your data.** An in-app "Delete my data" control is planned and is not yet available. Until it ships, email us with the subject line "Data deletion request." We will delete your rows and stored files and confirm when it is done. [UNCERTAIN] Because accounts are anonymous, we cannot locate your data from an email address alone. The app does not currently show your anonymous account ID to you, so the verification process for deletion requests still needs to be defined.
- **Access or a copy.** Email us to request a copy of your data. [UNCERTAIN] The export format and timeline are not yet defined.
- **Correction, restriction, or objection.** Email us.
- **AI permission.** You can stop AI features at any time by not using them or by revoking your Anthropic key.
- **Additional rights.** Depending on where you live (for example, the EEA or UK under GDPR, or California under the CCPA/CPRA), you may have additional rights. We will respond within the time the law requires. [UNCERTAIN] Response deadlines and the legal basis for processing in each jurisdiction must be confirmed by counsel.

## 9. International transfers

Supabase and Anthropic may process data in countries other than the one you live in. [UNCERTAIN] The transfer mechanisms that apply (such as standard contractual clauses or the EU-U.S. Data Privacy Framework) depend on the providers' current terms and on counsel's advice.

## 10. Changes to this policy

We will post any changes with a new effective date. For material changes, we will tell you in the app before they take effect. [UNCERTAIN] The in-app notice mechanism is not built.

## 11. Contact

Michael Largent Jr
michaellargentjr@gmail.com
[ADDRESS]

[UNCERTAIN] Whether a physical business address must be published depends on the jurisdictions where Phi is distributed. For example, EU trader rules and some state laws may require one. This is an open issue for counsel.
