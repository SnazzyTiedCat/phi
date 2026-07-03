import Foundation

/// What the tutor is doing right now. The *voice* is constant across modes —
/// only pacing and depth shift — so this enum stays small and pacing lives in
/// one `switch`, not scattered per persona.
enum InteractionMode {
    /// Working through new material for the first time.
    case lessonTeaching
    /// Quick review of already-covered material.
    case recap
    /// Re-explaining something the student found hard, more plainly.
    case simplify
}

/// Assembles a full system prompt from a persona, a mode, and optional context.
///
/// Pure and static — no state, no I/O, no dependencies. The whole module is
/// this one function: `identityPrompt` + `Guardrails.block` + a one-line pacing
/// hint + any appended context. Keeping composition in a single place is what
/// lets guardrails stay authoritative (every persona gets the same block, in
/// the same position) without a base-class or protocol ceremony.
enum PromptComposer {
    static func build(
        for persona: TutorPersona,
        mode: InteractionMode,
        context: String? = nil
    ) -> String {
        var prompt = """
        \(persona.identityPrompt)

        \(Guardrails.block)

        \(pacing(for: mode))
        """

        // `context` is nil-safe and, this chunk, always nil in practice: the
        // hook is here so retrieval (injecting the relevant slice of uploaded
        // material) lands later without touching this signature. NO chunk/
        // retrieval logic lives here yet — that's a separate chunk's job.
        if let context, !context.isEmpty {
            prompt += "\n\n── Reference material for this turn ──\n\(context)"
        }

        return prompt
    }

    /// One pacing line per mode. Voice is owned by the persona; this only tells
    /// the tutor how fast and how deep to go right now.
    private static func pacing(for mode: InteractionMode) -> String {
        switch mode {
        case .lessonTeaching:
            return "Right now: teach this material for the first time. Take it in steps, check understanding as you go, and don't rush ahead of the student."
        case .recap:
            return "Right now: this is a quick recap of material already covered. Hit the key points briefly, surface what's most likely to be forgotten, and keep it tight."
        case .simplify:
            return "Right now: the student found this hard. Re-explain it more plainly — smaller steps, a concrete example — without talking down to them."
        }
    }
}
