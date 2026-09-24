import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import Button from "../components/Button";
import { useAuth } from "../auth/AuthProvider";
import { getErrorMessage, getSafeNext } from "../auth/authUtils";
import { SUPABASE_CONFIG_ERROR, supabase } from "../auth/supabase";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const { loading, session } = useAuth();
  const { hash } = useLocation();
  const invalidLink = searchParams.has("error") || new URLSearchParams(hash.slice(1)).has("error");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || loading || !session || invalidLink) return;
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
    setPending(true);
    if (!supabase) {
      setError(SUPABASE_CONFIG_ERROR);
      setPending(false);
      return;
    }
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setNotice("Your password has been updated.");
      window.setTimeout(() => navigate(next, { replace: true }), 500);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="Set a new password for your Takewing AI account."
    >
      {!loading && (!session || invalidLink) && (
        <p className="auth-warning" role="alert">
          This page needs a valid password-reset link. Request a new one if the link has expired.
        </p>
      )}
      <form className="auth-form auth-form-top" onSubmit={(event) => void handleSubmit(event)}>
        <div className="auth-field">
          <label htmlFor="update-password">New password</label>
          <input
            id="update-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="update-confirm-password">Confirm new password</label>
          <input
            id="update-confirm-password"
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
        <Button className="auth-submit" type="submit" disabled={pending || loading || !session || invalidLink}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
      <p className="auth-footer">
        <Link to={`/forgot-password?next=${encodeURIComponent(next)}`}>Request a new reset link</Link>
      </p>
      <p className="auth-footer">
        <Link to={`/login?next=${encodeURIComponent(next)}`}>Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
