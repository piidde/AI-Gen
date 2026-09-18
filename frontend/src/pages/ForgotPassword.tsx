import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import Button from "../components/Button";
import { getErrorMessage, getSafeNext } from "../auth/authUtils";
import { SUPABASE_CONFIG_ERROR, supabase } from "../auth/supabase";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const next = getSafeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    if (!supabase) {
      setError(SUPABASE_CONFIG_ERROR);
      setPending(false);
      return;
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/update-password` },
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setNotice("If an account exists for this email, a reset link is on its way.");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we’ll send you a secure reset link."
    >
      <form className="auth-form auth-form-top" onSubmit={(event) => void handleSubmit(event)}>
        <div className="auth-field">
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
        <Button className="auth-submit" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="auth-footer">
        Remember your password? <Link to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
