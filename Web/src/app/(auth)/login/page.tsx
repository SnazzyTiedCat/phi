import { AuthForm } from "@/components/auth/auth-form";

/**
 * /login — renders the shared auth form in "login" mode.
 *
 * Kept as a thin Server Component on purpose: all the interactivity lives in
 * <AuthForm>, so this page stays a server-rendered shell. If you later need to
 * redirect already-logged-in users away from here, do it in this file using
 * the server Supabase client + redirect().
 */
export default function LoginPage() {
  return <AuthForm mode="login" />;
}
