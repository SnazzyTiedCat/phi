import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/material/rename
 *
 * Gives ONE material a friendly display title WITHOUT changing its identity.
 *
 * Design choice (the lazy-but-correct one for an MVP): a material's identity is
 * its `source_name`, the key shared across five tables and baked into every
 * lesson URL (`/lesson?source=...`). Renaming the key itself would mean a
 * multi-table mutation that orphans rows on a partial failure — only safe inside
 * a transactional Postgres RPC. Instead we add ONE nullable column,
 * `sources.display_title`, and write the new label there. `source_name` stays
 * the stable key; read paths show `display_title ?? source_name`. Tradeoff: a
 * flat upload (no `sources` row) can't be renamed until it has one — acceptable
 * for the MVP, where every NEW upload gets a `sources` row from the mapping step.
 *
 * Auth/scoping mirrors /api/material/delete: the normal cookie-bound server
 * client (RLS restricts writes to the caller's own rows), the source_name comes
 * from the body but is only ever used UNDER the verified session's user_id, so
 * it can't touch another user's data. No service-role needed — this is a plain
 * row update on the user's own data, not a privileged operation.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1) Parse the body. Non-JSON is the caller's mistake → 400.
  let body: { source?: string; title?: string };
  try {
    body = (await request.json()) as { source?: string; title?: string };
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (source.length === 0) {
    return NextResponse.json({ error: "Missing source." }, { status: 400 });
  }
  if (title.length === 0) {
    return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
  }
  // Cap the length so a pasted essay can't bloat a row or break the sidebar layout.
  if (title.length > 200) {
    return NextResponse.json(
      { error: "Title is too long (200 characters max)." },
      { status: 400 },
    );
  }

  // 2) Verify the session. No user → 401.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 3) Write the title onto the material's `sources` row. We `upsert` (not just
  //    `update`) so a material that somehow has no `sources` row yet still gets
  //    one — keeping the rename working rather than silently no-op'ing. The
  //    onConflict mirrors the unique(user_id, source_name) constraint used by
  //    /api/upload, so re-renaming the same material updates the existing row.
  const { error } = await supabase
    .from("sources")
    .upsert(
      { user_id: user.id, source_name: source, display_title: title },
      { onConflict: "user_id,source_name" },
    );

  if (error) {
    console.error("[material/rename] update error:", error);
    return NextResponse.json(
      { error: "Could not rename this material. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, title });
}
