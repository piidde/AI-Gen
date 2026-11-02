import { Link } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import CookiePreferences from "../components/CookiePreferences";
import { legalUpdatedOn, privacySections, termsSections, type LegalBlock, type LegalSection } from "../content/legal";

type PolicyKind = "contact" | "terms" | "privacy";
const titles = { contact: "Contact", terms: "Terms of service", privacy: "Privacy notice" };

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  if ("subheading" in block) return <h3>{block.subheading}</h3>;
  return <ul>{block.list.map(item => <li key={item}>{item}</li>)}</ul>;
}

function Section({ section }: { section: LegalSection }) {
  return <section id={section.id} className="help-section" tabIndex={-1}><h2>{section.heading}</h2>
    {section.blocks.map((block, index) => <Block block={block} key={index} />)}
  </section>;
}

export default function Policy({ kind }: { kind: PolicyKind }) {
  const legal = kind === "terms" ? termsSections : kind === "privacy" ? privacySections : [];
  const sections: [string, string][] = kind === "contact"
    ? [["support", "Customer support"], ["business", "Business and legal contact"]]
    : [...legal.map(section => [section.id, section.heading] as [string, string]), ...(kind === "privacy" ? [["cookie-preferences", "Cookie preferences"] as [string, string]] : [])];
  return <PublicCatalogueShell><div className="help-page policy-page">
    <header className="help-intro"><p className="eyebrow">SERVICE INFORMATION</p><h1>{titles[kind]}</h1>
      {kind === "contact"
        ? <p className="content-gate">Our contact details go live with the public launch.</p>
        : <p>Last updated <time dateTime={legalUpdatedOn}>27 October 2026</time></p>}
    </header>
    <nav className="section-links" aria-label="On this page">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    {legal.map(section => <Section section={section} key={section.id} />)}
    {kind === "privacy" && <CookiePreferences />}
    {kind === "contact" && <>
      <section id="support" className="help-section" tabIndex={-1}><h2>Customer support</h2><p>Our support address goes live with the public launch. Until then, the help page explains how to check requests and orders yourself.</p><Link className="text-link" to="/support">Help &amp; support</Link></section>
      <section id="business" className="help-section" tabIndex={-1}><h2>Business and legal contact</h2><p>Company details and the legal notice are published with the launch.</p></section>
    </>}
  </div></PublicCatalogueShell>;
}
