import { catalogue } from "./catalogue.ts";
import { articleRecords, type BlogArticleRecord, type BlogTopic } from "../../content/blog/articles.ts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOPICS = new Set<BlogTopic>(["Image models", "Text models"]);
const ILLUSTRATIONS = new Set(["image-request-rate", "token-rate-components"]);

function validDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateBlogArticles(articles: BlogArticleRecord[]): string[] {
  const errors: string[] = [];
  const allSlugs = new Set(articles.map(article => article.slug));
  const publishedSlugs = new Set(articles.filter(article => !article.draft).map(article => article.slug));
  if (allSlugs.size !== articles.length) errors.push("slug: article slugs must be unique");

  for (const article of articles) {
    const at = article.slug || "unnamed article";
    if (!SAFE_SLUG.test(article.slug)) errors.push(`${at}: slug must be lowercase kebab-case`);
    if (!article.title.trim()) errors.push(`${at}: title is required`);
    if (!article.summary.trim()) errors.push(`${at}: summary is required`);
    if (!TOPICS.has(article.topic)) errors.push(`${at}: topic is not allowed`);
    if (!article.author?.trim() && !article.reviewer?.trim()) errors.push(`${at}: author or reviewer attribution is required`);
    if (typeof article.draft !== "boolean") errors.push(`${at}: draft must be boolean`);
    if ((article.draft && article.reviewStatus !== "draft") || (!article.draft && article.reviewStatus !== "technically-reviewed")) errors.push(`${at}: draft and reviewStatus must agree`);
    if (!validDate(article.publishedOn)) errors.push(`${at}: publishedOn must be a real ISO date`);
    if (!validDate(article.updatedOn)) errors.push(`${at}: updatedOn must be a real ISO date`);
    if (validDate(article.publishedOn) && validDate(article.updatedOn) && article.updatedOn < article.publishedOn) errors.push(`${at}: updatedOn cannot precede publishedOn`);
    if (!article.hero.alt.trim()) errors.push(`${at}: hero image requires alt text`);
    if (!ILLUSTRATIONS.has(article.hero.illustration)) errors.push(`${at}: hero illustration is unknown`);
    for (const related of article.related) {
      if (!allSlugs.has(related) || (!article.draft && !publishedSlugs.has(related))) errors.push(`${at}: related article ${related} is missing or unpublished`);
    }
    const sectionIds = new Set<string>();
    for (const section of article.sections) {
      if (!SAFE_SLUG.test(section.id) || !section.heading.trim()) errors.push(`${at}: section IDs and headings are required`);
      if (sectionIds.has(section.id)) errors.push(`${at}: section IDs must be unique`);
      sectionIds.add(section.id);
      for (const block of section.blocks) {
        if (block.type === "catalogue") for (const modelId of block.modelIds) {
          if (!catalogue.some(model => model.upstreamId === modelId)) errors.push(`${at}: catalogue model ${modelId} is unknown`);
        }
        if (block.type === "sources") for (const link of block.links) {
          if (!link.href.startsWith("/") && !/^https:\/\//.test(link.href)) errors.push(`${at}: source href must be a local path or HTTPS URL`);
        }
        if (block.type === "image" && !ILLUSTRATIONS.has(block.illustration)) errors.push(`${at}: image illustration is unknown`);
      }
    }
  }
  return errors;
}

export const blogArticles = articleRecords;
export const publishedBlogArticles = blogArticles
  .filter(article => !article.draft)
  .toSorted((left, right) => right.publishedOn.localeCompare(left.publishedOn));
export const blogTopics = [...new Set(publishedBlogArticles.map(article => article.topic))].toSorted() as BlogTopic[];

export function getPublishedArticle(slug: string | undefined) {
  return publishedBlogArticles.find(article => article.slug === slug);
}

const validationErrors = validateBlogArticles(blogArticles);
if (validationErrors.length) throw new Error(`Invalid blog content:\n${validationErrors.join("\n")}`);

export type { BlogArticleRecord, BlogBlock, BlogIllustration, BlogSection, BlogTopic } from "../../content/blog/articles.ts";
