# The Spades Company — Product Design & UX Specification
**Version 1.1**
Last updated: June 2026
Scope: iOS applications, watchOS applications, and web applications
Companion document: `DESIGN.md` (website/marketing)

---

## Table of Contents

1. [Overview & Scope](#1-overview--scope)
2. [Design Tokens](#2-design-tokens)
3. [iOS Design Principles](#3-ios-design-principles)
4. [Web App Design Principles](#4-web-app-design-principles)
5. [Cross-App Consistency](#5-cross-app-consistency)
6. [Navigation Patterns](#6-navigation-patterns)
7. [Onboarding System](#7-onboarding-system)
8. [Subscription & Paywall UI](#8-subscription--paywall-ui)
9. [AI Processing States](#9-ai-processing-states)
10. [Component Library — Apps](#10-component-library--apps)
11. [Haptic Feedback — iOS](#11-haptic-feedback--ios)
12. [Dynamic Island Integration](#12-dynamic-island-integration)
13. [Widgets & Extensions](#13-widgets--extensions)
14. [App Icons](#14-app-icons)
15. [Per-Product Specification Guide](#15-per-product-specification-guide)
16. [Suits Subscription Scope](#16-suits-subscription-scope)
17. [Accessibility Standards](#17-accessibility-standards)
18. [Performance Targets](#18-performance-targets)
19. [Assumptions & Open Questions](#19-assumptions--open-questions)

---

## 1. Overview & Scope

### What This Document Covers

This document governs all design and UX decisions for Spades Company **products** — the actual applications users run on their devices. It is distinct from `DESIGN.md`, which governs the marketing website.

Platforms in scope:
- iOS applications (primary platform)
- watchOS applications (companion to iOS apps, where applicable)
- Web applications (secondary, where applicable)

Each individual product has its own specification document or appendix section (see §15 for the template). This document defines the **shared system** — the rules every product inherits regardless of what it does.

### The Product Standard

Every Spades Company product must pass three gates before shipping:

1. **Does it earn its place?** It exists because nothing else does what it does, the way it does it. Not an improvement on an existing app — a replacement for a manual, expensive, or broken workflow.
2. **Does the design carry the AI?** The AI is the core feature. The design's job is to make it feel inevitable, not technical.
3. **Would it embarrass the brand if it shipped as-is?** The answer must be no.

### Relationship to Website Design System

All visual tokens from `DESIGN.md` apply here. Products share the same color system, typeface, spacing, radius, glass, shadow, and animation principles. Where platform constraints require adaptation, this document defines the adaptation — it does not grant permission to depart from the brand.

---

## 2. Design Tokens

Products inherit the full token set from `DESIGN.md §2`. The following additions are app-specific.

### 2.1 Additional Spacing — Touch & Mobile

```
--sp-safe-top:    env(safe-area-inset-top)
--sp-safe-bottom: env(safe-area-inset-bottom)
--sp-safe-left:   env(safe-area-inset-left)
--sp-safe-right:  env(safe-area-inset-right)
```

All scrollable content and fixed bottom elements must respect safe area insets.

### 2.2 Touch Target Minimum

```
--touch-min:         44px   /* Apple HIG minimum — all interactive elements */
--touch-comfortable: 52px   /* Preferred for primary actions */
```

### 2.3 iOS Animation — SwiftUI Equivalents

Web uses CSS cubic-bezier. iOS uses SwiftUI spring physics. The **feel** must match across platforms — the implementation differs.

| Web Token | SwiftUI Equivalent | Use |
|---|---|---|
| `--ease-expo` | `.spring(response: 0.55, dampingFraction: 0.85)` | Standard enters, reveals |
| `--ease-spring` | `.spring(response: 0.45, dampingFraction: 0.65)` | Touch responses, overshoot |
| `--ease-refined` | `.easeInOut(duration: 0.28)` | All exits |
| `--dur-film` | `.spring(response: 0.65, dampingFraction: 0.85)` | Section/screen reveals |
| `--dur-reveal` | `.spring(response: 0.9, dampingFraction: 0.82)` | Full-screen transitions |

In SwiftUI, prefer `.matchedGeometryEffect` for shared-element transitions between screens.

### 2.4 Z-Index / Layer Order (Web Apps)

```
--z-base:       0     /* Static content */
--z-elevated:   10    /* Cards on hover */
--z-sticky:     20    /* Sticky headers */
--z-overlay:    30    /* Dimmed backdrops */
--z-modal:      40    /* Modals, sheets */
--z-nav:        50    /* Navigation bar (always on top) */
--z-toast:      60    /* Toast notifications */
```

---

## 3. iOS Design Principles

### 3.1 HIG Compliance With Brand Override

Apple's Human Interface Guidelines define the baseline. Where the brand has an opinion that differs from HIG defaults, the brand wins — provided it does not harm usability or violate App Store Review Guidelines.

**Brand overrides HIG:**
- Custom typeface (Space Mono) instead of SF Pro
- Custom navigation bars — not `UINavigationBar`
- Custom tab bar (glass, bottom-anchored) instead of `UITabBar`
- Always dark — no light mode adaptation
- Custom button styles — not `UIButton` system styles

**HIG overrides brand:**
- Safe area insets — always respected
- Minimum touch targets — 44px maintained
- Standard system gestures (swipe back, pull to refresh) — preserved
- Accessibility features (Dynamic Type, VoiceOver) — supported
- System alerts (permission requests, App Store prompts) — use system UI

### 3.2 Typography on iOS

Space Mono is loaded as a custom font resource in every app. It is used for all text within the app UI.

**Exception:** System-presented UI that cannot be customized (UIAlertController, system keyboards, ShareSheet) will render in SF Pro. This is acceptable — it marks the boundary between the app and the OS.

**Dynamic Type:** Space Mono does not scale with Dynamic Type by default. We support it by providing size adjustments at the `accessibilityLarge` breakpoint and above:
- Body: 14px to 17px
- Caption: 12px to 15px
- All others: +3px at accessibility sizes

### 3.3 Status Bar

```
UIStatusBarStyle: .lightContent
```

White status bar text on all dark backgrounds. Never `.darkContent`.

### 3.4 Keyboard Handling

- All scroll views adjust for keyboard using `scrollDismissesKeyboard(.interactively)`
- No content ever hides behind the keyboard
- Inputs scroll into view automatically when focused
- Custom input toolbar defined per-product where relevant (above keyboard)

### 3.5 Gesture System

Every gesture must feel intentional and discoverable.

| Gesture | Action |
|---|---|
| Swipe left from edge | Back navigation (preserved from iOS default) |
| Swipe down | Dismiss modal or sheet |
| Long press | Context menu (when applicable) |
| Pinch | Zoom on data visualizations and spatial views |
| Double-tap | Zoom to fit / reset zoom on a visualization |
| Drag | Selection within data views; reordering in lists |

No gesture conflicts. If two gestures would compete on the same surface, redesign the surface.

---

## 4. Web App Design Principles

### 4.1 Scope

Web apps differ from the marketing site. They are **tools** — the user is logged in, has context, and expects density and functionality over cinematic presentation.

### 4.2 Density

Web apps are moderately denser than the marketing site:
- Tighter line height for data (1.4 vs 1.65)
- Minimum font size in data-dense contexts: 12px
- More elements per viewport permitted
- Spacing tokens shift down one step in dense views (use `--sp-2` where the website uses `--sp-4`)

### 4.3 Authentication States

Every web app has three states:
1. **Unauthenticated** — minimal chrome, sign-in focused
2. **Authenticated, no data** — empty state, onboarding prompt
3. **Authenticated, with data** — primary app experience

Each state has distinct layout chrome. Navigation changes between states.

### 4.4 Navigation on Web Apps

Web apps use a **persistent left sidebar** on desktop (not the floating pill of the marketing site):
- Width: 240px
- Background: `--c-900`
- Border-right: `1px solid --c-850`
- Always visible on desktop; slide-out drawer on mobile

Sidebar structure:
```
♠ [App Name]         <- top, brand anchor

[Primary Nav Items]

[Spacer — flex: 1]

[Settings]
[Account]            <- bottom
```

On mobile (< 768px): sidebar collapses. A top-left icon reveals it as a full-height drawer over content.

---

## 5. Cross-App Consistency

Every Spades Company product must feel like it belongs to the same family. This is enforced through shared systems, not matching feature sets.

### 5.1 The Shared Signature

Regardless of what the app does, the following are constant across every product:

- Space Mono throughout
- `--c-950` background
- Slow cinematic animation (same spring values)
- ♠ mark as the app icon primary element
- Suits as the subscription surface (RevenueCat)
- Same onboarding structure (§7)
- Same paywall design (§8)
- Same processing state patterns (§9)
- Same component library (§10)

### 5.2 The Allowed Variation

Products may differ on:
- Feature set and primary UI
- Core UX metaphor (visualization type, interaction model, primary action)
- Secondary icon element in the app icon (the ♠ base is constant)
- Product-specific copy and taglines

### 5.3 What Makes a New App Feel "Spades"

A user encountering an unfamiliar Spades Company app should recognize the brand within 3 seconds — not from a label, but from the feel:
- The font is Space Mono
- The background is near-black
- Everything moves slowly and settles with spring physics
- The UI recedes — it never competes with the task
- The loading screen involves a super simple centered view of a ♠ icon with a progress bar filling in below it that takes up minimal horizontal space.

---

## 6. Navigation Patterns

### 6.1 iOS Navigation

**Stack navigation (drill-down):**
```swift
NavigationStack
Transition: .navigationTransition(.slide) with spring
Back gesture: system swipe-left-from-edge preserved
Back button: custom (chevron.left, Space Mono label)
```

**Modal / Sheet navigation (contextual tasks):**
```swift
.sheet() or .fullScreenCover()
Presentation: slide up from bottom, spring
Dismiss: swipe down, or explicit close button (top-right x)
.fullScreenCover: immersive single-task flows
.sheet: settings, filters, output and export options
```

**Custom Tab Bar (multi-section apps):**

Not all products require a tab bar. Single-workflow apps must not show one. When a tab bar is appropriate:
```
Position:    bottom, above safe area
Height:      56pt + safe area inset
Background:  Glass Standard
Border-top:  1pt solid var(--g-std-border)
Items:       3 to 5 maximum

Active item:   icon + label, --c-white
Inactive item: icon only (label hidden), --c-500
Transition:    spring, 300ms
```

### 6.2 In-App Navigation Header

Custom navigation header replaces `UINavigationBar`:

```
Height:     44pt + safe area top
Background: transparent at top of scroll
            --c-900 when scrolled (crossfade at ~40pt)
Left:       Back button (in stack) or ♠ mark (at root)
Center:     Screen title — Title size, Bold
Right:      Context action: settings, share, or nothing

Large title behavior:
  Before 40pt scroll: large title below header, H1 size
  After 40pt scroll:  title migrates into header center, Title size
  Transition: opacity + translateY, 200ms, ease-expo
```

### 6.3 watchOS Navigation

watchOS products follow a simplified navigation model:

- Single-page or minimal stack — no deep drill-downs
- Primary action occupies the majority of the watch face
- Digital Crown used for scrolling and value adjustment
- Complications link directly to the primary action screen
- Tab bar is not used — the surface is too small

---

## 7. Onboarding System

Every Spades Company app uses the same onboarding architecture. Content changes per product; the structure does not.

### 7.1 Structure

```
Screen 1:   Arrival
Screen 2-3: Value Proposition (2 screens maximum)
Screen 4:   Permission Request(s)
Screen 5:   Paywall / Trial Offer
-> App
```

### 7.2 Screen 1 — Arrival

**Purpose:** Brand recognition. Confirm the user is in the right place.

**Layout:** Full screen, centered.
```
[♠ mark — slow fade in, 900ms]
[App name — H1, Fade Lift 200ms after mark]
[One-line tagline — Body, --c-400, Fade Lift 400ms after name]

[Continue ->] — primary button, above safe area, bottom of screen
```

No explanatory copy on this screen. The mark and name are the statement. The tagline is the product's compressed headline (see `DESIGN.md §4.4` for the formula).

### 7.3 Screens 2–3 — Value Proposition

**Maximum 2 screens.** If the app requires more than 2 screens to communicate its value, either the scope is too broad or the copy is under-edited.

**Layout per screen:**
```
[Large visual — top 55% of screen]
  UI preview, abstract representation, or illustration.
  No photography. No stock imagery.

[Feature name — Label, uppercase, --c-500]
[Headline — H2]
[Description — Body, --c-400, 2 lines maximum]
[Progress dots — bottom center, --c-700 inactive / --c-white active]
[Continue ->]
```

**Transition between screens:**
- Current screen slides left; incoming from right
- `translateX(-100%) to 0`, spring physics
- Active progress dot expands (4pt to 20pt width), spring

### 7.4 Screen 4 — Permission Requests

Permissions are requested one at a time. Never batch multiple permissions onto one screen.

**Layout:**
```
[SF Symbol representing the permission — 52pt, --c-white]
[Permission name — H2]
[Why this is needed — Body, --c-400, specific and honest]
[Allow Access ->] — primary button (triggers system dialog)
[Not now] — ghost button below primary
```

**Copy rules:**
- Name the specific feature that requires this permission
- Never use filler like "to give you the best experience"
- Be direct: state what the permission enables and what is never accessed without it

**Post-request handling:**

| User choice | Response |
|---|---|
| Granted | Continue to next screen |
| Denied | Calm explanation + "Open Settings" option — no guilt |
| "Not now" | Skip — grantable later from in-app Settings |

### 7.5 Screen 5 — Paywall

See §8 for the full paywall specification. In onboarding context, the paywall is dismissible via "Maybe later" — this option is de-emphasized but always present.

---

## 8. Subscription & Paywall UI

Suits subscriptions are managed via RevenueCat. All Spades Company apps share a single subscription group.

### 8.1 When the Paywall Appears

- End of onboarding (Screen 5)
- When a locked feature is accessed while unsubscribed
- From Settings -> Subscription

**Presentation:** Full-screen modal (`.fullScreenCover`). Background: `--c-950` with atmospheric orb. Always dismissible; during onboarding, "Maybe later" is the escape — not an X button.

### 8.2 Paywall Layout

```
[Top — ~30% of screen]
  ♠
  [App name] via Suits
  "Everything we make. One subscription."

[Middle — ~40% of screen]
  Feature list:
    [checkmark]  [This app] — full access
    [checkmark]  All future Spades Company apps
    [checkmark]  Priority processing
    [checkmark]  [One product-specific premium differentiator]

[Bottom — ~30% of screen]
  [$X.XX / month]       [$XX.XX / year — save X%]
  [Monthly pill]        [Annual pill — highlighted by default]

  [Start Free Trial ->]   <- if trial offered
   OR
  [Subscribe ->]          <- if no trial

  [Restore Purchases]   ghost, 11pt, --c-500
  [Terms . Privacy]     ghost, 10pt, --c-600
```

### 8.3 Pricing Display Rules

- Price shown plainly — no strikethroughs, no "valued at $XXX"
- Annual plan highlighted by default
- Trial copy: state duration and renewal terms. "7-day free trial, then $9.99/month."
- No asterisks. No fine print that contradicts the headline.

### 8.4 Post-Subscribe

```
Confirmation screen:
  [checkmark] — spring entrance, scale 0 to 1, 400ms
  "You're in."
  [Suits is active. Enjoy everything.]
  [Start Using [App] ->]
```

Transition: brief full-screen white flash (50ms) then fade to app. This is the single moment of high contrast in the entire onboarding flow. It is used nowhere else.

### 8.5 Subscription Management

Accessible from: Settings -> Subscription

- Current plan (monthly or annual)
- Next billing date
- [Manage in App Store ->]
- [Restore Purchases]

---

## 9. AI Processing States

Every Spades Company product calls an AI model. Latency is real. This section defines how that latency is handled across all apps — the specific visual representation adapts per product, but the structure is constant.

### 9.1 The Three Phases

```
Phase 1: Upload      — user data leaves the device
Phase 2: Processing  — model runs server-side
Phase 3: Return      — result arrives back on device
```

The user always knows which phase is active. Never combine phases visually or skip indicating one.

### 9.2 Phase 1 — Upload

```
Visual:
  The app's primary data representation shown with a slow
  directional animation suggesting outward movement.
  The motion implies "sending," not "waiting."
  The specific form — gradient sweep, opacity wave, particle
  motion — is defined per-product in its specification (§C).

Progress: Determinate — actual upload percentage
  Fill:          --c-white at 60% opacity
  Track:         --c-800
  Border-radius: --r-pill

Label:    "Uploading..."   (Label, uppercase, --c-500)
          [File info] . [Estimated time remaining]  (Caption, --c-600)

Cancel:   Always available. Ghost button. "Cancel" — 12pt, --c-600.
```

### 9.3 Phase 2 — Processing

No determinate progress — model runtime is variable.

```
Visual:
  The ♠ mark, slow pulse.
  opacity: 0.4 to 1.0 to 0.4  (2.5s, ease-in-out, infinite)
  scale:   0.97 to 1.0 to 0.97 (same timing, paired)

Primary label:
  "[Active verb for what the model is doing]."
  Defined per-product in its specification (§M).
  Body size, --c-400.

Sub-label (appears after 10 seconds):
  A single calm line in brand voice.  (Caption, --c-600)
  Fades in: opacity 0 to 1, 600ms, ease-expo.
  Tone: understated. Signals work, not apology.

Time estimate:
  Shown after first API timing response.
  "About [N] seconds remaining."  (Caption, --c-500)

Cancel: Available throughout. No guilt copy.
```

**What not to show during processing:**
- Fake or stalled progress percentages
- A generic `UIActivityIndicatorView` — the pulsing ♠ is the Spades indicator
- Enthusiastic or performative copy
- Any animation that looks like the app is struggling

### 9.4 Phase 3 — Return

```
Processing state:   Exit Dissolve (opacity 1 to 0, 300ms, ease-refined)
Result view:        Cinematic Reveal (opacity 0 to 1, scale 0.96 to 1, 900ms, ease-expo)
Haptic on arrival:  .notificationOccurred(.success)
```

### 9.5 Error States

| Error | Display |
|---|---|
| Upload failed (network) | Inline error card, retry button, input preserved |
| Model error | Same — never expose internal model errors to the user |
| Timeout | "Taking longer than expected. We'll notify you when it's ready." + background option |
| Oversized input | Validated before upload — shown pre-attempt, not as a post-failure error |

**Error copy rules:**
- Never show error codes or stack traces
- Never say "something went wrong" without a next step
- Specific over vague: describe what failed, not just that it did

### 9.6 Background Processing

For tasks too long to wait for in the foreground:
- Offer a completion notification — request permission in context, not during onboarding
- Dynamic Island shows the active phase (§12)
- Notification copy on completion: "[App name]: [Output description] is ready." — direct, no preamble

---

## 10. Component Library — Apps

### 10.1 Primary Button (iOS)

```swift
background:    Color(hex: "#FFFFFF")
foreground:    Color(hex: "#000000")
font:          Space Mono, Bold, 12pt
letterSpacing: 0.08em
textCase:      .uppercase
cornerRadius:  .capsule
padding:       horizontal 24pt, vertical 14pt
minHeight:     52pt

// Press state
scaleEffect: 0.97 while pressed
animation:   .spring(response: 0.3, dampingFraction: 0.7)
```

### 10.2 Secondary Button (iOS)

```swift
background:    Color.clear
foreground:    Color(hex: "#FFFFFF")
border:        1pt, Color(hex: "#777777")
// All other properties identical to Primary
```

### 10.3 Ghost Button (iOS)

```swift
background:    Color.clear
foreground:    Color(hex: "#777777")
border:        1pt, Color(hex: "#333333")
```

### 10.4 Glass Card (iOS)

```swift
background:    .ultraThinMaterial
               // fallback: Color(hex: "#0E0E0E").opacity(0.9)
border:        1pt, Color.white.opacity(0.10)
cornerRadius:  32pt
shadow:        Color.black.opacity(0.7), radius: 20, y: 8

// Press state
scaleEffect: 0.98 on press, spring settle to 1.0
```

### 10.5 Text Field (iOS)

```swift
background:       Color.white.opacity(0.025)
border:           1pt, Color.white.opacity(0.055)
cornerRadius:     16pt
padding:          12pt horizontal, 14pt vertical
font:             Space Mono, Regular, 14pt
textColor:        Color(hex: "#FFFFFF")
placeholderColor: Color(hex: "#555555")

// Focus state
border:     1pt, Color.white.opacity(0.22)
background: Color.white.opacity(0.055)
```

### 10.6 Section Header (iOS Lists)

```swift
font:          Space Mono, Bold, 10pt
textCase:      .uppercase
letterSpacing: 0.18em
color:         Color(hex: "#555555")
padding:       top 32pt, bottom 8pt, horizontal 16pt
background:    .clear
```

### 10.7 Bottom Sheet (iOS)

Used for: output options, settings panels, contextual actions.

```swift
presentationDetents:       [.medium, .large]
presentationDragIndicator: .visible
  // Custom indicator: 4pt x 36pt, --c-600, cornerRadius 2pt
presentationBackground:    .ultraThinMaterial
  // Fallback: Color(hex: "#111111")
cornerRadius (top corners): 32pt
Content padding:            --sp-6 horizontal, --sp-4 top
```

### 10.8 Toast / In-App Banner

```
Position:     top of screen, below navigation header
Style:        Glass Prominent, --r-xl, --sh-lg
Width:        screen width minus 32pt (16pt each side)
Height:       52pt minimum + content

Left:         SF Symbol, 18pt, --c-white
Center:       title (13pt, Bold) + optional subtitle (11pt, --c-400)
Right:        optional dismiss button

Entrance:     slide down from above, spring
Exit:         slide back up, --dur-fast, ease-refined
Auto-dismiss: 3s success / 6s error / never for warnings
```

### 10.9 Primary Data Visualization

Every product has a primary visual representation of the data it works with. The specific form — waveform, graph, sensor readout, image canvas, map, or otherwise — is defined per-product in its specification. The following rules apply to all implementations:

```
Container:
  background:     --c-900
  border-radius:  --r-xl
  overflow:       hidden

Primary data elements:
  color:           --c-white at 80% opacity
  active/selected: --c-white at 100% opacity

Secondary or uncertain regions:
  color: --c-400
  Use for: model-flagged uncertainty, inactive ranges,
           secondary data channels, background context

Selected region overlay:
  background:     --c-white at 8% opacity
  border-radius:  --r-sm

Interactions (where applicable):
  Pinch to zoom
  Drag to select a region
  Double-tap to reset zoom / fit to container
```

The geometry, update frequency, axis logic, real-time behavior, and Phase 1 upload animation are defined per-product.

---

## 11. Haptic Feedback — iOS

Haptics confirm significant state changes. Used sparingly — not on every tap.

| Event | Haptic Type | UIKit Class |
|---|---|---|
| Core workflow begins | `.impactOccurred(intensity: 0.8)` | `UIImpactFeedbackGenerator(.medium)` |
| Core workflow ends or concludes | `.impactOccurred(intensity: 0.6)` | `UIImpactFeedbackGenerator(.light)` |
| AI processing complete — success | `.notificationOccurred(.success)` | `UINotificationFeedbackGenerator` |
| AI processing complete — error | `.notificationOccurred(.error)` | `UINotificationFeedbackGenerator` |
| Subscription confirmed | `.notificationOccurred(.success)` | `UINotificationFeedbackGenerator` |
| Selection change in a data visualization | `.selectionChanged()` | `UISelectionFeedbackGenerator` |
| Destructive action confirmed | `.impactOccurred(intensity: 1.0)` | `UIImpactFeedbackGenerator(.heavy)` |
| Primary button tap (primary only) | `.impactOccurred(intensity: 0.4)` | `UIImpactFeedbackGenerator(.light)` |

**Never add haptics to:**
- Navigation transitions
- Scrolling
- Every tap indiscriminately
- Toggle switches (system provides these)
- Passive state changes the user did not initiate

---

## 12. Dynamic Island Integration

Supported on: iPhone 14 Pro and later.
Purpose: Surface AI processing status when the app is backgrounded.

### 12.1 Compact State

```
Leading:  ♠ mark, 12pt, --c-white
Trailing: Subtle activity indicator
          3 dots, opacity cycling 0.3 to 1.0 to 0.3, 1.2s infinite
```

### 12.2 Expanded State

```
Header:   [App name]  .  [Active phase label]
Body:     A simplified view of the current processing phase.
          Specific content defined per-product in specification (§L).
Footer:   "Tap to return"  (Caption, --c-400)
```

### 12.3 Completion State

```
Island expands briefly:
  Checkmark pulses in: scale 0 to 1, spring, 400ms
  Text: "[App name]: Ready."
  Auto-collapses after 2 seconds

Paired with: .notificationOccurred(.success) haptic
```

Implementation: `ActivityKit` Live Activities API.

---

## 13. Widgets & Extensions

### 13.1 Home Screen Widget — Small (2x2)

```
Background: --c-950
Content:
  ♠ mark          16pt, top-left
  App name        Label, uppercase, --c-500
  Primary stat    H2, --c-white
```

The primary stat is the single most useful at-a-glance metric for this product. It must be comprehensible in under 1 second without opening the app. Defined per-product in its specification (§K).

### 13.2 Home Screen Widget — Medium (4x2)

```
Left half:   Small widget content
Right half:  Secondary context — recent items, next action,
             or a supporting stat. Defined per-product.
```

### 13.3 Lock Screen Widget

```
Style:   Circular or rectangular
Content: ♠ mark + one number or short status string
Color:   System-adaptive — must read on both light and dark lock screens
         Apply .widgetAccentable to the ♠ mark
```

### 13.4 Control Center Extension (iOS 18+)

A quick-launch button to initiate the app's primary action without opening the app fully. Whether to implement this is decided per-product based on how often the primary action is triggered contextually.

### 13.5 watchOS Complications

For apps with watchOS companions:

```
Graphic Circular:  ♠ mark fills the complication
Graphic Corner:    ♠ mark + short stat
Modular Small:     ♠ mark + one number
Modular Large:     ♠ mark + primary stat + one supporting label
```

---

## 14. App Icons

### 14.1 The System

Every Spades Company app icon follows the same construction:

- **Background:** `#000000` — true black, not near-black, for icon rendering context
- **Primary element:** ♠ mark, white, centered or slightly above center
- **Supporting element:** A secondary mark specific to the app's domain
- **No gradients** on either the ♠ or supporting element
- **No rounded corners from the designer** — iOS applies them system-wide

### 14.2 Supporting Element Rules

The supporting element communicates the product's domain without competing with the ♠ as the primary read.

- Legible as texture at 60x60pt; distinct and clear at 1024x1024
- White or near-white — no gray tones that compete with the ♠
- Occupies the lower third of the canvas, or wraps lightly around the ♠
- Geometric or symbolic in form — not illustrative
- Does not repeat or echo the ♠ shape

The specific supporting element is defined per-product in its specification (§J).

### 14.3 Required Variants

```
1024x1024   App Store
180x180     iPhone @3x
120x120     iPhone @2x
167x167     iPad Pro @2x
152x152     iPad @2x

All exported from a master 1024x1024 SVG source.
```

### 14.4 Alternate Icons (Suits Reward)

Suits subscribers unlock alternate icon variants, surfaced in Settings -> App Icon. All alternates follow the same construction rules. Standard set offered by every app:

- **Default** — black background, white ♠
- **Inverted** — white background, black ♠
- Additional variants defined per-product

---

## 15. Per-Product Specification Guide

Each Spades Company product has its own specification document or appendix section. That document does not redefine the shared system — it layers product-specific UX flows and decisions on top of it.

This section defines what a complete product specification must cover.

### 15.1 Required Sections

---

**§A — Product Overview**

- What manual, expensive, or broken workflow does this app replace?
- What is the AI model doing, specifically?
- V1 vs V2 model strategy: which managed service ships first, what self-hosted infrastructure replaces it at scale (see §15.2)
- Which platforms: iOS / watchOS / web — and which ships first

---

**§B — Core User Flow**

A linear diagram of the primary sequence from open to delivered value. Start with the happy path only — no branches, no error cases yet.

```
Minimal structure:
Open -> [Primary Action] -> [Input State] -> [Process] -> [Result] -> [Output]
```

---

**§C — Primary Data Visualization**

Define the app's primary visualization per §10.9 rules:
- What does it represent?
- What form does it take (geometry, orientation, dimensions)?
- Update rate when live vs static?
- What do primary, secondary/uncertain, and selected states look like?
- Which gestures does it support?
- Phase 1 Upload animation: how does "sending" appear on this visualization?

---

**§D — Main Screen**

The idle or default state of the app:
- Navigation header: left, center, right content
- Primary action element: form, idle state, active state
- Supporting context: recent items, current status, or nothing
- Empty state: copy and visual treatment

---

**§E — Primary Interaction States**

For each state in the core workflow:
- What triggers this state?
- What does the screen show?
- Which animations play?
- What are the user's available next actions?

States typically include: idle, active (performing the action), uploading (Phase 1), processing (Phase 2 — inherits §9.3 with product-specific label), result, and error.

---

**§F — Result State**

How the AI output is presented after processing:
- Layout of the result screen
- How is the AI's output visible relative to the original input?
- Is there a before/after comparison? What interaction surfaces it?
- Is there a confidence or quality indicator? How is it shown using §10.9 color rules?
- Are refinement options available (re-processing a sub-region, adjusting a parameter)?

---

**§G — Output / Export**

How the user extracts value from the app:
- Available output formats
- Export sheet structure (bottom sheet, §10.7 rules)
- Sharing options (Files app, AirDrop, Share Sheet)
- Post-export confirmation state

---

**§H — Settings**

Product-specific settings entries added above the following base, which every app includes:

```
[Product-specific settings — above this line]

SUBSCRIPTION
  Suits — [Active / Get Suits]
  Manage in App Store
  Restore Purchases

ABOUT
  Version [X.X.X]
  Privacy Policy
  Terms of Service

DEBUG (TestFlight builds only)
  Force error states
  Clear all stored data
```

---

**§I — Empty States**

For each screen or context that can appear without data:
- Copy in brand voice (see `DESIGN.md §4`)
- Visual: ♠ mark at --c-800, centered, is the default unless something more specific is warranted
- Any offered action

Copy rule: specific and direct — never apologetic. Name the context, offer a path. Never "No items found."

---

**§J — App Icon Supporting Element**

Define the secondary icon element per §14.2 rules. Describe the geometry, its position relative to the ♠, and what it communicates.

---

**§K — Widget Primary Stat**

Define what the Small (2x2) widget displays as its primary stat (§13.1). Must communicate value without opening the app.

---

**§L — Dynamic Island Body**

Define the content shown in the expanded Dynamic Island state during background processing (§12.2).

---

**§M — Processing State Labels**

Define per-phase copy used in §9:
- Phase 2 primary label: "[Active verb] your [subject]." — e.g., "Processing your data."
- Phase 2 sub-label: A calm brand-voice line for long waits
- Background notification: "[App name]: [Output description] is ready."

---

### 15.2 V1 / V2 Strategy Note

All products follow the same two-phase model philosophy, documented explicitly in §A:

- **V1:** Ship with a managed third-party API. Faster to market. Accept tradeoffs (cost at scale, limited output metadata).
- **V2:** Migrate to self-hosted infrastructure when scale justifies it, or when the product requires richer model outputs — confidence maps, intermediate representations — to unlock advanced UX features.

Features that depend on V2 outputs must be explicitly marked as V2 in the product spec and must not ship until the V2 model is in production.

---

## 16. Suits Subscription Scope

### 16.1 Cross-App Entitlement

Suits is a single subscription that unlocks all Spades Company products. Managed via RevenueCat with one subscription group shared across all apps on the same Apple Developer account.

### 16.2 When a New Product Ships

- Automatically included in the active Suits subscription
- Existing subscribers get access on launch day — no separate action required
- Paywall feature list (§8.2) is updated to include the new app before launch
- Marketing website Suits section updates accordingly (see `DESIGN.md §7.4`)

### 16.3 Individual App Purchases

Per-product individual purchases may be offered where appropriate. If offered, they appear on the paywall below the Suits option, de-emphasized. Suits is always the primary offer.

---

## 17. Accessibility Standards

### 17.1 VoiceOver (iOS)

- All interactive elements have a defined `accessibilityLabel`
- Decorative elements marked `.accessibilityHidden(true)`
- Each app's primary data visualization has descriptive labels appropriate to its content — defined in §C of the product spec
- Processing phase changes announced via `UIAccessibility.post(notification: .announcement, argument:)`
- Custom gestures (selection, zoom) have `.accessibilityAction` alternatives defined

### 17.2 Dynamic Type

Space Mono scales at accessibility text sizes (§3.2). Every layout must be verified at the largest Dynamic Type setting before shipping.

Layouts to verify per product:
- Navigation header (title may truncate — acceptable; must not overflow)
- Processing state copy (two lines maximum)
- Paywall feature list (line wrapping must not break layout)
- Settings list rows (icon and label alignment)

### 17.3 Color Independence

No information is conveyed by color alone. Where color signals state — in data visualizations, confidence overlays, or status indicators — it is paired with at least one of:
- A shape or pattern difference
- A visible label or annotation
- A VoiceOver description

### 17.4 Reduced Motion

When `UIAccessibility.isReduceMotionEnabled`:
- Idle pulse animations on primary action elements: removed entirely
- Processing pulse animation (§9.3): opacity fade only, no scale change
- All spring animations: replaced with simple opacity crossfades
- Screen transitions: crossfade only — no slide, no scale

### 17.5 Reduced Transparency

When `UIAccessibility.isReduceTransparencyEnabled`:
- All glass surfaces: replaced with opaque `--c-850`
- `UIBlurEffect` materials: replaced with solid color fallbacks
- Glass border opacity: increased to 0.25 for legibility

---

## 18. Performance Targets

### iOS

| Metric | Target |
|---|---|
| Cold launch to interactive | < 400ms |
| Main thread blocking | Zero — all heavy work dispatched off main thread |
| Memory footprint (idle) | < 50MB |
| Memory footprint (active workflow) | < 150MB |
| Primary data visualization render | < 8ms per frame at 60fps |
| UI response after primary action tap | < 100ms — UI is immediate, network follows |
| App download size | < 30MB |

### watchOS

| Metric | Target |
|---|---|
| App launch from complication | < 1s to interactive |
| Background task execution | Completes within allocated system background time |

### Web App

| Metric | Target |
|---|---|
| LCP | < 2s |
| INP | < 200ms |
| CLS | < 0.05 — apps must not reflow after initial load |
| First load JS bundle | < 120KB gzipped |

### AI Processing (Infrastructure Guidance)

These targets inform what the processing state UX (§9) must accommodate. Specific model latency and cost-per-call are documented per-product in §A.

| Metric | Target |
|---|---|
| UI response after primary action tap | < 100ms visual — network follows |
| Upload timeout before surfacing error | 30s |
| Processing timeout before background + notify | 120s |
| Result render after API response received | < 300ms |

---

## 19. Assumptions & Open Questions

### Confirmed

- [x] Always dark — no light mode in any product
- [x] Space Mono throughout — bundled as a custom font resource in every app
- [x] RevenueCat for cross-app subscription management
- [x] ♠ mark as app icon primary element across all products
- [x] Suits = one subscription group, all apps, one price
- [x] Minimum iOS target: iOS 17 (Dynamic Island, latest SwiftUI APIs)
- [x] Minimum watchOS target: watchOS 10
- [x] Android is not in scope — iOS-first is a brand and resource decision

### Open — Requires Decision Per Product or Globally

| Question | Impact | Notes |
|---|---|---|
| Free tier or full paywall-on-open for all products? | High | §8 assumes paywall at end of onboarding — confirm as global default or document per-product exceptions |
| Standard trial duration | Medium | Not yet set globally — 7 days assumed until decided |
| On-device model (offline capability, V2+) | Medium | Not in scope for any V1 product — evaluate per product at V2 planning |
| macOS Catalyst support | Low | Possible per product — not the default; must be explicitly scoped per app |
| Cloud vs local data storage | High | Privacy, sync, and cost implications — decided per product in §A |
| Collaboration or multi-user features | Low | All V1 products are single-user — multi-user is a V2 consideration |

---

*This document governs all shared design and UX decisions across The Spades Company product suite. For website and marketing design, see `DESIGN.md`. For product-specific flows, states, and interactions, see each product's individual specification. Any implementation that contradicts a rule here requires a written reason and a version update to this file.*

*The Spades Company — Product Design System v1.1*
