import Foundation

/// One tutor personality: a stable identity string, a display name, and the
/// identity half of the system prompt.
///
/// Deliberately a thin plain struct — same precedent as `Material`. This is
/// static configuration authored in source, not runtime state, so it carries no
/// observation machinery (`@Observable`/`ObservableObject`) and no persistence.
/// A persona is a value you read, compose into a prompt, and forget.
///
/// `id` is a hand-written string (`"generalist"`), NOT a `UUID`: it is the
/// stable key that a future persona-picker and any persisted "which tutor did
/// this student pick" record will reference. Once a persona ships, its `id` is
/// frozen — rename `displayName` freely, never `id`.
///
/// There is intentionally NO `color` field. Persona color is the UI track's
/// concern (Tutor Capsule tint, picker swatches); baking it in here would couple
/// this prompt-architecture module to presentation and force a rebuild of the AI
/// layer every time a designer nudges a hue. The prompt layer stays UI-agnostic.
struct TutorPersona: Identifiable {
    /// Stable identity key. Frozen once shipped — never renamed.
    let id: String
    /// Human-facing name shown in persona pickers and the Tutor Capsule.
    let displayName: String
    /// The persona's voice and pedagogy — the identity half of the composed
    /// system prompt. Guardrails are appended separately by `PromptComposer`,
    /// not stored here, so one guardrail block stays authoritative across every
    /// persona.
    let identityPrompt: String
}
