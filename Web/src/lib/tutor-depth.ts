/**
 * Explanation depth — the student's "Tutor" setting (Account → Tutor).
 *
 * This is the seed of the future tutor-persona system: a single knob today, but
 * the same shape a richer persona config will grow into. It maps a stored
 * preference to a line we append to the lesson/chat system prompts.
 *
 *   "concise"  → tighten the teaching
 *   "standard" → no extra line (the prompts' default voice)
 *   "thorough" → expand with more examples/context
 *
 * Stored in localStorage as `phi_explanation_depth` on the client; the value is
 * sent in the request body to /api/lesson and /api/chat, which call this to turn
 * it into a prompt instruction. `unknown` in, because it arrives over the wire.
 */
export type ExplanationDepth = "concise" | "standard" | "thorough";

export const EXPLANATION_DEPTH_KEY = "phi_explanation_depth";

export function depthInstruction(depth: unknown): string {
  switch (depth) {
    case "concise":
      return "Be brief — short paragraphs, minimal elaboration.";
    case "thorough":
      return "Elaborate with additional examples and context.";
    default:
      // "standard" (or anything unrecognised) → keep the prompt's default voice.
      return "";
  }
}
