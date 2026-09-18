import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../auth/AuthProvider";
import { getErrorMessage, getSafeNext } from "../auth/authUtils";
import { supabase } from "../auth/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const { loading, session } = useAuth();
  const exchangeStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      });
      return;
    }
    setError("No active session was returned. Please try signing in again.");
  }, [code, loading, navigate, next, session]);

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
    </AuthShell>
  );
}
