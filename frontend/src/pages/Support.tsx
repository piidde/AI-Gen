import { Link } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";

export default function Support() {
  return <PublicCatalogueShell><div className="help-page">
    <header className="help-intro"><p className="eyebrow">AIAPI.DEALS HELP</p><h1>Help &amp; support</h1><p>Answers for failed requests, payments, API keys and account access.</p></header>
    <nav className="section-links" aria-label="On this page"><a href="#help-topics">Common topics</a><a href="#safe-details">Safe details to share</a><a href="#contact-channel">Contact support</a></nav>
    <section id="help-topics" className="help-section" tabIndex={-1}><h2>Start with your question</h2>
      <div className="help-grid">
        <article className="panel"><h3>Requests and credits</h3><p>Every request in your usage history shows its result and what it cost. A failed request is refunded only when our provider charged nothing for it. If a result is unclear, check the request before you send it again, so you don't pay twice.</p><Link className="text-link" to="/dashboard/usage">Check a request</Link></article>
        <article className="panel"><h3>Payments and documents</h3><p>Check the order status before you buy again. Each order shows its receipt or invoice and a summary you can copy for support.</p><Link className="text-link" to="/dashboard/billing">Review an order</Link></article>
        <article className="panel"><h3>Connecting your application</h3><p>Create a key in the dashboard and keep it on your server, never in browser code. The quickstart shows the first request.</p><Link className="text-link" to="/docs">Quickstart</Link></article>
        <article className="panel"><h3>Service or model trouble</h3><p>The status page lists open incidents and models our provider has closed.</p><Link className="text-link" to="/status">Check service status</Link></article>
        <article className="panel"><h3>Account access</h3><p>Reset your password or change your account settings.</p><Link className="text-link" to="/forgot-password">Reset a password</Link><br /><Link className="text-link" to="/dashboard/settings">Account settings</Link></article>
        <article className="panel"><h3>Model choices and prices</h3><p>Compare prices, billing units and model notes. The model ID on each card is the one you use in your requests.</p><Link className="text-link" to="/models">See all models</Link></article>
      </div>
    </section>
    <section id="safe-details" className="help-section" tabIndex={-1}><h2>Safe details to share</h2><p>Open the request or order in your dashboard and use its copy button. Read the summary before you send it to us.</p><ul><li>Request or order ID, model ID, time with timezone, and the result you saw.</li><li>Billing status and error code, plus a short description of the problem.</li><li>Never send API keys, passwords, access tokens, payment-card details, prompts or generated content. Redact screenshots and logs.</li></ul><p>Dashboard links require sign-in.</p></section>
    <section id="contact-channel" className="help-section" tabIndex={-1}><h2>Contact support</h2><p>Our support address goes live with the public launch and will be listed here.</p><Link className="text-link" to="/contact">Contact information</Link></section>
  </div></PublicCatalogueShell>;
}
