import { Link } from "react-router-dom";
import HomeDashboardPreview from "../components/HomeDashboardPreview";
import Icon from "../components/Icon";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import SavingsCalculator from "../components/SavingsCalculator";
import ApiExample from "../components/ApiExample";
import { snapshot } from "../content/catalogue";
import { familyPages } from "../content/modelFamilies";
import { deals, maxDealPercent, share, subtract, usd, type Deal } from "../content/homeDeals";
import type { ExactAmount } from "../lib/pricing";
import { Mention, ProviderLogo } from "../components/ProviderLogo";
import "../styles/home.css";

/** Large price display: a rounded amount keeps a small, still readable "≈" marker. */
function Money({ amount, kind = "ours" }: { amount: ExactAmount; kind?: "ours" | "reference" }) {
  const text = usd(amount, kind);
  return text.startsWith("≈ ") ? <><span className="deal-approx" title="Rounded">≈</span>{text.slice(2)}</> : <>{text}</>;
}

function detailsHref(deal: Deal) {
  const page = familyPages.find(entry => entry.family === deal.family);
  return page ? `/models/${page.slug}` : `/models?q=${encodeURIComponent(deal.id)}`;
}

function DealCard({ deal }: { deal: Deal }) {
  const [main, second] = deal.rates;
  const image = deal.modality === "image";
  return (
    <article className="deal-card">
      <span className="deal-burst" aria-hidden="true">−{main!.percent}%</span>
      <div className="deal-card-meta">{deal.provider} · {image ? "Image" : "Text"}</div>
      <h3><ProviderLogo name={deal.name} size={22} /> {deal.name}</h3>
      <div className="deal-card-price">
        <s className="deal-strike"><span className="sr-only">Official price </span>{usd(main!.official, "reference")}</s>
        <strong><Money amount={main!.ours} /></strong>
        <span className="deal-card-bar" aria-hidden="true"><i style={{ width: `${Math.max(share(main!.ours, main!.official), 3)}%` }} /></span>
      </div>
      <div className="deal-card-unit">{image ? "per request" : "per 1M input tokens"}{second && <> · output {usd(second.ours)} <s className="deal-strike">{usd(second.official, "reference")}</s></>}</div>
      <div className="deal-card-saving"><b>Save up to {main!.percent}%</b> {usd(subtract(main!.official, main!.ours), "saving")} {image ? "per image" : "per 1M input"}</div>
      <div className="deal-card-basis">{deal.basis}</div>
      <Link className="deal-card-link" to={detailsHref(deal)}>Model details ↗</Link>
    </article>
  );
}

export default function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="home-preview">
        Up to <b>{maxDealPercent}% below</b> official API list prices · Preview: paid API access is not live yet
      </div>
      <div className="home-wrap">
        <PublicHeader />
      </div>

      <main id="main-content" tabIndex={-1}>
        <div className="home-wrap">
          <section className="home-hero" aria-labelledby="home-title">
            <div className="home-hero-copy">
              <div className="deal-flag">Price drop · <Mention name="OpenAI" /> &amp; <Mention name="Google" /> models</div>
              <h1 id="home-title">Official AI.<br /><span>Up to {maxDealPercent}% off.</span></h1>
              <p>The same <Mention name="GPT Image" />, <Mention name="Nano Banana" />, <Mention name="GPT-6" /> and <Mention name="Gemini" /> models through one API, for a fraction of the official list price.</p>
              <div className="home-actions">
                <Link className="button" to="/signup">Get started</Link>
                <Link className="button secondary" to="/models">See all prices</Link>
              </div>
              <ul className="home-trust">
                <li><Icon name="check" />Prepaid credits</li>
                <li><Icon name="check" />No subscription</li>
                <li><Icon name="check" />Credits never expire</li>
              </ul>
            </div>
            <div className="home-hero-calculator" id="calculator">
              <SavingsCalculator />
              <span className="deal-burst deal-burst-large" aria-hidden="true"><small>Save up to</small>{maxDealPercent}%</span>
            </div>
          </section>
        </div>

        <div className="deal-ticker" aria-label="Savings overview">
          <div className="home-wrap">
            {deals.map(deal => <span key={deal.id}><b>−{deal.rates[0]!.percent}%</b> <ProviderLogo name={deal.name} size={14} /> {deal.name}</span>)}
          </div>
        </div>

        <div className="home-wrap">
          <section className="home-section" aria-labelledby="home-models-title">
            <div className="home-sectionhead">
              <h2 id="home-models-title">Low prices. Every day.</h2>
              <p>Crossed out: what the provider charges. Big number: what you pay here. Fixed rates for the same models, with no flash sales and no coupons.</p>
            </div>
            <div className="deal-grid">
              {deals.map(deal => <DealCard deal={deal} key={deal.id} />)}
            </div>
            <div className="home-sectionnote">
              <p>Preview rates in USD, price basis {snapshot.checkedOn}. Percentages compare published rates before rounding; image examples use the stated settings and exclude extra usage. Actual savings depend on your request.</p>
              <Link className="text-link" to="/models">See all models &amp; prices ↗</Link>
            </div>
          </section>
        </div>

        <section className="home-how" aria-labelledby="home-how-title">
          <div className="home-wrap">
            <div className="home-sectionhead">
              <h2 id="home-how-title">How it works</h2>
              <p>Your app talks to one API. We route each request to the official model and bill only what it costs at our rate.</p>
            </div>
            <div className="flow-diagram" role="img" aria-label="Your app sends a request with your API key to AIAPI.deals, which checks your key and balance and routes it to OpenAI or Google. The result and the exact charge come back to your app.">
              <div className="flow-node">
                <span className="flow-node-label">Your app</span>
                <code>POST /v1/chat/completions</code>
                <p>Any language, any framework. Just HTTPS and your API key.</p>
              </div>
              <div className="flow-link" aria-hidden="true"><span>request →</span><span>← result</span></div>
              <div className="flow-node flow-node-core">
                <span className="flow-node-label">AIAPI.deals</span>
                <ul>
                  <li>Checks your key and balance</li>
                  <li>Reserves credits at our rate</li>
                  <li>Logs the exact charge</li>
                </ul>
              </div>
              <div className="flow-link" aria-hidden="true"><span>routed →</span><span>← output</span></div>
              <div className="flow-node">
                <span className="flow-node-label">Official models</span>
                <div className="flow-providers">
                  <span><ProviderLogo name="OpenAI" size={22} />OpenAI</span>
                  <span><ProviderLogo name="Gemini" size={22} />Google</span>
                </div>
                <p><Mention name="GPT Image" />, <Mention name="GPT-6" />, <Mention name="Nano Banana" /> and <Mention name="Gemini" />.</p>
              </div>
            </div>
            <ol className="home-steps">
              <li><span className="home-step-number">1</span><div><h3>Top up credits</h3><p>Prepaid and pay as you go. Credits never expire.</p></div><Icon name="wallet" /></li>
              <li><span className="home-step-number">2</span><div><h3>Create an API key</h3><p>One key per integration, revocable any time.</p></div><Icon name="keys" /></li>
              <li><span className="home-step-number">3</span><div><h3>Call the API &amp; save</h3><p>Every request and its charge appear in your usage history.</p></div><Icon name="requests" /></li>
            </ol>
          </div>
        </section>

        <section className="home-dev" aria-labelledby="home-dev-title">
          <div className="home-wrap">
            <div className="home-dev-head">
              <h2 id="home-dev-title">One API. Image and text.</h2>
              <p>Use the <Mention name="OpenAI" />-style chat format you already know, or start image jobs and poll for the result. Swap models by changing one ID.</p>
            </div>
            <ApiExample />
            <ul className="home-dev-features">
              <li><Icon name="text" /><h3><Mention name="OpenAI" />-style chat</h3><p>Send the chat format you already use and switch models with one ID.</p></li>
              <li><Icon name="image" /><h3>Image jobs</h3><p>Start a job with an idempotency key, then poll the request for the result.</p></li>
              <li><Icon name="usage" /><h3>Exact charge</h3><p>Every request shows what it cost in your usage history.</p></li>
              <li><Icon name="keys" /><h3>Keys you control</h3><p>Shown once, stored hashed and revocable any time.</p></li>
            </ul>
            <div className="home-dev-link"><Link className="text-link" to="/docs">Read the API docs ↗</Link></div>
          </div>
        </section>

        <div className="home-wrap">
          <section className="home-section home-product" aria-labelledby="home-dashboard-title">
            <div className="home-product-copy">
              <h2 id="home-dashboard-title" className="home-bighead">See every cent<br />you save.</h2>
              <p>Balance, usage over time and the cost of each single request, all in your dashboard.</p>
              <Link className="text-link" to="/login?next=%2Fdashboard">Explore the dashboard demo ↗</Link>
            </div>
            <HomeDashboardPreview />
          </section>
        </div>

        <section className="home-faq-band" aria-labelledby="home-faq-title">
          <div className="home-wrap home-faq">
            <div className="home-faq-intro">
              <h2 id="home-faq-title" className="home-bighead">The fine print</h2>
              <p>Short answers about cost, refunds and access. Anything else is covered in the support guide.</p>
              <Link className="text-link" to="/support">Help &amp; support ↗</Link>
            </div>
            <div className="home-faq-list">
            <details><summary>Can I generate images or text on this website?</summary><p>Generation is API-only. You use your own application or API client; this website manages your account, keys, billing and usage.</p></details>
            <details><summary>How much can I save?</summary><p>Our cards show savings against the stated official price reference. For images, check the size and quality in the comparison note. Your total depends on the model, settings and any additional input or thinking usage.</p></details>
            <details><summary>Are failed requests always refunded?</summary><p>Credits are restored for a failed request only when there is no upstream cost. A billed policy rejection stays charged. If a result is uncertain, inspect the request status before retrying.</p></details>
            <details><summary>Do I need a subscription?</summary><p>No. Use prepaid credits across image and text models, with no monthly subscription. Credits never expire. Paid access is not live yet.</p></details>
            <details><summary>Where can I check availability or get help?</summary><p>See <Link className="text-link" to="/status">service status</Link>, <Link className="text-link" to="/support">support guidance</Link> and the <Link className="text-link" to="/docs">API documentation</Link>. An unavailable status source does not mean the service is healthy.</p></details>
            </div>
          </div>
        </section>

        <section className="home-closing" aria-labelledby="home-closing-title">
          <div className="home-wrap">
            <h2 id="home-closing-title">Stop paying<br /><s className="deal-strike">list price.</s></h2>
            <Link className="button" to="/signup">Get your API key</Link>
          </div>
        </section>
      </main>

      <div className="home-wrap">
        <PublicFooter />
      </div>
    </div>
  );
}
