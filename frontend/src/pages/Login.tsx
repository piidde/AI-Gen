import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import Button from "../components/Button";
import { useAuth } from "../auth/AuthProvider";
import { getAuthCallbackUrl, getErrorMessage, getSafeNext } from "../auth/authUtils";
import { SUPABASE_CONFIG_ERROR, supabase } from "../auth/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const { loading, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    setPending("password");
    if (!supabase) {
      setError(SUPABASE_CONFIG_ERROR);
      setPending(null);
      return;
    }
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      navigate(next, { replace: true });
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <AuthShell
      title="Sign in to Takewing AI"
      description="Use Google or your email and password to access the dashboard."
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
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="login-password">Password</label>
            <Link to={`/forgot-password?next=${encodeURIComponent(next)}`}>
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <Button className="auth-submit" type="submit" disabled={pending !== null}>
          {pending === "password" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="auth-footer">
        Don&apos;t have an account?{" "}
        <Link to={`/signup?next=${encodeURIComponent(next)}`}>Sign up</Link>
      </p>
    </AuthShell>
  );
}
