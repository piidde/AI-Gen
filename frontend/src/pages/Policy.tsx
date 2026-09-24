import { Link } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import CookiePreferences from "../components/CookiePreferences";

type PolicyKind = "contact" | "terms" | "privacy";
const titles = { contact: "Contact", terms: "Terms of service", privacy: "Privacy information" };

export default function Policy({ kind }: { kind: PolicyKind }) {
  const sections = kind === "terms" ? [["service", "Service scope"], ["credits", "Prepaid credits"], ["requests", "Requests and refunds"], ["deletion", "Account deletion"], ["publication", "Before publication"]]
    : kind === "privacy" ? [["account-data", "Account and request data"], ["sharing", "Sharing and retention"], ["cookie-preferences", "Cookie preferences"], ["publication", "Before publication"]]
    : [["support", "Customer support"], ["business", "Business and legal contact"]];
  return <PublicCatalogueShell><div className="help-page policy-page">
    <header className="help-intro"><p className="eyebrow">SERVICE INFORMATION</p><h1>{titles[kind]}</h1><p>Content review dated <time dateTime="2026-09-20">20 September 2026</time></p>
      <p className="content-gate">{kind === "terms" ? "Product-policy summary for review — not published legal terms. The local demo does not offer a paid service." : kind === "privacy" ? "Data-handling summary for review — not a published privacy notice. Final disclosures are pending." : "Verified contact information is pending. No contact channel or response-time commitment is currently published."}</p>
    </header>
    <nav className="section-links" aria-label="On this page">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    {kind === "terms" && <>
      <section id="service" className="help-section" tabIndex={-1}><h2>Service scope</h2><p>The agreed launch scope is API access for image and text workloads through your own application or tools. Model references in this demo are not a commitment to supported production models.</p></section>
      <section id="credits" className="help-section" tabIndex={-1}><h2>Prepaid credits</h2><p>The accepted product policy is that purchased credits never expire. Package bonuses add wallet credits; they do not change a model's credit rate. USD is the accounting and checkout currency. Any EUR display is an approximate estimate.</p></section>
      <section id="requests" className="help-section" tabIndex={-1}><h2>Requests and refunds</h2><p>For an unfulfilled failed purchase, captured funds are returned. A failed request restores credits only when no upstream cost was incurred. Policy rejections that incur a charge remain charged. Request outcome and billing state must be checked separately.</p><p>An uncertain outcome must be investigated before repeating a potentially billable request. Provider-specific payment, refund and document procedures still need confirmation.</p><Link className="text-link" to="/support#safe-details">Prepare safe support details</Link></section>
      <section id="deletion" className="help-section" tabIndex={-1}><h2>Account deletion</h2><p>The accepted self-service deletion policy forfeits remaining credits and ends API access. The confirmation flow must make those consequences clear. The current dashboard only previews deletion; it does not delete an account.</p></section>
      <section id="publication" className="help-section" tabIndex={-1}><h2>Before publication</h2><p>The service operator, applicable commercial terms, payment procedures and required legal disclosures remain to be supplied and reviewed. This summary does not establish a contract or replace that review.</p></section>
    </>}
    {kind === "privacy" && <>
      <section id="account-data" className="help-section" tabIndex={-1}><h2>Account and request data</h2><p>The existing sign-in flow uses Supabase authentication. Dashboard requests and payment histories are fictional samples. Account-management previews identify which changes remain local; the display-name form saves through the existing authentication client.</p><p>The intended service records operational request metadata for usage and billing. Prompts and outputs are excluded from logging by default, and permanent generated-image storage is not planned unless technically necessary. These are implementation requirements, not a verified production retention guarantee.</p></section>
      <section id="sharing" className="help-section" tabIndex={-1}><h2>Sharing and retention</h2><p>Final processors, processing locations, retention periods and deletion exceptions are not confirmed. No EU-only processing or zero-retention claim is made. Never put credentials, prompts or generated content into a support report.</p></section>
      <CookiePreferences />
      <section id="publication" className="help-section" tabIndex={-1}><h2>Before publication</h2><p>Controller identity, contact details, purposes and legal bases, recipients, international transfers, retention and rights procedures must be reviewed against the actual service before launch.</p><Link className="text-link" to="/contact">Contact information</Link></section>
    </>}
    {kind === "contact" && <>
      <section id="support" className="help-section" tabIndex={-1}><h2>Customer support</h2><p>The team has not selected a verified public support channel or published response expectations. Until that information is available, the help page explains how to investigate requests and orders without sharing secrets.</p><Link className="text-link" to="/support">Help &amp; support</Link></section>
      <section id="business" className="help-section" tabIndex={-1}><h2>Business and legal contact</h2><p>Operator identity, business address and required contact disclosures await owner confirmation and review. No sample email address or contact form is presented as a working channel.</p></section>
    </>}
  </div></PublicCatalogueShell>;
}
