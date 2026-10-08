# Project Structure

**The rule:** inside `Phi/`, every folder is a *layer* (what kind of code it is). Subfolders inside a layer group by *topic* (e.g. `Views/Dashboard/`). One convention, no exceptions.

```
Phi/                    ← the iOS app target (filesystem-synchronized: folders ON DISK are the Xcode groups)
  PhiApp.swift          ← app entry point — the only Swift file allowed at this level
  Info.plist            ← pinned here by a pbxproj build exception; do not move
  PrivacyInfo.xcprivacy ← Apple privacy manifest (required-reason APIs, data types)
  Views/                ← SwiftUI views, grouped by screen/topic (Dashboard/, Settings/, Tutoring/, Recall/, Lesson/)
  Stores/               ← observable app state (@Observable objects that own truth: identity, materials, lessons,
                          tutor chat, recall, consent)
  Models/               ← plain data types with no behavior beyond themselves (Material, Lesson, ChatMessage, ContentHash)
  Services/             ← talking to the outside world
    Repositories/       ←   Supabase table and Storage access (one file per table)
    Anthropic/          ←   the Messages API client, its configuration, and the lesson/tutor/recall implementations
    Speech/             ←   on-device read-aloud with word tracking
    KeychainStore.swift ←   secure storage for the user's API key
    MaterialExtraction.swift ← turns a picked file into plain text
    SupabaseClient.swift     ← the one configured Supabase client
  AI/                   ← the tutoring brain: prompt logic and response shapes, no networking
    Personas/           ←   who the AI is (system-prompt personalities)
    Prompting/          ←   how prompts are assembled + guardrails
    Lessons/            ←   lesson prompts, JSON parser, and the generator seam
    Tutor/              ←   the chat seam (streamed tutor replies)
    Recall/             ←   flashcard/quiz generation shapes, prompts, and the generator seam
    Previews/           ←   DEBUG-only sample data and mocks for previews
    Testing/            ←   adversarial/verification test docs for the above
  DesignSystem/         ← brand primitives every screen uses: colors, type, metrics, motion, surfaces, buttons, haptics

Web/                    ← the marketing/web app — untouchable from iOS work
Docs/                   ← cross-cutting docs: Supabase contracts and SQL, legal drafts, App Store metadata, design spec
Tools/                  ← dev-only scripts, not compiled into the app (recall-prompt.swift)
Config/                 ← Secrets.xcconfig (gitignored; see .example)
DESIGN.md               ← the web-era design token spec (see Docs/DESIGN-IOS.md for the iOS decisions)
WALKTHROUGH.md          ← plain-English tour of the whole codebase
```

## Where does a new file go?

| You're adding a… | It goes in |
|---|---|
| Screen or view | `Phi/Views/<Topic>/` (new topic folder if it's a new screen area) |
| Observable state object | `Phi/Stores/` |
| Plain data type | `Phi/Models/` |
| Supabase table or Storage access | `Phi/Services/Repositories/` |
| Anthropic API call | `Phi/Services/Anthropic/` |
| Prompt, persona, or AI logic | `Phi/AI/<Personas\|Prompting\|Lessons\|Tutor\|Recall>/` |
| Preview-only sample data | `Phi/AI/Previews/` (inside `#if DEBUG`) |
| Color, font, or brand element | `Phi/DesignSystem/` |
| Dev script (not shipped) | `Tools/` |
| Documentation | `Docs/` (or the relevant `*.md` at root) |

If a file could go two places, pick by *what it is*, not what it's for: a SwiftUI view about AI still goes in `Views/`, not `AI/`.

## Why this convention

The code was already ~75% type/layer folders; finishing that beat converting everything to feature folders (`Features/Dashboard/…`) at this size. Revisit feature folders if the app passes ~15–20 screens — at that point "what does the app do?" becomes the better index than "what kind of file is this?".

## Mechanics worth knowing

- The Xcode project uses **filesystem-synchronized groups** (`objectVersion 77`): moving a file on disk *is* the project edit. No pbxproj surgery, and a moved file cannot silently fall out of the target.
- Move files with `git mv` (or plain `mv` + `git add`) so `git log --follow` keeps per-file history.
- Secrets never live in the repo. The Supabase anon key comes from `Config/Secrets.xcconfig`; the user's Anthropic key lives in the Keychain on their device.
