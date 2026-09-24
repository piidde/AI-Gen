import { useState } from "react";
import { Link } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import { blogTopics, publishedBlogArticles, type BlogIllustration, type BlogTopic } from "../content/blog";
import "../styles/blog.css";
import imageRequestRate from "../../content/blog/image-request-rate.svg";
import tokenRateComponents from "../../content/blog/token-rate-components.svg";

const illustrations: Record<BlogIllustration, string> = {
  "image-request-rate": imageRequestRate,
  "token-rate-components": tokenRateComponents,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default function Blog() {
  const [topic, setTopic] = useState<BlogTopic | "All topics">("All topics");
  const articles = topic === "All topics" ? publishedBlogArticles : publishedBlogArticles.filter(article => article.topic === topic);

  return <PublicCatalogueShell><div className="blog-index">
    <header className="blog-intro"><p className="eyebrow">Reviewed reference content</p><h1>Reference guides</h1><p>Practical explanations grounded in the dated model catalogue. These technically reviewed guides avoid executable API examples and production claims while those contracts remain unverified.</p></header>
    <div className="blog-topic-filters" aria-label="Filter guides by topic">
      {(["All topics", ...blogTopics] as const).map(value => <button key={value} type="button" aria-pressed={topic === value} onClick={() => setTopic(value)}>{value}</button>)}
    </div>
    <div className="blog-card-grid">
      {articles.map(article => <article className="blog-card" key={article.slug}>
        <img src={illustrations[article.hero.illustration]} alt="" />
        <p className="blog-meta">{article.topic} · <time dateTime={article.publishedOn}>{formatDate(article.publishedOn)}</time></p>
        <h2><Link to={`/blog/${article.slug}`}>{article.title}</Link></h2>
        <p>{article.summary}</p>
        <Link className="text-link" to={`/blog/${article.slug}`}>Read guide →</Link>
      </article>)}
    </div>
    <p className="blog-publication-note">Technical review does not replace human publication approval. Publication review is pending.</p>
  </div></PublicCatalogueShell>;
}
