import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Brand from "./Brand";
import { isSupabaseConfigured } from "../auth/supabase";

export default function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page" id="main-content">
      <div className="auth-top">
        <Brand />
        <Link className="text-link" to="/">
          Back to home
        </Link>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title" tabIndex={-1}>
          {title}
        </h1>
        <p className="auth-description">{description}</p>
        {!isSupabaseConfigured && (
          <p className="auth-warning" role="alert">
            Supabase Auth is not configured locally yet.
          </p>
        )}
        {children}
      </section>
    </main>
  );
}
