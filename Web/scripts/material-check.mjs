// Smallest runnable check for the material delete/rename logic.
// Run: node scripts/material-check.mjs   (exits non-zero on failure)
//
// We can't hit Supabase here (no session, no DB), so we test the ONE piece of
// each route that has real logic and would break silently: the delete route's
// LIKE-escaping (a bad escape over-matches and nukes unrelated lessons) and the
// rename route's title validation (the trust-boundary guard). These mirror the
// exact expressions in route.ts — keep them in sync if those change.

let failures = 0;
function check(name, got, want) {
  const ok = got === want;
  if (!ok) {
    failures++;
    console.error(`FAIL ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// --- delete: LIKE escaping (mirrors escapeLike + sectionPattern) ---
const escapeLike = (s) => s.replace(/([\\%_])/g, "\\$1");
const sectionPattern = (s) => `${escapeLike(s)}\\_section\\_%`;

// A plain filename: only the "_section_" literal underscores get escaped.
check("escape plain", escapeLike("notes.pdf"), "notes.pdf");
// A filename WITH underscores: each underscore must be escaped so it can't act
// as a single-char wildcard and match unrelated rows.
check("escape underscores", escapeLike("my_data_v2.pdf"), "my\\_data\\_v2.pdf");
// A % in the name must be escaped too (else it's a multi-char wildcard).
check("escape percent", escapeLike("50%off.pdf"), "50\\%off.pdf");
// Full section pattern for an underscore-laden name.
check(
  "section pattern",
  sectionPattern("a_b.pdf"),
  "a\\_b.pdf\\_section\\_%",
);

// --- rename: title validation (mirrors the route's guards) ---
function validateTitle(raw) {
  const title = typeof raw === "string" ? raw.trim() : "";
  if (title.length === 0) return { ok: false, reason: "empty" };
  if (title.length > 200) return { ok: false, reason: "too-long" };
  return { ok: true, title };
}
check("title empty", validateTitle("   ").ok, false);
check("title trimmed", validateTitle("  Hello  ").title, "Hello");
check("title too long", validateTitle("x".repeat(201)).ok, false);
check("title ok", validateTitle("Calculus Notes").ok, true);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll material logic checks passed.");
