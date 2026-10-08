# Design system: iOS

Scope: the native SwiftUI app, code in `Phi/DesignSystem/`. This spec governs the app. `Docs/DESIGN.md` stays the web-era spec for the marketing site. Where the two disagree, this file wins for iOS: the background is #0A0A0A, not #080808, and the gold is #C9A84C, not #d4a74a.

The decisions came from two design-reference repos, VoltAgent/awesome-design-md and leonxlnx/taste-skill. The reasons below are ours.

## Decisions

1. **Off-black background, #0A0A0A.** Pure black leaves no room for the surface steps to read against it. Off-black keeps all three steps distinct.
2. **Elevation from surface steps and hairlines. No drop shadows.** Shadows disappear on near-black. A one-step surface change and a 10% white hairline give the same depth without muddying the background.
3. **One accent, gold #C9A84C, reserved.** Gold marks the primary action, the ♠ mark, and the focus ring, and nothing else. A single reserved accent makes the primary action easy to find on every screen.
4. **Glass only for floating chrome.** Material blurs what sits behind it. Behind scrolling content it turns text into noise. Under Reduce Transparency it becomes an opaque #222222 surface.
5. **One continuous-curve system: 12, 20, 14.** Continuous corners match the system shapes on iOS. Buttons use 14 and never a pill. A pill reads more like a tag than an action.
6. **Space Mono everywhere, with SF Pro as a user choice.** The brand is one typeface. The SF Pro option stays for reading preference. Both faces share role sizes, so switching faces does not reflow layout.
7. **Dynamic Type through text styles.** Each role maps to a system text style and scales with the user's setting. Fixed point sizes ignore that setting, which is an accessibility failure.
8. **Springs only.** Entrance uses response 0.6 and damping 0.86. Press uses response 0.25 and damping 0.8. Springs settle the way physical objects do. Linear easing reads as mechanical. The entrance plays once per appearance.
9. **Press feedback is scale 0.98 only.** A larger scale reads as a toy. 0.98 confirms the touch without moving the layout.
10. **Reduce Motion drops scale and offset. Opacity stays.** Opacity changes do not trigger vestibular discomfort, so they remain as the only motion.
11. **SF Symbols, medium weight, monochrome.** Symbols match the system. One icon family keeps stroke weights consistent across screens.
12. **Haptics are rare.** A light tap, a selection tick, success, and error. Each marks a deliberate action. One haptic per list row would be noise.
13. **Empty states explain the next step.** "No data" tells the user nothing about how to fill the space.

## Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `phiBackground` (`c950`) | #0A0A0A | App background |
| `phiSurface` (`c900`) | #111111 | Lowest surface step |
| `phiSurfaceRaised` (`c850`) | #1A1A1A | Cards (`phiCard()`) |
| `phiSurfaceHigh` (`c800`) | #222222 | Floating chrome fallback |
| `c700` | #333333 | Legacy alias. No new use |
| `c600` | #555555 | Legacy alias. No new use |
| `phiHairline` | white, 10% | Strokes and dividers |
| `phiTextPrimary` | #F2F2F2 | Headings, body, button labels |
| `phiTextSecondary` (`c400`) | #999999 | Supporting text |
| `phiTextTertiary` (`c500`) | #777777 | Icons and large text only |
| `phiSuccess` | #4ADE80 | Success |
| `phiWarning` | #FBBF24 | Warning |
| `phiError` | #F87171 | Error |
| `phiGold` | #C9A84C | Primary action, ♠ mark, focus ring |

Contrast, computed against #0A0A0A: primary text about 18:1, secondary about 7:1, gold about 8.7:1. Tertiary is about 4.4:1, below the 4.5:1 AA threshold for body text, so keep it to icons and text at 18pt and up.

### Radius

| Token | Value | Use |
|---|---|---|
| `PhiRadius.chip` | 12 | Chips and tags |
| `PhiRadius.card` | 20 | Cards and floating chrome |
| `PhiRadius.button` | 14 | Buttons |

### Spacing (4pt base)

| Token | Value |
|---|---|
| `PhiSpacing.xs` | 4 |
| `PhiSpacing.sm` | 8 |
| `PhiSpacing.md` | 12 |
| `PhiSpacing.lg` | 16 |
| `PhiSpacing.xl` | 24 |
| `PhiSpacing.xxl` | 32 |


### Motion

| Token | Value |
|---|---|
| `PhiMotion.entrance` | spring, response 0.6, damping 0.86 |
| `PhiMotion.press` | spring, response 0.25, damping 0.8 |
| `PhiMotion.travel` | 24pt vertical rise on entrance |

### Type roles

| Role | Size | Weight | Scales with | Notes |
|---|---|---|---|---|
| `.display` | 34 | bold | Large Title | |
| `.title` (`.h1` alias) | 22 | bold | Title 2 | |
| `.headline` | 17 | bold | Headline | Button labels |
| `.body` | 15 | regular | Subheadline | |
| `.lesson` | 17 | regular | Body | Line spacing 6. Measure about 60 characters. Use `phiLesson()` |
| `.caption` | 12 | regular | Caption 1 | |
| `.label` | 11 | bold | Caption 2 | Uppercase, tracking 1.2pt. Tracking needs `Text.phiTracking(_:)` |

## Components

- `phiCard()`: raised surface, 20pt continuous corners, hairline.
- `phiFloatingChrome(cornerRadius:)`: thin material, hairline, opaque fallback. Floating chrome only.
- `phiEntrance(delay:)`: fade and rise once per appearance.
- `PhiPrimaryButtonStyle`: gold fill, #0A0A0A label, 50pt minimum height, full width. One per screen.
- `PhiSecondaryButtonStyle`: hairline stroke, primary text, 50pt minimum height, full width.
- `PhiGhostButtonStyle`: text only, 44pt minimum height. For the least important action.
- `PhiHaptics.tap()`, `.selection()`, `.success()`, `.error()`.
- `PhiEmptyState(symbol:title:message:actionLabel:action:)`.

## Copy rules

- Sentence case. "Start a lesson", not "Start A Lesson".
- No emoji.
- No exclamation marks.
- No em dashes in in-app text.
- Button labels are one to three words, and begin with a verb where one fits.
- Empty states say what belongs in the space and the next step. Never "No data", never a bare "Nothing here".
- Labels are uppercase by role. Write them in sentence case in code. `phiFont(.label)` uppercases them.

## Revisit after on-device testing

- **Space Mono at lesson length.** Check 17pt monospace with 6pt line spacing across multi-paragraph lessons. If it tires the eye, consider SF Pro as the lesson default.
- **The 14pt button radius.** Check it against the 20pt cards and 12pt chips at phone size. If it reads as a different family, move it to 12 or 16.
- **Press scale 0.98.** Check it is visible on the 50pt primary button and does not distract.
- **Thin material over lesson content.** Check legibility of floating chrome over real text. The floating bar is the only place this applies.
- **Hairline at 10% on the lowest surface step.** Check it is visible on OLED at low brightness.
- **Tertiary text.** Confirm no text below 18pt uses `phiTextTertiary`.

## Not in this pass

- `SpadeMark` still defaults to white. Gold on the mark is a follow-up.
- The focus ring is specified as gold but not built. It needs a keyboard-focus surface.
