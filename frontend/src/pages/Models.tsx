import { useState } from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import { DemoBar, DataState } from "../components/DemoState";
import type { DemoState } from "../components/DemoState";
import Dialog from "../components/Dialog";
import Icon from "../components/Icon";
import PageHeading from "../components/PageHeading";
import { models } from "../demo/fixtures";
import openaiIcon from "../assets/openai.svg";
import geminiIcon from "../assets/gemini.svg";

export default function Models({
  publicPage = false,
}: {
  publicPage?: boolean;
}) {
  const [state, setState] = useState<DemoState>("populated");
  const [provider, setProvider] = useState("all");
  const [capability, setCapability] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<(typeof models)[number] | null>(
    null,
  );
  const shown = models.filter(
    (model) =>
      (provider === "all" || model.provider === provider) &&
      (capability === "all" || model.capability === capability) &&
      `${model.name} ${model.capability}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const content = (
    <>
      <DemoBar state={state} onChange={setState} />
      <PageHeading
        title="Models & pricing"
        description="Find a model that fits your integration and understand its billing units."
      />
      <DataState
        state={state}
        title="Models and pricing"
        emptyTitle="No models to display"
        onRetry={() => setState("populated")}
      >
        <div className="catalog-intro">
          <p>
            Explore illustrative text and image entries. Compare providers,
            capabilities and billing information in one place.
          </p>
          <span className="badge">Fictional prices · USD</span>
        </div>
        <div className="catalog-filter">
          <div className="filter-group">
            <select
              value={provider}
              aria-label="Filter provider"
              onChange={(event) => setProvider(event.target.value)}
            >
              <option value="all">All providers</option>
              <option>OpenAI</option>
              <option>Gemini</option>
            </select>
            <select
              value={capability}
              aria-label="Filter capability"
              onChange={(event) => setCapability(event.target.value)}
            >
              <option value="all">All capabilities</option>
              <option>Text</option>
              <option>Image</option>
            </select>
          </div>
          <input
            type="search"
            className="search"
            aria-label="Search models"
            placeholder="Search providers or capabilities…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="catalog-count" role="status">
          {shown.length} catalogue {shown.length === 1 ? "example" : "examples"}
        </div>
        <section className="model-grid" aria-label="Example models">
          {shown.map((model) => (
            <article className="panel model-card" key={model.id}>
              <div className="provider-line">
                <img
                  className="provider-icon"
                  src={model.provider === "OpenAI" ? openaiIcon : geminiIcon}
                  alt=""
                />
                <span>{model.provider}</span>
                <span className="capability">
                  <Icon name={model.capability === "Text" ? "text" : "image"} />
                  {model.capability}
                </span>
              </div>
              <h2>{model.name}</h2>
              <p>{model.description}</p>
              <div className="model-family">
                Exact model version and availability to be confirmed
              </div>
              <div className="billing-rows">
                <div className="bill-row">
                  <span>
                    {model.capability === "Text" ? "Input" : "Generation"}
                  </span>
                  <strong className="price">{model.rates[0]}</strong>
                </div>
                <div className="bill-row">
                  <span>
                    {model.capability === "Text" ? "Output" : "Sample unit"}
                  </span>
                  <strong
                    className={model.capability === "Text" ? "price" : ""}
                  >
                    {model.rates[1] ?? "Per image"}
                  </strong>
                </div>
                <div className="billing-unit">
                  {model.capability === "Text"
                    ? "Example unit: per 1M tokens"
                    : "Output options to be confirmed"}
                </div>
              </div>
              <footer>
                <span>Fictional sample price</span>
                <button
                  className="text-link"
                  onClick={() => setSelected(model)}
                >
                  View details ↗
                  <span className="sr-only"> for {model.name}</span>
                </button>
              </footer>
            </article>
          ))}
        </section>
        {shown.length === 0 && (
          <section className="empty">
            <h2>No matching models</h2>
            <p>Try another provider, capability or search.</p>
          </section>
        )}
        <p className="review-note">
          All prices are fictional USD examples, not offers or provider rates.
          Model versions, availability and billing units remain unconfirmed.
          Video support is under investigation and is not offered in this
          catalogue.
        </p>
      </DataState>
      {selected && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>
          <p>{selected.description}</p>
          <dl className="detail-grid">
            <div>
              <dt>Provider</dt>
              <dd>{selected.provider}</dd>
            </div>
            <div>
              <dt>Capability example</dt>
              <dd>{selected.capability}</dd>
            </div>
            <div>
              <dt>Fictional rate</dt>
              <dd>
                {selected.rates.join(" input / ")}
                {selected.capability === "Text"
                  ? " output per 1M tokens"
                  : " per image"}
              </dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>Not confirmed</dd>
            </div>
          </dl>
          <p>
            These are display examples. Verified model IDs, prices, request
            schemas and documentation are not available yet.
          </p>
        </Dialog>
      )}
    </>
  );
  return publicPage ? (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="public-header">
        <Brand />
        <nav aria-label="Public navigation">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Explore dashboard demo ↗</Link>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {content}
      </main>
    </div>
  ) : (
    content
  );
}
