import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import Button from "../components/Button";
import { useAuth } from "../auth/AuthProvider";
import { getAuthCallbackUrl, getErrorMessage, getSafeNext } from "../auth/authUtils";
import { SUPABASE_CONFIG_ERROR, supabase } from "../auth/supabase";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const { loading, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "password" | null>(null);

  useEffect(() => {
    if (!loading && session) navigate(next, { replace: true });
  }, [loading, navigate, next, session]);

  async function handleGoogle() {
    setError(null);
    setPending("google");
    if (!supabase) {
      setError(SUPABASE_CONFIG_ERROR);
      setPending(null);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthCallbackUrl(next) },
    });
    if (signInError) {
      setError(signInError.message);
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
      description="Start with Google or create an account using your email address."
    >
      <div className="auth-form auth-form-top">
        <Button
          className="auth-oauth"
          onClick={() => void handleGoogle()}
          disabled={pending !== null}
        >
          <span className="auth-provider-mark" aria-hidden="true">
            G
          </span>
          Continue with Google
        </Button>
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
        Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
