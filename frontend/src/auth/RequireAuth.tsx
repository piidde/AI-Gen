import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <main className="auth-page auth-loading" aria-busy="true">
        <div className="auth-card">
          <p>Checking your session…</p>
        </div>
      </main>
    );
  }

  if (!session) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate replace to={`/login?next=${encodeURIComponent(next)}`} />;
  }

  return children;
}
