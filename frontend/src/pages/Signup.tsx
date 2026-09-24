import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import Button from "../components/Button";
import BillingProfileFields from "../components/BillingProfileFields";
import { demoSnapshot } from "../data/demoSnapshot";
import { useAuth } from "../auth/AuthProvider";
import { getAuthCallbackUrl, getErrorMessage, getSafeNext } from "../auth/authUtils";
import {
  isDiscordSignInEnabled,
  SUPABASE_CONFIG_ERROR,
  supabase,
} from "../auth/supabase";

type OAuthProvider = "google" | "discord";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const { loading, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [billing, setBilling] = useState(() => ({ ...demoSnapshot.profile.billing }));
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationError, setConfirmationError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<OAuthProvider | "password" | null>(null);

  useEffect(() => {
    if (!loading && session) navigate(next, { replace: true });
  }, [loading, navigate, next, session]);

  async function resendConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resending) return;
    setResending(true); setConfirmationMessage(""); setConfirmationError(false);
    try {
      if (!supabase) throw new Error(SUPABASE_CONFIG_ERROR);
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: confirmationEmail.trim(), options: { emailRedirectTo: getAuthCallbackUrl(next) } });
      if (resendError) throw resendError;
      setConfirmationMessage("If confirmation is needed for this account, a new link has been requested. Check your inbox and spam folder.");
    } catch (caught) { setConfirmationError(true); setConfirmationMessage(getErrorMessage(caught)); }
    finally { setResending(false); }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setPending(provider);
    if (!supabase) {
      setError(SUPABASE_CONFIG_ERROR);
      setPending(null);
      return;
    }
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getAuthCallbackUrl(next) },
      });
      if (signInError) setError(signInError.message);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setPending("password");
    if (!supabase) {
      setError(SUPABASE_CONFIG_ERROR);
      setPending(null);
      return;
    }
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: getAuthCallbackUrl(next) },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        navigate(next, { replace: true });
      } else {
        setNotice("Check your email to confirm your account, then sign in.");
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description={
        isDiscordSignInEnabled
          ? "Start with Google, Discord, or an account using your email address."
          : "Start with Google or create an account using your email address."
      }
    >
      <div className="auth-form auth-form-top">
        <Button
          className="auth-oauth auth-oauth-google"
          onClick={() => void handleOAuth("google")}
          disabled={pending !== null}
        >
          <img
            className="auth-provider-logo auth-provider-logo-google"
            src="/brand/google-g.svg"
            alt=""
            aria-hidden="true"
          />
          Continue with Google
        </Button>
        {isDiscordSignInEnabled && (
          <Button
            className="auth-oauth auth-oauth-discord"
            onClick={() => void handleOAuth("discord")}
            disabled={pending !== null}
          >
            <img
              className="auth-provider-logo auth-provider-logo-discord"
              src="/brand/discord-clyde-white.svg"
              alt=""
              aria-hidden="true"
            />
            Continue with Discord
          </Button>
        )}
        <div className="auth-divider" aria-hidden="true">
          <span>or use email</span>
        </div>
      </div>

      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="auth-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="signup-confirm-password">Confirm password</label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <details className="signup-billing">
          <summary>Optional billing details</summary>
          <p>Sample preview only: these details are not sent with signup and reset when you leave this page. You can skip this section.</p>
          <BillingProfileFields prefix="signup-billing" value={billing} onChange={setBilling} />
        </details>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth-success" role="status">
            {notice}
          </p>
        )}
        <Button className="auth-submit" type="submit" disabled={pending !== null}>
          {pending === "password" ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="auth-footer">
        With any available sign-in method, billing details can be completed later in Settings. No onboarding step is required.
        {" "}<Link to="/dashboard/settings">Complete billing details after sign-in</Link>
      </p>
      <p className="auth-footer">
        Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </p>
      <details open={searchParams.get("confirm") === "1" || undefined}>
        <summary>Confirmation link expired or missing?</summary>
        <form className="auth-form" onSubmit={event => void resendConfirmation(event)}>
          <div className="auth-field"><label htmlFor="confirmation-email">Confirmation email</label>
            <input id="confirmation-email" type="email" autoComplete="email" required value={confirmationEmail} disabled={resending} onChange={e => setConfirmationEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={resending}>{resending ? "Requesting confirmation…" : "Resend confirmation"}</Button>
          {confirmationMessage && <p role={confirmationError ? "alert" : "status"}>{confirmationMessage}</p>}
        </form>
      </details>
    </AuthShell>
  );
}
