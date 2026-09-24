import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../auth/AuthProvider";
import { getErrorMessage, getSafeNext } from "../auth/authUtils";
import { supabase } from "../auth/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const { hash } = useLocation();
  const failedLink = searchParams.has("error") || new URLSearchParams(hash.slice(1)).has("error");
  const { loading, session } = useAuth();
  const exchangeStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (failedLink) {
      setError("This authentication link has expired, was already used, or could not be accepted. Request a new link or sign in again.");
      return;
    }
    if (loading || session) {
      if (session) navigate(next, { replace: true });
      return;
    }
    if (code && supabase) {
      if (exchangeStarted.current) return;
      exchangeStarted.current = true;
      void supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) {
          setError(getErrorMessage(exchangeError));
          return;
        }
        navigate(next, { replace: true });
      }).catch(caught => setError(getErrorMessage(caught)));
      return;
    }
    setError("No active session was returned. Please try signing in again.");
  }, [code, failedLink, loading, navigate, next, session]);

  return (
    <AuthShell
      title={error ? "Sign-in could not be completed" : "Signing you in…"}
      description={
        error
          ? "Return to sign in and try again."
          : "Completing the secure authentication handoff."
      }
    >
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="auth-success" role="status" aria-live="polite">
          One moment…
        </p>
      )}
      {error && <div className="auth-footer">
        <p><Link to={`/login?next=${encodeURIComponent(next)}`}>Return to sign in</Link></p>
        <p><Link to={`/signup?confirm=1&next=${encodeURIComponent(next)}`}>Request a new confirmation email</Link></p>
        <p><Link to={`/forgot-password?next=${encodeURIComponent(next)}`}>Request a new reset link</Link></p>
      </div>}
    </AuthShell>
  );
}
