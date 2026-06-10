# The Spades Company — Design & UX Specification
**Version 1.0**  
Last updated: June 2026  
Domain: `thespades.co`  
Stack: Next.js 14 (App Router) · Tailwind CSS · TypeScript · Vercel

---

## Table of Contents

1. [Brand Philosophy](#1-brand-philosophy)
2. [Visual Design System](#2-visual-design-system)
3. [Animation & Motion System](#3-animation--motion-system)
4. [Copy Voice & Tone](#4-copy-voice--tone)
5. [Site Architecture](#5-site-architecture)
6. [Global Navigation](#6-global-navigation)
7. [Homepage (/)](#7-homepage-)
8. [Apps Listing Page (/apps)](#8-apps-listing-page-apps)
9. [App Detail Page (/apps/slug)](#9-app-detail-page-appsslug)
10. [Founder / Portfolio Page (/founder)](#10-founder--portfolio-page-founder)
11. [Blog (/blog)](#11-blog-blog)
12. [Developer Page (/developer)](#12-developer-page-developer)
13. [Component Library](#13-component-library)
14. [Responsive Behavior](#14-responsive-behavior)
15. [Accessibility Standards](#15-accessibility-standards)
16. [Performance Targets](#16-performance-targets)
17. [Assumptions & Open Questions](#17-assumptions--open-questions)

---

## 1. Brand Philosophy

### The Core Premise
The Spades Company builds iOS-first and web applications where state-of-the-art AI meets world-class design. Each product earns its place — it exists because nothing else does what it does, the way it does it.

### The Three Non-Negotiables
1. **Precision** — Every pixel, every millisecond, every word is chosen. Nothing is accidental.
2. **Smoothness** — The interface never fights the user. It anticipates, then disappears.
3. **Restraint** — Adding nothing is often the hardest design decision. We make it often.

### The Bentley Principle
The brand does not explain why it is good. It does not use the word "revolutionary," "seamless," "powerful," or "next-generation." Ever. The product makes the claim. The copy just names it. Confidence is demonstrated through quality — not through self-description.

### Brand Mark
The spade symbol `♠` functions as the primary brand mark across all contexts:
- App icon base element
- Navigation anchor
- Section dividers
- Footer signature
- Favicon
It is never decorative. Every use is intentional and carries the weight of the full brand.

---

## 2. Visual Design System

### 2.1 Color — 14-Step Grayscale

No accent color. Ever. Contrast carries all hierarchy.

| Token | Hex | Primary Use |
|---|---|---|
| `--c-black` | `#000000` | Deep backgrounds, absolute black |
| `--c-950` | `#080808` | Main app background |
| `--c-900` | `#111111` | Secondary background, cards |
| `--c-850` | `#1A1A1A` | Elevated surfaces |
| `--c-800` | `#222222` | Borders, subtle dividers |
| `--c-700` | `#333333` | Inactive states |
| `--c-600` | `#555555` | Disabled text |
| `--c-500` | `#777777` | Tertiary text, placeholders |
| `--c-400` | `#999999` | Secondary text, captions |
| `--c-300` | `#BBBBBB` | Body text on dark |
| `--c-200` | `#CCCCCC` | Secondary readable text |
| `--c-100` | `#E5E5E5` | Near-white text |
| `--c-50` | `#F2F2F2` | Off-white |
| `--c-white` | `#FFFFFF` | Primary text, primary actions, active states |

**Hard rule:** These 14 values are the complete palette. No additional colors are added under any circumstance.

### 2.2 Typography — Space Mono

One typeface. Two weights. No exceptions.

```
font-family: 'Space Mono', monospace;
font-weight: 400 (Regular) | 700 (Bold)
```

**Type Scale:**

| Name | Size | Weight | Tracking | Leading | Use |
|---|---|---|---|---|---|
| Display | 52px | 700 | -0.04em | 1.0 | Hero headlines |
| H1 | 36px | 700 | -0.03em | 1.1 | Page titles |
| H2 | 26px | 700 | -0.02em | 1.2 | Section headers |
| H3 | 20px | 700 | -0.01em | 1.25 | Subsection headers |
| Title | 17px | 700 | 0 | 1.3 | Card titles, UI labels |
| Body | 14px | 400 | +0.01em | 1.65 | All reading text |
| Caption | 12px | 400 | +0.02em | 1.5 | Metadata, timestamps |
| Label | 10px | 700 | +0.20em | 1.4 | UPPERCASE labels, tags |

**Rules:**
- Maximum 3 type sizes on any single screen
- Bold for structure and labels only; Regular for all reading
- Wide tracking (0.14–0.22em) exclusively for UPPERCASE labels
- Minimum body size is 14px — Space Mono renders smaller than optical size suggests
- Italic is permitted for emphasis only — never for decoration

### 2.3 Spacing — Strict 8pt Grid

All spacing values are multiples of 4, with primary intervals at 8.

```
--sp-1: 4px   --sp-2: 8px   --sp-3: 12px
--sp-4: 16px  --sp-5: 20px  --sp-6: 24px
--sp-8: 32px  --sp-10: 40px --sp-12: 48px
--sp-16: 64px --sp-20: 80px --sp-24: 96px
```

No off-grid values. If a spacing need doesn't fit the grid, question the layout before breaking the rule.

### 2.4 Border Radius

```
--r-xs:   4px      → Tags, chips, small badges
--r-sm:   8px      → Small inputs, inline elements
--r-md:   12px     → Standard inputs, small cards
--r-lg:   16px     → Navigation pill, medium cards
--r-xl:   24px     → Large cards, panels
--r-2xl:  32px     → Hero cards, feature panels
--r-pill: 9999px   → Buttons, tags, the navigation pill
```

### 2.5 Glass System

Glass is applied **selectively**. It is reserved for surfaces that float above real content. Never applied to flat backgrounds — blur on flat is meaningless.

| Level | Background | Border | Blur | Use |
|---|---|---|---|---|
| Subtle | rgba(255,255,255,0.025) | rgba(255,255,255,0.055) | 18px | Contextual depth, active rows |
| Standard | rgba(255,255,255,0.055) | rgba(255,255,255,0.10) | 18px | Navigation pill, cards, panels |
| Prominent | rgba(255,255,255,0.09) | rgba(255,255,255,0.16) | 18px | Modals, sheets, menus, alerts |

**Rules:**
- Never stack two glass layers
- Always pair glass surfaces with a shadow token
- Never use glass for buttons — solid or outline only
- Never apply to list cells — it repeats and degrades immediately

### 2.6 Shadow System

```
--sh-xs: 0 1px 3px rgba(0,0,0,0.5)
--sh-sm: 0 2px 10px rgba(0,0,0,0.55)
--sh-md: 0 4px 20px rgba(0,0,0,0.6)
--sh-lg: 0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.3)
--sh-xl: 0 20px 80px rgba(0,0,0,0.85), 0 4px 20px rgba(0,0,0,0.5)
```

| Token | Use |
|---|---|
| `--sh-xs` | Subtle borders, minimal depth |
| `--sh-sm` | Buttons on hover |
| `--sh-md` | Cards, floating elements |
| `--sh-lg` | Navigation pill, floating panels |
| `--sh-xl` | Modals, bottom sheets |

### 2.7 Atmospheric Background

Every dark surface includes a very slow-moving radial gradient orb — barely perceptible, but adds depth to what would otherwise be a flat void:

```css
/* Primary orb — top right */
background: radial-gradient(circle, rgba(255,255,255,0.011) 0%, transparent 65%);
animation: orbDrift 28s ease-in-out infinite alternate;

/* Secondary orb — bottom left */
background: radial-gradient(circle, rgba(255,255,255,0.007) 0%, transparent 65%);
/* Static — no animation */
```

This is always present at the layout level. Individual sections do not re-implement it.

---

## 3. Animation & Motion System

### 3.1 Philosophy

The animation tempo is **slow and cinematic** — Apple TV-style. Every transition feels considered. Nothing snaps. Nothing bounces aggressively. The interface moves with weight and intention.

> "If the user notices the animation before they notice what it revealed, it's too fast, too slow, or too much."

### 3.2 Duration Tokens

```
--dur-micro:  150ms   → Hover states, immediate feedback
--dur-fast:   250ms   → Button feedback, icon swaps
--dur-std:    400ms   → Tab switches, small reveals
--dur-film:   650ms   → Section entrances, card reveals
--dur-reveal: 900ms   → Page-level transitions, hero elements
```

### 3.3 Easing Tokens

```
--ease-expo:    cubic-bezier(0.16, 1, 0.3, 1)   → Standard enters/reveals
--ease-smooth:  cubic-bezier(0.25, 0.46, 0.45, 0.94) → General-purpose smooth
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1)   → Touch responses, spring settle
--ease-refined: cubic-bezier(0.45, 0, 0.15, 1)       → All exits
```

### 3.4 Standard Motion Patterns

**Fade Lift (standard enter):**
```
opacity: 0 → 1
transform: translateY(20px) → translateY(0)
duration: --dur-film
easing: --ease-expo
```

**Cinematic Reveal (screen/section enter):**
```
opacity: 0 → 1
transform: scale(0.96) translateY(8px) → scale(1) translateY(0)
duration: --dur-reveal
easing: --ease-expo
```

**Exit Dissolve (all exits):**
```
opacity: 1 → 0
transform: translateY(0) scale(1) → translateY(-14px) scale(0.95)
duration: --dur-fast to --dur-std (exits are always shorter than entrances)
easing: --ease-refined
```

**Spring Settle (navigation, touch responses):**
```
Uses spring physics: cubic-bezier(0.34, 1.56, 0.64, 1)
Slight overshoot on arrival (~8%)
duration: --dur-std
```

**Staggered List Reveal:**
```
Each item: Fade Lift
Delay between items: 50ms
Maximum items that animate: 6 (beyond 6, all items appear simultaneously)
```

### 3.5 Scroll-Triggered Animations

All non-hero sections reveal via IntersectionObserver:
- Threshold: 0.06 (fires when 6% of element is visible)
- Root margin: `0px 0px -32px 0px` (triggers slightly before element edge)
- Each section: Fade Lift at `--dur-film`
- Stagger between sections: 40ms
- Hero section is exempt — it plays on load via CSS keyframes

### 3.6 Animation Rules

**Do:**
- Always pair `opacity` + `transform` — never animate one alone
- Use `--ease-expo` for all enters and page reveals
- Make exits 50–60% shorter than their paired entrance
- Use spring easing only for touch/tap responses and the navigation element
- Keep page-level transitions at 650–900ms

**Never:**
- Animate `width`, `height`, `margin`, or `padding` — use `transform: scale()` instead
- Animate more than 2 properties simultaneously
- Use `linear` easing or default CSS `ease` anywhere
- Add animation to disguise AI processing latency
- Animate lists of more than 6 items with stagger

---

## 4. Copy Voice & Tone

### 4.1 The Standard

**Subtle confidence.** The brand doesn't prove itself. It exists. The reader understands.

This is the Bentley principle applied to copy: a Bentley brochure doesn't say "our cars are luxurious." It says "Power. Beauty. Soul." — and stops there. The claim is made by specificity, not assertion.

Apple says "The world's most personal computer." Not "a very good computer." Declarative. Specific. Unprovable by anyone else, not because it's hyperbole, but because it's theirs.

### 4.2 Rules

**Voice:**
- Short, declarative sentences
- Active voice only
- Present tense unless quoting history
- No explanations unless the reader asked

**Forbidden words and phrases:**
- revolutionary, game-changing, next-generation, powerful
- seamlessly, effortlessly, intuitively
- "We believe that..." (just say the thing)
- "Introducing..." (the product introduces itself)
- "Simple yet powerful" (every startup says this)
- Any sentence starting with "With [Product]..."

**Tone calibration by page:**
| Page | Tone |
|---|---|
| Homepage Hero | Near-silent. One line. Let the mark do the work. |
| Product pages | Precise. Name what the product does. |
| About/Vision | Quiet conviction. Not a mission statement. A statement of fact. |
| Founder page | Human, but edited. No false modesty, no credential-flexing. |
| Blog | The writer's actual voice. Slightly less edited. |
| Developer page | Technical confidence. Exact language. Numbers when possible. |

### 4.3 Copy Examples

**Correct:**
> "Your voice. Without the noise."  
> "Software that knows when to disappear."  
> "Built for the recording, not the setup."  
> "One subscription. Every app."  
> "♠"  *(sometimes the mark alone is the line)*

**Incorrect:**
> "We've reimagined the audio experience for creators everywhere."  
> "Powerful AI meets elegant design in our revolutionary new app."  
> "Seamlessly remove background noise with just one tap."

### 4.4 Headline Formula

Most headlines follow one of three patterns:

1. **The noun phrase:** "The Recording Session." "The Work." "The Standard."
2. **The compression:** "Your voice. Without the noise." (two short clauses, second subverts the first)
3. **The flat statement:** "Built different." "Software with a standard." "We make fewer things, better."

Never use questions in headlines. The brand doesn't ask — it declares.

---

## 5. Site Architecture

### 5.1 Page Map

```
thespades.co
│
├── /                      Homepage (single-page scroll)
│   ├── #hero              Brand + vision dual entrance
│   ├── #apps              Featured products
│   ├── #suits             Subscription model
│   ├── #writing           Blog/research teaser
│   └── footer
│
├── /apps                  Full app listing
│   └── /apps/[slug]       Individual app deep-dive
│
├── /founder               CEO spotlight / portfolio (dual audience)
│
├── /blog                  Article listing
│   └── /blog/[slug]       Individual post
│
└── /developer             Public research + future API docs
```

### 5.2 Color Mode

**Always dark.** No light mode toggle. No system-adaptive switching. The brand is built in black and white — the dark mode *is* the brand. A light version would require a separate design system that doesn't exist.

### 5.3 Page Transitions

Between pages (actual navigation, not section scrolling):
- Current page: Exit Dissolve (opacity 1→0, translateY 0→-8px, 280ms)
- Incoming page: Cinematic Reveal (opacity 0→1, scale 0.97→1, 900ms)
- Handled at the layout level via Next.js App Router

---

## 6. Global Navigation

### 6.1 Overview

The navigation has two distinct visual states and a directional transition logic between them. It is the most technically complex animation in the system.

### 6.2 State 1 — Expanded Pill (default / on scroll-up)

**Position:** Horizontally centered, fixed, 24px from top of viewport  
**Shape:** Pill (border-radius: 9999px)  
**Background:** Glass Standard  
**Border:** 1px solid var(--g-std-border)  
**Shadow:** var(--sh-lg)  
**Height:** 48px  
**Padding:** 0 8px  

**Structure (left to right):**
```
[ ♠  ·  About  ·  Apps  ·  Suits  ·  Writing  ]  [  ·  ]  [ ··· ]
  ↑                                                   ↑        ↑
  Home anchor                              Visual     Separator More menu button
                                           divider
```

- Nav links are `font-size: 12px, font-weight: 700, letter-spacing: 0.08em, uppercase`
- Active section link: `color: --c-white`
- Inactive links: `color: --c-400`
- Hover: `color: --c-white` with `--dur-fast` transition
- The **separator** (`·`) between the main links and the more button is a `1px` vertical rule at `--c-700`, height 20px, providing visual separation
- The **More button** (`···`) opens a dropdown menu (see §6.4)
- The ♠ mark on the left scrolls to top (not the #hero anchor — actual top of page)

### 6.3 State 2 — Collapsed ♠ Button (on scroll-down > 80px)

**Position:** Fixed, top: 24px, left: 24px  
**Shape:** Rounded rectangle (border-radius: var(--r-xl) = 24px)  
**Background:** Glass Standard  
**Border:** 1px solid var(--g-std-border)  
**Shadow:** var(--sh-md)  
**Size:** 44px × 44px (Apple minimum touch target)  
**Content:** ♠ mark, centered, `font-size: 18px`, `color: --c-white`  

Clicking the ♠ button in this state:
1. Scrolls to top of page
2. Simultaneously triggers the expand animation back to State 1

### 6.4 Transition — Expanded → Collapsed (scroll down past 80px)

This is an **asymmetric directional motion**. The pill physically moves toward the corner as it collapses. It has weight.

```
Timeline (total: ~550ms):

0ms     — Nav link text fades out (opacity 1→0, 150ms, ease-expo)
0ms     — Pill begins moving left + shrinking (spring physics)
         Width: full pill width → 44px
         Position X: center → 24px from left
         This movement uses: cubic-bezier(0.34, 1.56, 0.64, 1) [spring]
         Duration: 450ms

200ms   — ♠ mark fades in within shrinking container 
         (opacity 0→1, 200ms, ease-expo)

450ms   — Container arrives at top-left position
         Spring overshoot: scale 1.0 → 1.06 → 1.0 (80ms settle)
```

The spring overshoot on arrival (~6%) is the "rubber-banding" feel. It's subtle — just enough to feel physical, not enough to feel playful.

### 6.5 Transition — Collapsed → Expanded (scroll back up past 80px)

This is **not** the reverse of the collapse. The pill does not slide back from the corner. Instead:

```
Timeline (total: ~700ms):

0ms     — ♠ button fades out in-place (opacity 1→0, 200ms, ease-refined)
50ms    — New pill fades in at center position
         opacity: 0 → 1
         scale: 0.96 → 1
         duration: 650ms, ease-expo
200ms   — Nav link text fades in (opacity 0→1, 300ms, ease-expo)
         Stagger: 30ms between each link
```

The asymmetry is intentional. Collapse has directional physicality (it goes somewhere). Expand is a reveal (it appears where it lives). This mirrors how real objects work — a retracted element doesn't necessarily re-extend the same path it left on.

### 6.6 More Menu Dropdown

Triggered by clicking the `···` button in the expanded pill, or the ♠ button in the collapsed state (long-press or secondary behavior TBD).

**Position:** Below the pill, centered on the `···` button  
**Background:** Glass Prominent  
**Border:** 1px solid var(--g-prom-border)  
**Shadow:** var(--sh-xl)  
**Border-radius:** var(--r-xl)  
**Padding:** var(--sp-2) 0  

**Menu items:**
```
/developer    → Developer
/founder      → Founder  
/[portfolio]  → Portfolio
```

**Entrance animation:**
```
opacity: 0 → 1
scale: 0.96 → 1  (transform-origin: top center)
duration: 300ms, ease-expo
```

**Exit animation:**
```
opacity: 1 → 0
scale: 1 → 0.97
duration: 200ms, ease-refined
```

Each menu item: `font-size: 13px, font-weight: 700, letter-spacing: 0.06em`  
Hover state: background `rgba(255,255,255,0.06)`, border-radius var(--r-md)  

### 6.7 Mobile Navigation

On viewports < 768px:
- The expanded pill is never shown on mobile — the ♠ button is the default and only state
- Tapping the ♠ button opens a full-screen menu overlay (glass-prominent, fills viewport)
- Menu overlay contains all navigation links (About, Apps, Suits, Writing, Developer, Founder, Portfolio)
- Overlay entrance: Cinematic Reveal from bottom (translateY 100% → 0, scale 0.97 → 1)
- Overlay exit: Exit Dissolve downward (translateY 0 → 8px, opacity 1 → 0)

---

## 7. Homepage (/)

### 7.1 Overview

The homepage is a single-page scroll experience. All main sections have `id` anchors targeted by the navigation pill. There are no sub-page navigations from here — the homepage is the brand's primary statement.

### 7.2 Section: Hero

**Purpose:** Dual brand + vision entrance. "Here's who we are. Here's what we stand for."

**Layout:** Full viewport height (100svh). Content centered both axes.

**Animation sequence (on page load):**
```
0ms    — Page background fades in (--c-950, 400ms)
300ms  — ♠ mark appears (opacity 0→1, scale 0.92→1, 900ms, ease-expo)
700ms  — "THE SPADES COMPANY" wordmark fades up (Fade Lift, 900ms, ease-expo)
1200ms — Vision line fades up (Fade Lift, 800ms, ease-expo)
1600ms — Navigation pill fades in (opacity 0→1, 400ms, ease-expo)
1800ms — Scroll indicator appears (subtle, opacity 0→0.4, 600ms)
```

**Visual structure:**
```
[atmospheric background orb — slow drift]

          ♠

    THE SPADES COMPANY

  Software with a standard.

         ↓ (scroll indicator — very subtle, --c-700)
```

- ♠ mark: Display size (52px), `color: --c-white`
- Wordmark: H1 (36px), Bold, tracking -0.03em
- Vision line: Title (17px), Regular, `color: --c-400`
- Vision line is **not** a tagline — it changes per product launch, but starts here

**Scroll behavior:** As user scrolls past hero, the ♠ mark and wordmark have a subtle parallax — they move at 0.6× the scroll speed, creating depth without being distracting.

### 7.3 Section: The Work (#apps)

**Purpose:** Showcase the flagship app(s) with enough depth to generate desire.

**Layout:** Full-width, generous vertical padding (--sp-24 top and bottom).

**Structure:**
```
SECTION LABEL (uppercase, --c-600, letter-spacing wide)
"The Work."

[Featured App Card — large, cinematic]
  ↓
[Secondary App Cards — smaller grid, if >1 app exists]
  ↓
[→ See all apps] (ghost link, right-aligned)
```

**Featured App Card:**
- Full width (or 80% centered with margin auto)
- Background: Glass Standard + strong shadow (--sh-xl)
- Border-radius: --r-2xl
- Left side: App name (H1), tagline (Body), platform badges, CTA button
- Right side: App mockup/screenshot (masked with gradient fade at edges)
- Hover: card lifts (translateY -8px, --dur-film, ease-expo), shadow deepens

**No apps yet:** A single placeholder card with text:  
> "The first app is coming."  
With a subtle pulsing animation on the ♠ mark inside the card.

### 7.4 Section: Suits (#suits)

**Purpose:** Present the subscription model with clarity and desire, not a pricing table.

**Layout:** Full-width, dark panel (--c-900 background to create distinction from adjacent sections).

**Structure:**
```
SECTION LABEL
"One subscription."

Suits — [price]/month
Everything we make. All of it.

[✓] [App 1 name]
[✓] [App 2 name]
[✓] Every future app

[Get Suits — primary button]

Below: "Individual apps available separately."
(12px, --c-600 — de-emphasized but present)
```

**Tone:** No feature comparison table. No tiers (unless multiple tiers are added later). The simplicity of "everything, one price" is the message. The list of apps confirms the value — if there are 4 apps, 4 checkmarks. If there are 1, it plants anticipation for the rest.

### 7.5 Section: Writing (#writing)

**Purpose:** Surface recent blog content, signal that this is a brand that publishes.

**Layout:** Clean, list-based. No images (consistent with the technical/editorial voice).

**Structure:**
```
SECTION LABEL
"Writing."

[Post Title]                  [Date]
One line of preview text...

[Post Title]                  [Date]  
One line of preview text...

[Post Title]                  [Date]
One line of preview text...

[→ All writing]
```

- 3 most recent posts
- Title: Title size (17px), Bold
- Preview: Caption (12px), --c-400
- Date: Label (10px), --c-600, right-aligned
- Each row is a full-width link with a hover state: subtle bottom border appears (1px, --c-700)

### 7.6 Footer

Minimal. The footer closes the page, it doesn't try to reopen it.

```
[Left]                           [Right]
♠ The Spades Company             © 2026
thespades.co                     Terms · Privacy
```

- `font-size: 11px, --c-700`
- `border-top: 1px solid --c-850`
- `padding: --sp-12 0 --sp-8`
- No social links in footer unless explicitly added — they're not part of the brand statement

---

## 8. Apps Listing Page (/apps)

**Purpose:** Present all Spades Company apps with enough information to generate interest, and surface the Suits subscription as the natural default.

**Hero:**
```
"The Apps."
[subtitle: "Built for people who care about what they make."]
```

**Layout:**
- Suits CTA banner at top (Glass Standard, full width, rounded)
  > "Get everything. One subscription. — Suits — [Get Started →]"
- Grid of app cards below
- Grid: 2 columns on desktop, 1 column on mobile
- Card structure: app icon (monochrome), name, one-line description, platform tags, [View →]

**Empty state / pre-launch:**
- Single card, "Coming soon" treatment
- Suits banner still present — subscribing before launch is valid

---

## 9. App Detail Page (/apps/[slug])

**Purpose:** Comprehensive showcase of a single app. Convert interest into download or subscription.

### Structure

**Hero (full viewport):**
- App name: Display size
- App tagline: H3, --c-400
- Platform badges (iOS / Web)
- Primary CTA: "Download" or "Try Free"
- Secondary CTA: "Get via Suits ↗"
- Large app mockup (right-aligned on desktop, below text on mobile)

**Feature Sections:**
Each major feature gets its own full-height panel:
```
[Feature Name — Label size, uppercase]
[Feature headline — H2]
[Feature description — Body, max-width: 48ch]
         [Mockup / visual — opposite side]
```

Features alternate: text left / visual right, then text right / visual left.

**How It Works:**
Step-by-step section for technically complex features (e.g., for the audio cleaning app: Record → Upload → Clean → Fine-tune → Export).

**Pricing/CTA Closeout:**
- Standalone pricing card (if individual purchase available)
- Suits upsell below it
- Final tagline line

---

## 10. Founder / Portfolio Page (/founder)

### Dual Audience

This page serves two audiences simultaneously:
1. **Visitors** — Curious about the person behind the brand
2. **University admissions reviewers** — Evaluating the applicant's technical depth and initiative

The design **never** acknowledges this dual purpose. It reads as a natural personal statement. Credentials emerge from context, not from a list.

### Structure

**Opening:**
- Name, one-line role
- No headshot (consistent with brand's preference for work-over-person aesthetic — unless explicitly decided otherwise)
- One paragraph in the brand voice — personal, specific, not a bio

**The Work:**
- Apps built (same cards as /apps, but framed as "things I've built")
- Technical tools and stack mentioned naturally, not listed

**Background:**
- Education, presented as context not credential
- Written in first person, editorially

**What I'm Building Toward:**
- Forward-looking section
- The ML roadmap, the vision for the company
- Most compelling for admissions reviewers

**Closing line:**
- One sentence. No call to action.

### Tone on this page
More human than the rest of the site. The brand voice applies, but first-person is used. Specificity over abstraction — concrete projects, real results, named skills.

---

## 11. Blog (/blog)

### Listing Page

**Structure:**
```
"Writing."
[Subtitle if any]

[Post Title]                              [Date]
[Category tag — Label size, uppercase]    [Read time]
One sentence preview.

[divider — 1px, --c-850]

[Next post...]
```

- No pagination for now — all posts, newest first
- No tag filtering until there are > 10 posts
- No images in listing

### Post Page

**Structure:**
- Title: H1
- Metadata: Date · Read time · Category (all Label size, --c-600)
- `border-bottom: 1px solid --c-800` below metadata
- Body: 14px Regular, max-width 680px, centered
- Code blocks: Glass Subtle background, `--r-md` border-radius, full-width
- No author block (the brand is the author)
- No comments section
- "← Back to writing" link at bottom

**Code block style:**
```
background: var(--g-subtle-bg)
border: 1px solid var(--g-subtle-border)
border-radius: var(--r-md)
padding: var(--sp-4) var(--sp-5)
font-size: 13px (Space Mono — already the site font, blends naturally)
color: --c-200
```

---

## 12. Developer Page (/developer)

**Purpose:** Public research, API documentation (future), and credibility signal for the developer community.

### Phase 1 (current — pre-API)

**Structure:**
```
"Developer."

"The API is coming."
[One paragraph on what the API will expose — brief, specific]

Research & Open Work
[Links to any published research, GitHub repos, public writing]

Stay Updated
[Email capture — simple, minimal]
```

### Phase 2 (when API exists)

Full API documentation:
- Authentication
- Endpoints
- Rate limits
- Code examples (copy-able)
- SDKs

The developer page adopts a slightly more technical tone — exact language, numbers, specifications — while maintaining Space Mono's inherent technical character.

---

## 13. Component Library

### Buttons

Four variants. All use `font-family: var(--font), font-size: 11px, font-weight: 700, letter-spacing: 0.10em, text-transform: uppercase, border-radius: --r-pill`.

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `--c-white` | `--c-black` | none | bg `--c-100`, translateY(-2px), --sh-md |
| Secondary | transparent | `--c-white` | 1px `--c-500` | border `--c-white`, translateY(-2px) |
| Glass | Glass Standard | `--c-300` | Glass Standard border | Glass Prominent bg, text `--c-white`, translateY(-2px) |
| Ghost | transparent | `--c-500` | 1px `--c-800` | text `--c-300`, border `--c-600` |

All hover transitions: `--dur-std, --ease-expo`.  
Destructive actions: Ghost variant with red-tinted border on hover only — `rgba(255, 60, 60, 0.3)`.

### Cards

Standard card template:
```
background: var(--g-std-bg)
border: 1px solid var(--g-std-border)
border-radius: var(--r-2xl)
backdrop-filter: blur(18px)
box-shadow: var(--sh-lg)

hover:
  transform: translateY(-8px)
  box-shadow: var(--sh-xl)
  transition: --dur-film, --ease-expo
```

### Text Input

```
background: var(--g-subtle-bg)
border: 1px solid var(--g-subtle-border)
border-radius: var(--r-lg)
padding: 12px 16px
font-family: var(--font)
font-size: 13px
color: var(--c-white)
transition: all --dur-std --ease-expo

placeholder: color var(--c-600)

:focus
  border-color: rgba(255,255,255,0.22)
  background: var(--g-std-bg)
  box-shadow: 0 0 0 3px rgba(255,255,255,0.04)
  outline: none
```

### Modal / Sheet

```
Backdrop: rgba(0,0,0,0.7), backdrop-filter: blur(8px)
Modal container: Glass Prominent, --r-2xl, --sh-xl
Max-width: 560px (desktop), full-width minus 32px margin (mobile)
Padding: --sp-8

Entrance:
  opacity: 0 → 1
  scale: 0.95 → 1
  duration: 400ms, --ease-expo

Exit:
  opacity: 1 → 0
  scale: 1 → 0.97
  duration: 250ms, --ease-refined
```

### Divider

```
height: 1px
background: var(--c-850)
border: none
```

For section breaks with more presence:
```
background: linear-gradient(to right, transparent, var(--c-800), transparent)
```

### Tag / Badge

```
font-size: 10px, font-weight: 700, letter-spacing: 0.12em, text-transform: uppercase
padding: 3px 10px
border-radius: var(--r-pill)
border: 1px solid var(--g-std-border)
color: var(--c-500)
background: var(--g-subtle-bg)
```

Platform badges (iOS / Web / macOS) use this exact style.

---

## 14. Responsive Behavior

### Breakpoints

```
Mobile:  < 768px
Tablet:  768px – 1024px
Desktop: > 1024px
```

### Key Responsive Rules

**Typography:**
- Display text scales down: 52px → 36px on mobile (using `clamp(36px, 7vw, 52px)`)
- Body, Caption, Label sizes remain fixed — they're already at minimum

**Navigation:**
- Desktop: Floating pill (State 1 default)
- Mobile: ♠ button only (State 2 always), tap opens full-screen overlay

**Homepage Sections:**
- Feature sections: side-by-side on desktop → stacked (text above, visual below) on mobile
- App cards: 2-column grid → single column on mobile

**Glass effects:**
- Full glass on desktop
- Reduced blur on mobile: 12px instead of 18px (performance consideration on low-end devices)
- `@supports not (backdrop-filter: blur())` fallback: opaque `--c-900` background

**Touch targets:**
- Minimum 44px × 44px on all interactive elements (Apple HIG standard)
- Navigation pill links get increased padding on touch devices

---

## 15. Accessibility Standards

- **Contrast:** All text passes WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
  - Body text (--c-200 on --c-950): passes AA
  - Secondary text (--c-400 on --c-950): checked per usage — increase to --c-300 where needed
- **Focus states:** All interactive elements have a visible focus ring: `outline: 2px solid rgba(255,255,255,0.5), outline-offset: 3px`
- **Reduced motion:** All animations wrapped in `@media (prefers-reduced-motion: reduce)` — durations set to 0ms or 1ms, transforms removed
- **Semantic HTML:** `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>` used correctly
- **ARIA:** Modal overlays use `role="dialog"`, `aria-modal="true"`. Navigation uses `aria-label`. Hidden decorative elements use `aria-hidden="true"`.

---

## 16. Performance Targets

| Metric | Target |
|---|---|
| Lighthouse Performance | ≥ 90 |
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FID / INP | < 200ms |
| First load JS bundle | < 150kb gzipped |
| Space Mono font load | Preloaded via `<link rel="preload">` |
| Images | WebP format, `next/image` with blur placeholder |
| Glass effects | Only rendered when `backdrop-filter` is supported |

---

## 17. Assumptions & Open Questions

### Confirmed
- [x] Always dark — no light mode
- [x] Space Mono only — no fallback typeface beyond monospace stack
- [x] No accent color — ever
- [x] Glass selective — overlays and modals only
- [x] Animation tempo: slow and cinematic
- [x] Copy voice: subtle confidence (Bentley/Apple)
- [x] Navigation: floating pill with asymmetric collapse logic
- [x] Homepage: brand + vision dual entrance
- [x] Single-page scroll homepage with section anchors

### Open — Requires Decision

| Question | Impact | Default Assumption |
|---|---|---|
| First app name | High — affects all product copy | [PLACEHOLDER: "Clarity"] |
| Suits pricing | High — shapes /apps and /suits sections | $9.99/month assumed |
| Portfolio vs Founder — same page? | Medium | Treated as same page (`/founder`) |
| Custom 404 page | Low | Minimal: ♠ + "Wrong turn." + home link |
| Email capture (for API waitlist) | Medium | Simple input, no third-party form embed |
| App icon design | High for product pages | Not defined — separate process |
| Does `/about` exist as a separate page, or only as a homepage section? | Medium | Homepage section only for now |
| Social presence linked from site | Low | Not linked — brand is product-first |

---

*This document is the single source of truth for all visual and UX decisions on thespades.co. Any implementation that contradicts a rule in this document requires a documented reason and a version update to this file.*

*♠ The Spades Company — Design System v1.0*
