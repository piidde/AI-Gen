import HomeDashboardPreview from "../components/HomeDashboardPreview";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import Icon from "../components/Icon";
import HomeFlow from "../components/HomeFlow";
import ImageDotField from "../components/ImageDotField";
import ModelPrices from "../components/ModelPrices";
import { catalogue, snapshot } from "../content/catalogue";
import { familyPages } from "../content/modelFamilies";
import openaiIcon from "../assets/openai.svg";
import geminiIcon from "../assets/gemini.svg";
import "../styles/home.css";
import "../styles/home-refresh.css";

function LiftArtwork() {
  return (
    <div className="home-art">
      <svg
        viewBox="0 0 480 430"
        role="img"
        aria-label="Abstract ascending green planes"
      >
        <defs>
          <linearGradient id="home-lift" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#1A3C2B" />
            <stop offset=".6" stopColor="#57C99B" />
            <stop offset="1" stopColor="#A3E9C6" />
          </linearGradient>
          <linearGradient id="home-shade">
            <stop stopColor="#16291F" />
            <stop offset="1" stopColor="#397B58" />
          </linearGradient>
        </defs>
        <g stroke="#23392B" fill="none">
          <path d="M0 360 480 110M0 270 480 20M0 450 480 200" />
          <path d="m90 430 0-350m120 350V20m120 410V0m120 430V0" />
        </g>
        <g className="home-plane home-plane-upper">
          <path d="M40 252 402 68v83L40 335Z" fill="url(#home-lift)" />
          <path d="m40 335 39 24 362-184-39-24Z" fill="#214F37" />
        </g>
        <g className="home-plane home-plane-lower">
          <path d="M159 311 402 188v77L159 388Z" fill="url(#home-shade)" />
          <path d="m159 388 32 18 242-123-31-18Z" fill="#1B3928" />
        </g>
      </svg>
      <div className="home-caption">
        IMAGE & TEXT. THROUGH ONE API.
      </div>
    </div>
  );
}

const selectedModels = [
  { id: "gpt-image-2.5", name: "GPT Image 2.5" },
  { id: "nano-banana-pro", name: "Nano Banana Pro" },
  { id: "gpt-6-astra", name: "GPT-6 Astra" },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
].map(({ id, name }) => {
  const model = catalogue.find(model => model.upstreamId === id);
  if (!model) throw new Error(`Missing homepage reference: ${id}`);
  return { ...model, name };
});


export default function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="home-preview">
        Preview · Explore the pricing and dashboard. Paid API access is not live yet.
      </div>
      <div className="home-wrap">
        <PublicHeader />

        <main id="main-content" tabIndex={-1}>
          <section className="home-hero" aria-labelledby="home-title">
            <div>
              <div className="home-overline">AI APIs for developers</div>
              <h1 id="home-title">
                Leading AI models.<br /><span>Lowest API prices.</span>
              </h1>
              <p>
                Image and text generation APIs, built to cut your AI costs. Compare published rates, connect your own apps, and pay as you go.
              </p>
              <div className="home-actions">
                <Link className="button" to="/signup">
                  Get started
                </Link>
                <Link className="button secondary" to="/models">
                  Explore models &amp; pricing ↗
                </Link>
              </div>
              <div className="home-small home-muted">
                Image + text APIs · Prepaid credits · No subscription
              </div>
            </div>
            <LiftArtwork />
          </section>

          <section
            className="home-section home-rule"
            aria-labelledby="home-models-title"
          >
            <div className="home-sectionhead">
              <h2 id="home-models-title">Popular models. Clear API pricing.</h2>
              <p>
                See the model, the price and the billing unit at a glance.
              </p>
            </div>
            <div className="home-models">
              {selectedModels.map((model) => (
                <article className={`panel model-card ${model.upstreamId === "gpt-image-2.5" ? "model-featured" : ""}`} key={model.upstreamId}>
                  {model.upstreamId === "gpt-image-2.5" && <ImageDotField />}
                  <div className="provider-line">
                    <img
                      className="provider-icon"
                      src={model.provider === "OpenAI" ? openaiIcon : geminiIcon}
                      alt=""
                      width={30}
                      height={30}
                      loading="lazy"
                      decoding="async"
                    />
                    <span>{model.provider}</span>
                    <span className="capability"><Icon name={model.modality === "text" ? "text" : "image"} />{model.modality === "text" ? "Text" : "Image"}</span>
                  </div>
                  <h3>{model.name}</h3>
                  <ModelPrices model={model} compact />
                  <footer>
                    <Link className="text-link" to={familyPages.some(page => page.family === model.family) ? "/models/" + familyPages.find(page => page.family === model.family)!.slug : `/models?q=${encodeURIComponent(model.upstreamId)}`}>Model details ↗</Link>
                  </footer>
                </article>
              ))}
            </div>
            <div className="home-sectionnote">
              <p>Preview rates in USD. Percentages compare published rates before rounding. Image examples use the stated model and settings, excluding extra usage; actual savings depend on your request. Price basis: {snapshot.checkedOn}. Image prices are per request.</p>
              <Link className="text-link home-small" to="/models">
                View all models ↗
              </Link>
            </div>
          </section>

          <HomeFlow />

          <section className="home-section home-product home-rule" aria-labelledby="home-dashboard-title">
            <div className="home-product-copy">
              <div className="home-overline">Stay on top of your spend</div>
              <h2 id="home-dashboard-title">Know what you spend.<br />See every request.</h2>
              <p>Check your balance, track API costs and inspect individual charges in one dashboard.</p>
              <ul className="home-product-points">
                <li><Icon name="wallet" />Balance and credits at a glance</li>
                <li><Icon name="usage" />Usage over time, with request details</li>
                <li><Icon name="keys" />A place for every integration’s key</li>
              </ul>
              <Link className="text-link" to="/login?next=%2Fdashboard">Explore the dashboard demo ↗</Link>
            </div>
            <HomeDashboardPreview />
          </section>
          <section className="home-section home-rule home-faq" aria-labelledby="home-faq-title">
            <div className="home-sectionhead"><h2 id="home-faq-title">Before you start.</h2><p>Practical answers about cost and access.</p></div>
            <details><summary>Can I generate images or text on this website?</summary><p>Generation is API-only. You use your own application or API client; this website manages your account, keys, billing and usage.</p></details>
            <details><summary>How much can I save?</summary><p>Our cards show savings against the stated official price reference. For images, check the size and quality in the comparison note. Your total depends on the model, settings and any additional input or thinking usage.</p></details>
            <details><summary>Are failed requests always refunded?</summary><p>Credits are restored for a failed request only when there is no upstream cost. A billed policy rejection stays charged. If a result is uncertain, inspect the request status before retrying.</p></details>
            <details><summary>Do I need a subscription?</summary><p>No. Use prepaid credits across image and text models, with no monthly subscription. Credits never expire. Paid access is not live yet.</p></details>
            <details><summary>Where can I check availability or get help?</summary><p>See <Link className="text-link" to="/status">service status</Link>, <Link className="text-link" to="/support">support guidance</Link> and the <Link className="text-link" to="/docs">documentation status</Link>. An unavailable status source does not mean the service is healthy.</p></details>
          </section>
          <section className="home-section home-guides" aria-labelledby="home-guides-title">
            <div className="home-sectionhead"><h2 id="home-guides-title">A little clarity.<br />A better comparison.</h2><p>Know what goes into an image request or a million tokens.</p></div>
            <div className="home-guide-grid">
              <Link className="home-guide" to="/blog/understanding-image-model-rates"><div className="guide-art guide-image-art" aria-hidden="true"><span /><span /><span><Icon name="image" /></span><i>1 request</i></div><div><span className="home-overline">Image pricing</span><h3>What does an image cost? <span aria-hidden="true">↗</span></h3><p>Request prices, resolutions and quality, explained.</p></div></Link>
              <Link className="home-guide" to="/blog/understanding-text-token-rates"><div className="guide-art guide-text-art" aria-hidden="true"><span>Input <i /></span><span>Output <i /></span><b>1M tokens</b></div><div><span className="home-overline">Text pricing</span><h3>Make sense of token rates. <span aria-hidden="true">↗</span></h3><p>Understand input, output and cached-token pricing.</p></div></Link>
            </div>
          </section>
          <section className="home-closing" aria-labelledby="home-closing-title">
            <div className="home-overline">Build more. Spend less.</div>
            <h2 id="home-closing-title">Your next idea.<br />Less overhead.</h2>
            <p>Find your model. See your price. Build from there.</p>
            <div className="home-actions">
              <Link className="button" to="/models">Explore models &amp; pricing ↗</Link>
              <Link className="text-link" to="/docs">Read the documentation ↗</Link>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </div>
  );
}
