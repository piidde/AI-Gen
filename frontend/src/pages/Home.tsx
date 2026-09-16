import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import Icon from "../components/Icon";
import UsageChart from "../components/UsageChart";
import { models, requests, summary } from "../demo/fixtures";
import openaiIcon from "../assets/openai.svg";
import geminiIcon from "../assets/gemini.svg";
import "../styles/home.css";

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
        A LITTLE LESS FRICTION. A LITTLE MORE LIFT.
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="home-preview">
        Local demo · Fictional data · Accounts, payments and API access are not
        connected
      </div>
      <div className="home-wrap">
        <header className="home-top">
          <Brand />
          <nav className="home-links" aria-label="Main navigation">
            <Link to="/models">Models &amp; pricing</Link>
            <Link to="/information?topic=docs">Docs</Link>
            <Link to="/information?topic=support">Support</Link>
          </nav>
          <div className="home-links home-account-links">
            <Link to="/information?topic=signin">Sign in</Link>
            <Link className="button" to="/dashboard">
              Explore demo
            </Link>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          <section className="home-hero" aria-labelledby="home-title">
            <div>
              <div className="home-overline">AI access, within reach</div>
              <h1 id="home-title">
                More room
                <br />
                for your ideas.
              </h1>
              <p>
                Affordable AI API access for the things you're building. Keep
                your workflow moving, with costs you can follow.
              </p>
              <div className="home-actions">
                <Link className="button" to="/models">
                  Explore models ↗
                </Link>
                <Link className="button secondary" to="/information?topic=docs">
                  Read the quickstart
                </Link>
              </div>
              <div className="home-small home-muted">
                For independent builders and small teams.
              </div>
            </div>
            <LiftArtwork />
          </section>

          <div className="home-benefits home-rule">
            <article>
              <span className="home-num">01 / COST</span>
              <h3>Make the economics work.</h3>
              <p>
                Find model pricing that fits your workflow, with billing units
                clearly explained.
              </p>
            </article>
            <article>
              <span className="home-num">02 / CLARITY</span>
              <h3>Know where to start.</h3>
              <p>
                A focused quickstart and one place for the documentation you
                need.
              </p>
            </article>
            <article>
              <span className="home-num">03 / CONTROL</span>
              <h3>See what you're using.</h3>
              <p>
                Manage API keys, inspect requests, and track your balance from
                one dashboard.
              </p>
            </article>
          </div>

          <section
            className="home-section home-rule"
            aria-labelledby="home-models-title"
          >
            <div className="home-sectionhead">
              <h2 id="home-models-title">Choose with the costs in view.</h2>
              <p>
                Compare model capabilities and billing units before you
                integrate.
              </p>
            </div>
            <div className="home-models">
              {models.slice(0, 3).map((model) => (
                <article className="panel model-card" key={model.id}>
                  <div className="provider-line">
                    <img className="provider-icon" src={model.provider === "OpenAI" ? openaiIcon : geminiIcon} alt="" />
                    <span>{model.provider}</span>
                    <span className="capability"><Icon name={model.capability === "Text" ? "text" : "image"} />{model.capability}</span>
                  </div>
                  <h3>{model.name}</h3>
                  <p>{model.description}</p>
                  <div className="billing-rows">
                    <div className="bill-row"><span>{model.capability === "Text" ? "Input / 1M tokens" : "Per image"}</span><strong className="price">{model.rates[0]}</strong></div>
                    {model.capability === "Text" && <div className="bill-row"><span>Output / 1M tokens</span><strong className="price">{model.rates[1]}</strong></div>}
                  </div>
                  <footer><span>Illustrative model · Fictional USD price</span></footer>
                </article>
              ))}
            </div>
            <div className="home-sectionnote">
              <p>Model availability, prices and billing units are unverified.</p>
              <Link className="text-link home-small" to="/models">
                View all models ↗
              </Link>
            </div>
          </section>

          <section className="home-section home-product home-rule" aria-labelledby="home-dashboard-title">
            <div className="home-product-copy">
              <div className="home-overline">A clearer overview</div>
              <h2 id="home-dashboard-title">Your usage,<br />clearly in view.</h2>
              <p>Keep your balance, request activity and API access together. See the details behind your usage, without losing the bigger picture.</p>
              <ul className="home-product-points">
                <li><Icon name="wallet" />Balance and credits at a glance</li>
                <li><Icon name="usage" />Usage over time, with request details</li>
                <li><Icon name="keys" />A place for every integration’s key</li>
              </ul>
              <Link className="text-link" to="/dashboard">Explore the dashboard demo ↗</Link>
            </div>
            <div className="panel home-dashboard-preview" aria-label="Dashboard preview with fictional data">
              <div className="home-preview-top"><span>Account / Overview</span><span>Demo · Fictional data</span></div>
              <div className="home-preview-metrics">
                <div><span>Available balance</span><strong>{summary.balance}<small> credits</small></strong></div>
                <div><span>Total requests</span><strong>{summary.requests}</strong></div>
              </div>
              <UsageChart />
              <div className="home-preview-requests">
                <h3>Recent requests</h3>
                {requests.slice(0, 2).map((request) => <div className="home-preview-request" key={request.id}><span>Sample model {request.model}</span><span className="status"><i className="dot" />{request.status}</span><span>{request.credits} credits</span></div>)}
              </div>
            </div>
          </section>

          <section
            className="home-section home-rule"
            aria-labelledby="home-start-title"
          >
            <div className="home-sectionhead">
              <h2 id="home-start-title">From an idea to a first request.</h2>
              <p>
                Use Takewing AI through your existing tools and integrations.
              </p>
            </div>
            <div className="home-steps">
                <div className="home-step">
                  <span className="home-num">01</span>
                  <div>
                    <h3>Choose a model.</h3>
                    <p>Compare capabilities and pricing units for your workload.</p>
                  </div>
                </div>
                <div className="home-step">
                  <span className="home-num">02</span>
                  <div>
                    <h3>Connect your integration.</h3>
                    <p>Use an API key in your own app or workflow. Generation stays in your tools.</p>
                  </div>
                </div>
                <div className="home-step">
                  <span className="home-num">03</span>
                  <div>
                    <h3>Track your usage.</h3>
                    <p>Review requests and follow your balance from one dashboard.</p>
                  </div>
                </div>
            </div>
          </section>
          <section className="home-closing" aria-labelledby="home-closing-title">
            <div className="home-overline">Make room for what’s next</div>
            <h2 id="home-closing-title">Give your next idea<br />room to grow.</h2>
            <p>Explore the models. Find a fit for what you’re building.</p>
            <div className="home-actions">
              <Link className="button" to="/models">Explore models ↗</Link>
              <Link className="text-link" to="/information?topic=docs">Read the documentation ↗</Link>
            </div>
          </section>
        </main>

        <footer className="home-foot">
          <Brand />
          <nav className="home-links" aria-label="Footer navigation">
            <Link to="/information?topic=support">Support</Link>
            <Link to="/information?topic=status">Service status</Link>
            <Link to="/information?topic=contact">Contact</Link>
            <Link to="/information?topic=privacy">Privacy</Link>
            <Link to="/information?topic=terms">Terms</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
