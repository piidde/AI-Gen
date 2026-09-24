import { expect, test } from "@playwright/test";
import {
  blogArticles,
  blogTopics,
  getPublishedArticle,
  publishedBlogArticles,
  validateBlogArticles,
} from "../src/content/blog";
import { buildRedirects, buildSitemapXml } from "../src/seo/generate";
import { indexableRoutes } from "../src/seo/routes";

test("published index excludes drafts and sorts newest first", () => {
  expect(blogArticles.some(article => article.draft)).toBe(true);
  expect(publishedBlogArticles.every(article => !article.draft)).toBe(true);
  expect(publishedBlogArticles.map(article => article.publishedOn)).toEqual(
    publishedBlogArticles.map(article => article.publishedOn).toSorted().reverse(),
  );
  expect(getPublishedArticle("editorial-format-preview")).toBeUndefined();
});

test("article records and relationships validate as a complete collection", () => {
  expect(validateBlogArticles(blogArticles)).toEqual([]);
  expect(new Set(publishedBlogArticles.map(article => article.slug)).size).toBe(
    publishedBlogArticles.length,
  );
  expect(blogTopics).toEqual(["Image models", "Text models"]);
});

test("validation rejects unsafe slugs, missing attribution, bad dates and unpublished relations", () => {
  const valid = blogArticles[0]!;
  const invalid = [
    { ...valid, slug: "Unsafe Slug", title: "", reviewer: undefined, author: undefined },
    { ...valid, slug: "bad-date", publishedOn: "20 September", updatedOn: "2026-13-01" },
    { ...valid, slug: "bad-related", related: ["editorial-format-preview", "missing"] },
  ];
  const errors = validateBlogArticles(invalid);
  expect(errors).toEqual(expect.arrayContaining([
    expect.stringContaining("slug"),
    expect.stringContaining("title"),
    expect.stringContaining("attribution"),
    expect.stringContaining("publishedOn"),
    expect.stringContaining("updatedOn"),
    expect.stringContaining("related"),
  ]));
});

test("validation rejects inconsistent publication state, topics, sections and source protocols", () => {
  const valid = blogArticles[0]!;
  const section = valid.sections[0]!;
  const invalid = [{
    ...valid,
    slug: "invalid-format-state",
    topic: "Video models",
    draft: true,
    reviewStatus: "technically-reviewed",
    hero: { illustration: "missing", alt: "Missing illustration" },
    sections: [section, { ...section, blocks: [{ type: "sources", links: [{ label: "Unsafe", href: "javascript:alert(1)" }] }] }],
    related: [],
  }] as unknown as typeof blogArticles;
  const errors = validateBlogArticles(invalid);
  expect(errors).toEqual(expect.arrayContaining([
    expect.stringContaining("topic"),
    expect.stringContaining("draft and reviewStatus"),
    expect.stringContaining("section IDs must be unique"),
    expect.stringContaining("source href"),
    expect.stringContaining("hero illustration"),
  ]));
});

test("launch guides cover both modalities using catalogue references", () => {
  expect(publishedBlogArticles).toHaveLength(2);
  expect(publishedBlogArticles.map(article => article.topic)).toEqual([
    "Text models",
    "Image models",
  ]);
  for (const article of publishedBlogArticles) {
    expect(article.reviewStatus).toBe("technically-reviewed");
    expect(article.publicationOwner).toBeNull();
    const blocks = article.sections.flatMap(section => section.blocks);
    expect(blocks.some(block => block.type === "catalogue")).toBe(true);
    expect(blocks.some(block => block.type === "sources")).toBe(true);
  }
});

test("SEO exports include every published guide and exclude draft routes", () => {
  const sitemap = buildSitemapXml({ origin: "https://takewing.invalid", indexable: true, lastmod: "2026-09-20" });
  const redirects = buildRedirects();
  for (const article of publishedBlogArticles) {
    const route = `/blog/${article.slug}`;
    expect(indexableRoutes.some(meta => meta.path === route)).toBe(true);
    expect(sitemap).toContain(`<loc>https://takewing.invalid${route}</loc>`);
    expect(redirects).toContain(route);
  }
  expect(indexableRoutes.some(meta => meta.path.includes("editorial-format-preview"))).toBe(false);
  expect(sitemap).not.toContain("editorial-format-preview");
  expect(redirects).not.toContain("editorial-format-preview");
});
