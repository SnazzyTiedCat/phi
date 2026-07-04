# Project Structure

**The rule:** inside `Phi/`, every folder is a *layer* (what kind of code it is). Subfolders inside a layer group by *topic* (e.g. `Views/Dashboard/`). One convention, no exceptions.

```
Phi/                    ← the iOS app target (filesystem-synchronized: folders ON DISK are the Xcode groups)
  PhiApp.swift          ← app entry point — the only Swift file allowed at this level
  Info.plist            ← pinned here by a pbxproj build exception; do not move
  Views/                ← SwiftUI views, grouped by screen/topic (Dashboard/, Settings/, Tutoring/, Onboarding/)
  Stores/               ← observable app state (@Observable objects that own truth: identity, materials, onboarding flag)
  Models/               ← plain data types with no behavior beyond themselves
  Services/             ← talking to the outside world (Supabase client + its verification harness)
  AI/                   ← the tutoring brain: prompt logic, no UI
    Personas/           ←   who the AI is (system-prompt personalities)
    Prompting/          ←   how prompts are assembled + guardrails
    Recall/             ←   flashcard/quiz generation shapes and prompts
    Testing/            ←   adversarial/verification test docs for the above
  DesignSystem/         ← brand primitives every screen uses: Colors, Typography, SpadeMark (♠)

Web/                    ← the marketing/web app — untouchable from iOS work
Docs/                   ← cross-cutting docs (Supabase contracts, RLS audit, recall shapes)
Tools/                  ← dev-only scripts, not compiled into the app (recall-prompt.swift)
Config/                 ← Secrets.xcconfig (gitignored; see .example)
DESIGN.md               ← the design-token / visual spec
WALKTHROUGH.md          ← plain-English tour of the whole codebase
```

## Where does a new file go?

| You're adding a… | It goes in |
|---|---|
| Screen or view | `Phi/Views/<Topic>/` (new topic folder if it's a new screen area) |
| Observable state object | `Phi/Stores/` |
| Plain data type | `Phi/Models/` |
| Network/persistence client | `Phi/Services/` |
| Prompt, persona, or AI logic | `Phi/AI/<Personas|Prompting|Recall>/` |
| Color, font, or brand element | `Phi/DesignSystem/` |
| Dev script (not shipped) | `Tools/` |
| Documentation | `Docs/` (or the relevant `*.md` at root) |

If a file could go two places, pick by *what it is*, not what it's for: a SwiftUI view about AI still goes in `Views/`, not `AI/`.

## Why this convention

The code was already ~75% type/layer folders; finishing that beat converting everything to feature folders (`Features/Dashboard/…`) at this size (~25 Swift files, 5 screens). Revisit feature folders if the app passes ~15–20 screens — at that point "what does the app do?" becomes the better index than "what kind of file is this?".

## Mechanics worth knowing

- The Xcode project uses **filesystem-synchronized groups** (`objectVersion 77`): moving a file on disk *is* the project edit. No pbxproj surgery, and a moved file cannot silently fall out of the target.
- Move files with `git mv` (or plain `mv` + `git add`) so `git log --follow` keeps per-file history.
