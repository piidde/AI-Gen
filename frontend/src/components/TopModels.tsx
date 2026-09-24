import type { TopModel } from "../data/overviewDemo";

export default function TopModels({ models }: { models: TopModel[] }) {
  return <section className="top-models" aria-label="Top models by credits used">
    <h2>Top models by credits</h2><p>Share of net settled credits in this period.</p>
    {models.length ? <ol className="top-models-list">{models.map(model => <li className="top-models-row" key={model.modelId}>
      <div><strong>{model.modelName}</strong><span>{model.credits} credits · {model.percent.toFixed(1)}%</span></div>
      <div className="top-models-bar" aria-hidden="true"><span className="top-models-fill" style={{ width: `${Math.min(100, model.percent)}%` }} /></div>
    </li>)}</ol> : <p className="muted">No settled model usage in this period.</p>}
  </section>;
}
