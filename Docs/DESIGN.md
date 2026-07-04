# Design System — Phi (Marketing Showcase)

## Product Context

- **What this is:** A marketing showcase site for Phi, an AI-powered academic tutor shipping as a native iOS app. The site sells the product vision and iOS experience — not a web app login flow.
- **Who it's for:** Students (high school through college) who want genuine mastery of their own material, and early adopters looking for TestFlight / launch updates.
- **Space/industry:** EdTech / AI tutoring. Primary competitor frame: NotebookLM (research assistant) vs Phi (tutor).
- **Project type:** Marketing showcase — cinematic, scroll-driven, iOS-first.

## Aesthetic Direction

- **Direction:** Luxury / Refined — dark-first, restrained, Arc-browser energy
- **Decoration level:** Intentional — atmospheric orbs, glass surfaces, layered shadows; no decorative blobs or gradient slop
- **Mood:** Slow, precise, and serious. Software that teaches you. Every animation earns its place.
- **Reference lineage:** Spades Company design system (OLD PHI `globals.css`, `PRODUCT_DESIGN.md`), dialed for iOS showcase rather than web-app density

## Typography

- **Display/Hero:** Space Mono Bold — brand signature; φ mark and headlines
- **Body:** Space Mono Regular — single typeface product; hierarchy via size, weight, and color
- **UI/Labels:** Space Mono Bold, uppercase, 0.08–0.2em tracking
- **Loading:** Google Fonts — `Space+Mono:wght@400;700`
- **Scale:**
  - Hero: clamp(36px, 7vw, 56px) / bold / -0.04em tracking
  - H1: clamp(28px, 5vw, 36px) / bold
  - H2: 22px / bold
  - Body: 14–15px / regular / 1.65 line-height
  - Label: 10–11px / bold / uppercase / 0.18–0.2em tracking
  - Caption: 11–12px / regular

## Color

- **Approach:** Restrained — one product accent on a near-black grayscale ramp
- **Accent (Phi gold):** `#d4a74a` — φ mark, active states, key highlights only
- **Accent dim:** `#a07832` — hover/secondary accent use
- **Neutrals (14-step Spades ramp):**
  - `--c-black`: #000000
  - `--c-950`: #080808 (page background)
  - `--c-900`: #111111 (surfaces, cards)
  - `--c-850`: #1a1a1a
  - `--c-800`: #222222 (dividers)
  - `--c-700`: #333333
  - `--c-600`: #555555
  - `--c-500`: #777777 (labels)
  - `--c-400`: #999999 (secondary text)
  - `--c-300`: #bbbbbb
  - `--c-200`: #cccccc
  - `--c-100`: #e5e5e5
  - `--c-50`: #f2f2f2
  - `--c-white`: #ffffff
- **Semantic:** success `#4ade80`, warning `#fbbf24`, error `#f87171`
- **Dark mode:** Always dark — no light mode on marketing site

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable on marketing; tighter only inside device mockups
- **Scale:** 2xs(4) xs(8) sm(12) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96)

## Layout

- **Approach:** Hybrid — editorial hero + grid-disciplined feature sections
- **Grid:** 12 columns, max content width 1120px, 24px gutter mobile / 32px desktop
- **Border radius:** sm 12px, md 16px, lg 24px, xl 32px, pill 9999px, device 44px
- **Glass surfaces:**
  - Standard: `rgba(14,14,14,0.72)` + `backdrop-filter: blur(24px)` + `1px solid rgba(255,255,255,0.10)`
  - Subtle: `rgba(255,255,255,0.025)` + `1px solid rgba(255,255,255,0.055)`

## Motion

- **Approach:** Expressive — scroll-driven reveals, spring settles, cinematic pacing
- **Easing:**
  - Enter: `cubic-bezier(0.16, 1, 0.3, 1)` (Spades expo)
  - Exit: `cubic-bezier(0.4, 0, 0.2, 1)`
  - Spring feel: overshoot on interactive elements only
- **Duration:**
  - Micro: 150ms (hover, focus)
  - Short: 250ms (buttons)
  - Medium: 400–650ms (cards, sections)
  - Long: 900ms (hero stagger, major reveals)
- **Rules:**
  - Stagger hero elements 120–200ms apart
  - Scroll reveals use IntersectionObserver + translateY(24px) → 0
  - Device mockup: slow float (8s ease-in-out)
  - Atmospheric orb: 28s drift alternate
  - `prefers-reduced-motion`: opacity-only, no translate/scale loops

## Showcase-Specific Patterns

- **iOS-first framing:** iPhone device frames as primary visual — not browser chrome or dashboard screenshots
- **CTA hierarchy:** Primary = "Join TestFlight" / "Get notified"; Secondary = "See how it works"
- **Sections:** Hero → Positioning (tutor vs research) → App screens → How it works → Footer
- **No scroll-snap:** Smooth native scroll with scroll-driven animation (fixes jank from prior snap-page)

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-02 | iOS showcase, not web-app marketing | Product pivot to native SwiftUI app |
| 2026-07-02 | Space Mono only, gold accent `#d4a74a` | Spades brand continuity from OLD PHI |
| 2026-07-02 | Expressive motion, no scroll-snap | User asked for polished smooth animation; snap felt janky |
| 2026-07-02 | Pretext-native HTML for text layout | design-html skill; resize-aware typography |
