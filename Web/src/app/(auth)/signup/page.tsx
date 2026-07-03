import { AuthForm } from "@/components/auth/auth-form";

/**
 * /signup — renders the shared auth form in "signup" mode.
 *
 * Thin Server Component, same pattern as /login. The "Get early access" CTA on
 * the landing page links here.
 */
export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
