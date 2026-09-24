import { Link, useParams } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";

// Dedicated pages own every topic except the deliberately limited docs boundary.
export const topicSlugs = ["docs", "support", "status", "contact", "privacy", "terms"];

export default function Information({ missing = false }: { missing?: boolean }) {
  const { topic } = useParams();
  const docs = !missing && topic === "docs";
  return <PublicCatalogueShell><div className="help-page">
    <header className="help-intro">
      <h1 tabIndex={-1}>{docs ? "Documentation is being prepared" : "Page not found"}</h1>
      <p>{docs
        ? "Quickstart examples and API reference will follow the verified API contract. No provisional endpoint or request schema is presented as working documentation."
        : "This address is not part of the Takewing AI demo."}</p>
    </header>
    {docs && <section className="help-section"><h2>Before you integrate</h2><p>Model references are available for comparison. Supported public API IDs, authentication details and tested request examples will be documented before launch.</p><p>Documentation content and tested examples are being prepared. There is no working API example or documentation chatbot in this preview.</p><div className="actions"><Link className="text-link" to="/models">Explore model references</Link><Link className="text-link" to="/support">Help &amp; support</Link><Link className="text-link" to="/status">Service status</Link></div></section>}
    <div className="actions"><Link className="button" to="/">Back to home</Link></div>
  </div></PublicCatalogueShell>;
}
