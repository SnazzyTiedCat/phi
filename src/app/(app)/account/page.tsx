import { redirect } from "next/navigation";

/**
 * /account — the sidebar's Account link target.
 *
 * A dedicated account page doesn't exist yet; the account controls (Anthropic API
 * key + email confirmation) currently live on /settings. Rather than ship a dead
 * link OR rename /settings (which LessonView and the API error copy still point
 * at), this redirects /account → /settings. Swap in a real page here when the
 * account experience grows beyond settings.
 */
export default function AccountPage() {
  redirect("/settings");
}
