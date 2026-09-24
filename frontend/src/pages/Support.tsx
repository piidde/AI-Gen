import { Link } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";

export default function Support() {
  return <PublicCatalogueShell><div className="help-page">
    <header className="help-intro"><p className="eyebrow">TAKEWING HELP</p><h1>Help &amp; support</h1><p>Find the right place to investigate a request, understand a payment, or prepare your integration.</p></header>
    <nav className="section-links" aria-label="On this page"><a href="#help-topics">Common topics</a><a href="#safe-details">Safe details to share</a><a href="#contact-channel">Contact support</a></nav>
    <section id="help-topics" className="help-section" tabIndex={-1}><h2>Start with your question</h2>
      <div className="help-grid">
        <article className="panel"><h3>Requests and credits</h3><p>Check the request outcome and its separate billing state. A failed request does not always mean that credits were restored. Avoid repeating a request with an uncertain billable outcome.</p><Link className="text-link" to="/dashboard/usage">Investigate a request</Link></article>
        <article className="panel"><h3>Payments and documents</h3><p>Review the order status before starting another purchase. Order details include safe context to copy and receipt or invoice availability.</p><Link className="text-link" to="/dashboard/billing">Review an order</Link></article>
        <article className="panel"><h3>Connecting your application</h3><p>Use documentation for the verified API contract. Keys belong in your server environment; the dashboard's sample keys cannot authenticate requests.</p><Link className="text-link" to="/docs">Documentation and quickstart</Link></article>
        <article className="panel"><h3>Service or model trouble</h3><p>Check source freshness and affected services before drawing conclusions. Dated model references do not establish current health.</p><Link className="text-link" to="/status">Check service status</Link></article>
        <article className="panel"><h3>Account access</h3><p>Recover a password or review your account settings. Account management previews are labelled where their changes are local only.</p><Link className="text-link" to="/forgot-password">Reset a password</Link><br /><Link className="text-link" to="/dashboard/settings">Account settings</Link></article>
        <article className="panel"><h3>Model choices and prices</h3><p>Compare reference variants, billing units and known limitations before integrating. Public API IDs and supported offers still need verification.</p><Link className="text-link" to="/models">Explore model references</Link></article>
      </div>
    </section>
    <section id="safe-details" className="help-section" tabIndex={-1}><h2>Safe details to share</h2><p>Open the request or order in your dashboard and use its safe-details copy button. Review the summary before sending it through the confirmed support channel.</p><ul><li>Request or order ID, model reference, timestamp with timezone, and visible outcome.</li><li>Billing status and the safe error code, plus a short description of the problem.</li><li>Never send API keys, passwords, access tokens, payment-card details, prompts or generated content. Redact screenshots and logs.</li></ul><p>This page does not collect or send support details. Dashboard links require sign-in.</p></section>
    <section id="contact-channel" className="help-section" tabIndex={-1}><h2>Contact support</h2><p>A verified support channel has not been selected. Contact details, operating hours and response expectations must be confirmed before launch.</p><Link className="text-link" to="/contact">Contact information</Link></section>
  </div></PublicCatalogueShell>;
}
