#!/usr/bin/env bash
#
# AI-3 recall runner — standalone, NOT part of the Phi app target.
#
# Unlike run-adversarial.sh, this script has NO manually mirrored prompts: it
# compiles Tools/recall-prompt.swift against the real app sources and asks it
# for the composed prompts, so what you test is exactly what ships.
#
# Usage:
#   ./run-recall.sh generate <lesson.md> [quiz-count]
#       → generates flashcards + quiz for the lesson, writes both transcripts.
#   ./run-recall.sh grade "<question>" "<sample answer>" "<student answer>"
#       → grades one attempt. Run three times per the verification doc:
#         deliberately correct, deliberately wrong, partially right.
#
# Requires: ANTHROPIC_API_KEY in the environment (never logged), jq, Xcode's
# swiftc (DEVELOPER_DIR=/Applications/Xcode.app if xcode-select points at CLT).

set -euo pipefail

MODEL="${ANTHROPIC_MODEL:-claude-sonnet-5}"
API_URL="https://api.anthropic.com/v1/messages"
API_VERSION="2023-06-01"

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ANTHROPIC_API_KEY is not set. export it and re-run (it is never logged)." >&2
  exit 1
fi
command -v jq >/dev/null 2>&1 || { echo "jq is required (brew install jq)." >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT_DIR="$SCRIPT_DIR/transcripts"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# Compile the prompt helper against the real sources (no drift possible).
HELPER="$OUT_DIR/.recall-prompt"
swiftc -o "$HELPER" \
  "$REPO_ROOT/Tools/recall-prompt.swift" \
  "$REPO_ROOT/Phi/AI/Recall/RecallShapes.swift" \
  "$REPO_ROOT/Phi/AI/Recall/RecallPrompts.swift" \
  "$REPO_ROOT/Phi/AI/Personas/TutorPersona.swift" \
  "$REPO_ROOT/Phi/AI/Personas/Generalist.swift"
"$HELPER" check

call_api() { # $1 system prompt, $2 user message, $3 max_tokens
  local body response
  body="$(jq -n --arg model "$MODEL" --argjson max_tokens "$3" \
    --arg system "$1" --arg user "$2" \
    '{model:$model, max_tokens:$max_tokens, system:$system,
      messages:[{role:"user", content:$user}]}')"
  response="$(curl -sS "$API_URL" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: $API_VERSION" \
    -H "content-type: application/json" \
    -d "$body")"
  echo "$response" | jq -r '(.content[0].text // .error.message // "<<no text>>")'
}

case "${1:-}" in
generate)
  LESSON_FILE="${2:?usage: run-recall.sh generate <lesson.md> [quiz-count]}"
  COUNT="${3:-6}"
  LESSON="$(cat "$LESSON_FILE")"
  USER_MSG="Lesson:

$LESSON"

  OUT="$OUT_DIR/recall-$STAMP.md"
  {
    echo "# AI-3 recall transcript — $STAMP"
    echo
    echo "- Model: \`$MODEL\`"
    echo "- Lesson: \`$LESSON_FILE\`"
    echo "- Prompts: compiled from app sources via Tools/recall-prompt.swift"
    echo
    echo "## Flashcards"
    echo
    call_api "$("$HELPER" flashcards)" "$USER_MSG" 3072
    echo
    echo "## Quiz ($COUNT questions)"
    echo
    call_api "$("$HELPER" quiz "$COUNT")" "$USER_MSG" 4096
    echo
  } > "$OUT"
  echo "Transcript written: $OUT"
  echo "Grade it against the checklist in AI-3-RecallVerification.md."
  ;;
grade)
  Q="${2:?usage: run-recall.sh grade <question> <sample_answer> <student_answer>}"
  S="${3:?missing sample answer}"
  A="${4:?missing student answer}"
  OUT="$OUT_DIR/grade-$STAMP.md"
  {
    echo "# AI-3 grading transcript — $STAMP"
    echo
    echo "- Model: \`$MODEL\`"
    echo "- Question: $Q"
    echo "- Student answer: $A"
    echo
    call_api "$("$HELPER" grading)" "$("$HELPER" grade-user "$Q" "$S" "$A")" 512
    echo
  } | tee "$OUT"
  ;;
*)
  echo "usage: run-recall.sh generate <lesson.md> [quiz-count] | grade <q> <sample> <student>" >&2
  exit 1
  ;;
esac
