import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import Button from "../components/Button";
import { useAuth } from "../auth/AuthProvider";
import { getAuthCallbackUrl, getErrorMessage, getSafeNext } from "../auth/authUtils";
import {
  isDiscordSignInEnabled,
  SUPABASE_CONFIG_ERROR,
  supabase,
} from "../auth/supabase";

type OAuthProvider = "google" | "discord";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const { loading, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<OAuthProvider | "password" | null>(null);

  useEffect(() => {
    if (!loading && session) navigate(next, { replace: true });
  }, [loading, navigate, next, session]);

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
      description={
        isDiscordSignInEnabled
          ? "Use Google, Discord, or your email and password to access the dashboard."
          : "Use Google or your email and password to access the dashboard."
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
