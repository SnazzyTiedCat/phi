#!/usr/bin/env bash
# BE-4 runnable proof: generate-once semantics + cross-user denial on ios.lessons.
#
# Prereqs (dashboard): Anonymous Sign-Ins ON, `ios` in exposed schemas, and
# ios_materials_foundation.sql + ios_learning_chain.sql +
# ios_generated_content_cache.sql applied. Run from the repo root:
#   bash Docs/supabase/be4_verification.sh
# Exits non-zero on the first failed claim. Cleans up after itself.
set -euo pipefail

URL=${SUPABASE_URL:-$(grep '^SUPABASE_URL' Config/Secrets.xcconfig | sed 's/.*= *//; s|\$()||')}
KEY=${SUPABASE_ANON_KEY:-$(grep '^SUPABASE_ANON_KEY' Config/Secrets.xcconfig | sed 's/.*= *//')}
REST="$URL/rest/v1"; pass() { echo "PASS  $1"; }; fail() { echo "FAIL  $1"; exit 1; }

anon_token() { # new anonymous identity -> access token
  curl -sf -X POST "$URL/auth/v1/signup" -H "apikey: $KEY" \
    -H "Content-Type: application/json" -d '{}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])' 2>/dev/null
}
req() { # method path token [json] [extra header]
  curl -s -X "$1" "$REST/$2" -H "apikey: $KEY" -H "Authorization: Bearer $3" \
    -H "Content-Profile: ios" -H "Accept-Profile: ios" -H "Content-Type: application/json" \
    -H "Prefer: return=representation${5:+,$5}" ${4:+-d "$4"}
}
jql() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

TOKEN_A=$(anon_token) || fail "anonymous sign-in (is it enabled in the dashboard?)"
UID_A=$(python3 -c "import base64,json,sys;t='$TOKEN_A'.split('.')[1];print(json.loads(base64.urlsafe_b64decode(t+'='*(-len(t)%4)))['sub'])")
H1=1111111111111111111111111111111111111111111111111111111111111111
H2=2222222222222222222222222222222222222222222222222222222222222222

MAT=$(req POST "materials" "$TOKEN_A" "{\"user_id\":\"$UID_A\",\"title\":\"be4-test\",\"content_hash\":\"$H1\"}" | jql 'd[0]["id"]') \
  && pass "identity A created a material" || fail "material insert (is ios exposed + SQL applied?)"

L1=$(req POST "lessons" "$TOKEN_A" "{\"user_id\":\"$UID_A\",\"material_id\":\"$MAT\",\"section_index\":0,\"title\":\"t\",\"content\":\"v1\",\"content_hash\":\"$H1\"}")
LID=$(echo "$L1" | jql 'd[0]["id"]') && pass "lesson persisted"

HIT=$(req GET "lessons?material_id=eq.$MAT&content_hash=eq.$H1&select=id" "$TOKEN_A" | jql 'len(d)')
[ "$HIT" = 1 ] && pass "cache hit: fresh-hash row returned (client makes zero generation calls)" || fail "cache hit"

# regenerate: upsert on the unique key must REPLACE, keep the id, not duplicate
R=$(req POST "lessons?on_conflict=user_id,material_id,section_index" "$TOKEN_A" \
  "{\"user_id\":\"$UID_A\",\"material_id\":\"$MAT\",\"section_index\":0,\"title\":\"t\",\"content\":\"v2\",\"content_hash\":\"$H2\"}" \
  "resolution=merge-duplicates")
[ "$(echo "$R" | jql 'd[0]["id"]')" = "$LID" ] && pass "regenerate replaced in place — lesson id stable (chat history survives)" || fail "upsert changed the lesson id"
N=$(req GET "lessons?material_id=eq.$MAT&select=id" "$TOKEN_A" | jql 'len(d)')
[ "$N" = 1 ] && pass "no duplicate row after regenerate" || fail "regenerate duplicated ($N rows)"

req DELETE "lessons?material_id=eq.$MAT&content_hash=neq.$H2" "$TOKEN_A" >/dev/null && pass "stale-hash cleanup statement accepted"

TOKEN_B=$(anon_token)
NB=$(req GET "lessons?material_id=eq.$MAT&select=id" "$TOKEN_B" | jql 'len(d)')
[ "$NB" = 0 ] && pass "identity B cannot READ A's lesson (0 rows)" || fail "cross-user read NOT denied"
WB=$(req POST "lessons" "$TOKEN_B" "{\"user_id\":\"$UID_A\",\"material_id\":\"$MAT\",\"section_index\":9,\"title\":\"x\",\"content\":\"x\",\"content_hash\":\"$H2\"}")
echo "$WB" | grep -q '"code"' && pass "identity B cannot WRITE as A (rejected: $(echo "$WB" | jql 'd["code"]'))" || fail "cross-user write NOT denied"

req DELETE "materials?id=eq.$MAT" "$TOKEN_A" >/dev/null && pass "cleanup: material delete cascades"
echo "ALL PASS — record the date + result in Docs/supabase/rls_audit.md"
