import type { ReactNode } from "react";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";

export default function PublicCatalogueShell({ children }: { children: ReactNode }) {
  return <div className="public-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <PublicHeader />
    <main id="main-content" tabIndex={-1}>{children}</main>
    <PublicFooter />
  </div>;
}
