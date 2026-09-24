import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import CatalogueRates from "../components/CatalogueRates";
import CopyButton from "../components/CopyButton";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import { catalogue } from "../content/catalogue";
import { getPublishedArticle, type BlogBlock, type BlogIllustration } from "../content/blog";
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

function ArticleLink({ href, children }: { href: string; children: ReactNode }) {
  return href.startsWith("/") ? <Link className="text-link" to={href}>{children}</Link> : <a className="text-link" href={href}>{children}</a>;
}

function Block({ block }: { block: BlogBlock }) {
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "callout") return <aside className="blog-callout"><h3>{block.title}</h3><p>{block.text}</p></aside>;
  if (block.type === "image") return <figure className="blog-figure"><img src={illustrations[block.illustration]} alt={block.alt} /><figcaption>{block.caption}</figcaption></figure>;
  if (block.type === "table") return <div className="blog-table-scroll"><table><caption>{block.caption}</caption><thead><tr>{block.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{block.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => cellIndex === 0 ? <th scope="row" key={cell}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
  if (block.type === "catalogue") return <div className="blog-catalogue"><p>{block.introduction}</p>{block.modelIds.map(modelId => {
    const model = catalogue.find(candidate => candidate.upstreamId === modelId)!;
    return <section className="panel" key={modelId} aria-labelledby={`blog-model-${modelId}`}><h3 id={`blog-model-${modelId}`}>{model.family}</h3><p className="small muted">Reference ID: {model.upstreamId} · production support unverified</p><CatalogueRates rates={model.rates} currency="USD" detailed /></section>;
  })}</div>;
  if (block.type === "code") return <div className="blog-code"><pre><code>{block.code}</code></pre><CopyButton text={block.code} label={block.label} /></div>;
  return <div className="blog-sources"><h3>Sources and next references</h3><ul>{block.links.map(link => <li key={link.href}><ArticleLink href={link.href}>{link.label}</ArticleLink></li>)}</ul></div>;
}

export default function BlogArticle() {
  const { slug } = useParams();
  const article = getPublishedArticle(slug);
  if (!article) return <PublicCatalogueShell><section className="blog-not-found"><h1>Article not found</h1><p>This guide does not exist or is not published.</p><Link className="text-link" to="/blog">Browse reference guides</Link></section></PublicCatalogueShell>;
  const related = article.related.map(getPublishedArticle).filter(item => item !== undefined);

  return <PublicCatalogueShell><article className="blog-article">
    <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/blog">Reference guides</Link> / <span aria-current="page">{article.topic}</span></nav>
    <header className="blog-article-header"><p className="eyebrow">{article.topic}</p><h1>{article.title}</h1><p className="blog-dek">{article.summary}</p><dl className="blog-byline"><div><dt>Prepared</dt><dd><time dateTime={article.publishedOn}>{formatDate(article.publishedOn)}</time></dd></div><div><dt>Updated</dt><dd><time dateTime={article.updatedOn}>{formatDate(article.updatedOn)}</time></dd></div>{article.reviewer && <div><dt>Review</dt><dd>Technical review: {article.reviewer}</dd></div>}{article.author && <div><dt>Author</dt><dd>{article.author}</dd></div>}<div><dt>Publication</dt><dd>Publication review pending</dd></div></dl><img className="blog-hero" src={illustrations[article.hero.illustration]} alt={article.hero.alt} /></header>
    <div className="blog-layout">
      <nav className="blog-toc" aria-label="On this page"><strong>On this page</strong><ol>{article.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}</ol></nav>
      <div className="blog-body">{article.sections.map(section => <section id={section.id} tabIndex={-1} key={section.id}><h2>{section.heading}</h2>{section.blocks.map((block, index) => <Block block={block} key={index} />)}</section>)}</div>
    </div>
    <aside className="blog-next"><h2>Continue from here</h2><div className="actions"><Link className="button" to="/signup">Create an account</Link><Link className="text-link" to="/models">Model catalogue</Link><Link className="text-link" to="/docs">Documentation status</Link></div></aside>
    {related.length > 0 && <section className="blog-related"><h2>Related guides</h2>{related.map(item => <article key={item.slug}><h3><Link to={`/blog/${item.slug}`}>{item.title}</Link></h3><p>{item.summary}</p></article>)}</section>}
  </article></PublicCatalogueShell>;
}
