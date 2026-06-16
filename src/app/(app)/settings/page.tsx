import { redirect } from "next/navigation";

/**
 * /settings → /account.
 *
 * Settings was folded into the Account page (API key, appearance, tutor, data,
 * and account controls all live there now). This server-side redirect keeps old
 * bookmarks — and the existing "add your key in Settings" link in LessonView plus
 * the API error copy — pointing somewhere valid.
 */
export default function SettingsPage() {
  redirect("/account");
}
