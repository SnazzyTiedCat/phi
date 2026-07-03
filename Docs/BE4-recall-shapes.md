# AI-3 → BE-4: Recall artifact shapes (published for Builder 2)

Stable as of AI-3. Source of truth: `Phi/AI/Recall/RecallShapes.swift`.
Wire keys match the web app's existing `quizzes.questions` jsonb shape
(`multiple_choice`, `sample_answer`, 0-based `correct`) so both clients can
share persisted rows.

## Flashcard (array per lesson)

```json
{ "front": "retrieval cue — a question, never a blanked-out sentence",
  "back":  "concise answer in the lesson's terms" }
```

## QuizQuestion (array per lesson)

```json
{ "question": "…", "type": "multiple_choice",
  "options": ["…","…","…","…"], "correct": 0,
  "explanation": "shown only AFTER the attempt" }

{ "question": "…", "type": "short_answer",
  "sample_answer": "concise model answer",
  "explanation": "shown only AFTER the attempt" }
```

`explanation` is required on every question. `options`/`correct` are
multiple-choice-only; `sample_answer` is short-answer-only.

## ShortAnswerGrade (per attempt — live, NOT cached; every attempt differs)

```json
{ "verdict": "correct" | "partial" | "incorrect",
  "feedback": "1–3 tutor-voice sentences" }
```

## Cache key (the "one generation per lesson per artifact type" constraint)

`Recall.cacheKey(lesson:artifact:)` = SHA-256 hex of
`"<artifact>\n<trimmed lesson text>"`, where artifact is `"flashcards"` or
`"quiz"`. Same lesson text → same key; any real lesson edit → new key →
regeneration is correct. Suggested unique constraint:
`(user_id, cache_key)` with the artifact type baked into the key.
