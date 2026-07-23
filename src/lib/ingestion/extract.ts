// Extractive HTML → Markdown cleaning (pure; server/script-only).
//
// Turns a fetched official page into traceable Markdown: it keeps the title, headings, lists,
// tables, meaningful link text, and body prose, and it REMOVES navigation, headers, footers,
// asides, forms, cookie/consent banners, social/share widgets, and screen-reader-only
// duplicate text. It never summarizes or rewrites — every retained sentence is copied from the
// source (task: "Use extractive cleaning so the stored content remains traceable"). No AI
// model is involved.

import {
  parseHtml,
  decodeEntities,
  type HtmlNode,
  type HtmlElementNode,
} from "./html";

export type ExtractedContent = {
  readonly title: string;
  readonly canonicalUrl: string | undefined;
  readonly description: string | undefined;
  readonly lastModified: string | undefined;
  readonly markdown: string;
  readonly text: string;
  readonly wordCount: number;
};

const BOILERPLATE_TAGS = new Set([
  "nav", "header", "footer", "aside", "form", "button", "dialog",
  "iframe", "noscript", "figure",
]);

const BOILERPLATE_ROLES = new Set([
  "navigation", "banner", "contentinfo", "search", "complementary", "form", "menubar", "menu",
]);

// Class/id tokens that mark template chrome. Matched as substrings of class/id tokens.
const BOILERPLATE_TOKENS = [
  "nav", "menu", "sidebar", "breadcrumb", "cookie", "consent", "gdpr",
  "skip-link", "skiplink", "social", "share", "subscribe", "newsletter",
  "related", "recommend", "promo", "advert", "widget", "offcanvas",
  "modal", "utility", "topbar", "masthead", "megamenu", "sitemap",
  "back-to-top", "pagination", "pager", "cta-", "hero-cta", "site-header",
  "site-footer", "global-header", "global-footer", "mobile-menu",
];

// Class/id tokens that mark hidden / screen-reader-only duplicate text.
const HIDDEN_TOKENS = [
  "sr-only", "sronly", "visually-hidden", "visuallyhidden", "screen-reader",
  "screenreader", "show-for-sr", "hidden", "hide", "d-none",
];

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const INLINE_TAGS = new Set([
  "a", "strong", "b", "em", "i", "span", "code", "sup", "sub", "small",
  "u", "mark", "time", "label", "abbr", "cite", "q", "s", "del", "ins", "wbr",
]);

function isElement(node: HtmlNode): node is HtmlElementNode {
  return node.type === "element";
}

function classAndIdTokens(el: HtmlElementNode): string[] {
  const raw = `${el.attrs["class"] ?? ""} ${el.attrs["id"] ?? ""}`.toLowerCase();
  return raw.split(/[\s]+/).filter(Boolean);
}

function hasToken(tokens: string[], needles: string[]): boolean {
  return tokens.some((t) => needles.some((n) => t.includes(n)));
}

/** True when an element is template chrome that should be dropped entirely. */
function isBoilerplate(el: HtmlElementNode): boolean {
  if (BOILERPLATE_TAGS.has(el.tag)) return true;
  const role = (el.attrs["role"] ?? "").toLowerCase();
  if (role && BOILERPLATE_ROLES.has(role)) return true;
  if ((el.attrs["aria-hidden"] ?? "").toLowerCase() === "true") return true;
  if ("hidden" in el.attrs) return true;
  const tokens = classAndIdTokens(el);
  if (hasToken(tokens, HIDDEN_TOKENS)) return true;
  if (hasToken(tokens, BOILERPLATE_TOKENS)) return true;
  return false;
}

/** Recursively drop boilerplate elements, returning a cleaned copy of the forest. */
function pruneBoilerplate(nodes: HtmlNode[]): HtmlNode[] {
  const out: HtmlNode[] = [];
  for (const node of nodes) {
    if (!isElement(node)) {
      out.push(node);
      continue;
    }
    if (isBoilerplate(node)) continue;
    out.push({ ...node, children: pruneBoilerplate(node.children) });
  }
  return out;
}

function findAll(nodes: HtmlNode[], pred: (el: HtmlElementNode) => boolean): HtmlElementNode[] {
  const found: HtmlElementNode[] = [];
  const walk = (list: HtmlNode[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (pred(node)) found.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return found;
}

function findFirst(nodes: HtmlNode[], pred: (el: HtmlElementNode) => boolean): HtmlElementNode | undefined {
  return findAll(nodes, pred)[0];
}

function textOf(node: HtmlNode): string {
  if (!isElement(node)) return node.value;
  return node.children.map(textOf).join("");
}

// ---- Metadata extraction (from the raw, un-pruned tree) ---------------------------------

function extractTitle(nodes: HtmlNode[]): string {
  const titleEl = findFirst(nodes, (el) => el.tag === "title");
  const fromTitle = titleEl ? decodeEntities(textOf(titleEl)).trim() : "";
  if (fromTitle) return fromTitle;
  const ogTitle = findFirst(
    nodes,
    (el) => el.tag === "meta" && (el.attrs["property"] ?? "").toLowerCase() === "og:title",
  );
  if (ogTitle?.attrs["content"]) return decodeEntities(ogTitle.attrs["content"]).trim();
  const h1 = findFirst(nodes, (el) => el.tag === "h1");
  return h1 ? decodeEntities(textOf(h1)).replace(/\s+/g, " ").trim() : "";
}

function extractMeta(nodes: HtmlNode[], names: string[]): string | undefined {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  const el = findFirst(nodes, (e) => {
    if (e.tag !== "meta") return false;
    const key = (e.attrs["name"] ?? e.attrs["property"] ?? e.attrs["http-equiv"] ?? "").toLowerCase();
    return wanted.has(key);
  });
  const content = el?.attrs["content"]?.trim();
  return content ? decodeEntities(content) : undefined;
}

function extractCanonical(nodes: HtmlNode[]): string | undefined {
  const el = findFirst(
    nodes,
    (e) => e.tag === "link" && (e.attrs["rel"] ?? "").toLowerCase() === "canonical",
  );
  const href = el?.attrs["href"]?.trim();
  return href || undefined;
}

// ---- Markdown rendering ------------------------------------------------------------------

function absUrl(href: string, baseUrl: string): string | undefined {
  try {
    const u = new URL(href, baseUrl);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return undefined;
  } catch {
    return undefined;
  }
}

function renderInline(nodes: HtmlNode[], baseUrl: string): string {
  let out = "";
  for (const node of nodes) {
    if (!isElement(node)) {
      out += node.value.replace(/\s+/g, " ");
      continue;
    }
    switch (node.tag) {
      case "br":
        out += "\n";
        break;
      case "a": {
        const label = renderInline(node.children, baseUrl).trim();
        if (!label) break;
        const href = node.attrs["href"] ? absUrl(node.attrs["href"], baseUrl) : undefined;
        out += href ? `[${label}](${href})` : label;
        break;
      }
      case "strong":
      case "b": {
        const inner = renderInline(node.children, baseUrl).trim();
        out += inner ? `**${inner}**` : "";
        break;
      }
      case "em":
      case "i": {
        const inner = renderInline(node.children, baseUrl).trim();
        out += inner ? `*${inner}*` : "";
        break;
      }
      case "code": {
        const inner = renderInline(node.children, baseUrl).trim();
        out += inner ? `\`${inner}\`` : "";
        break;
      }
      default:
        out += renderInline(node.children, baseUrl);
    }
  }
  return out;
}

function renderTable(el: HtmlElementNode, baseUrl: string): string {
  const rows = findAll(el.children, (e) => e.tag === "tr");
  if (rows.length === 0) return "";
  const cellText = (row: HtmlElementNode): string[] =>
    row.children
      .filter((c): c is HtmlElementNode => isElement(c) && (c.tag === "td" || c.tag === "th"))
      .map((c) => renderInline(c.children, baseUrl).replace(/\n/g, " ").replace(/\|/g, "\\|").trim());

  const matrix = rows.map(cellText).filter((r) => r.length > 0);
  if (matrix.length === 0) return "";
  const width = Math.max(...matrix.map((r) => r.length));
  const pad = (r: string[]) => {
    const copy = [...r];
    while (copy.length < width) copy.push("");
    return copy;
  };
  const header = pad(matrix[0] as string[]);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...matrix.slice(1).map((r) => `| ${pad(r).join(" | ")} |`),
  ];
  return lines.join("\n");
}

function renderList(el: HtmlElementNode, baseUrl: string, depth: number): string {
  const ordered = el.tag === "ol";
  const items = el.children.filter((c): c is HtmlElementNode => isElement(c) && c.tag === "li");
  const indent = "  ".repeat(depth);
  const lines: string[] = [];
  items.forEach((li, i) => {
    // Split each <li> into its own inline content vs nested lists.
    const nested: HtmlElementNode[] = [];
    const inlineChildren: HtmlNode[] = [];
    for (const child of li.children) {
      if (isElement(child) && (child.tag === "ul" || child.tag === "ol")) nested.push(child);
      else inlineChildren.push(child);
    }
    const marker = ordered ? `${i + 1}.` : "-";
    const text = renderInline(inlineChildren, baseUrl).replace(/\s*\n\s*/g, " ").trim();
    if (text) lines.push(`${indent}${marker} ${text}`);
    for (const list of nested) lines.push(renderList(list, baseUrl, depth + 1));
  });
  return lines.join("\n");
}

function isInlineNode(node: HtmlNode): boolean {
  if (!isElement(node)) return true;
  return INLINE_TAGS.has(node.tag) || node.tag === "br";
}

function renderBlocks(nodes: HtmlNode[], baseUrl: string): string[] {
  const blocks: string[] = [];
  // Coalesce consecutive inline-level nodes (text + inline tags) into ONE paragraph so a
  // container that mixes `<strong>` + text (common on the site) isn't split into fragments.
  let inlineBuffer: HtmlNode[] = [];
  const flushInline = () => {
    if (inlineBuffer.length === 0) return;
    const text = renderInline(inlineBuffer, baseUrl).replace(/[ \t]*\n[ \t]*/g, "  \n").trim();
    if (text) blocks.push(text);
    inlineBuffer = [];
  };

  for (const node of nodes) {
    if (isInlineNode(node)) {
      inlineBuffer.push(node);
      continue;
    }
    flushInline();
    if (!isElement(node)) continue;
    if (HEADING_TAGS.has(node.tag)) {
      const level = Number(node.tag.slice(1));
      const text = renderInline(node.children, baseUrl).replace(/\s+/g, " ").trim();
      if (text) blocks.push(`${"#".repeat(level)} ${text}`);
      continue;
    }
    switch (node.tag) {
      case "p": {
        const text = renderInline(node.children, baseUrl).replace(/[ \t]*\n[ \t]*/g, "  \n").trim();
        if (text) blocks.push(text);
        break;
      }
      case "ul":
      case "ol": {
        const list = renderList(node, baseUrl, 0);
        if (list.trim()) blocks.push(list);
        break;
      }
      case "table": {
        const table = renderTable(node, baseUrl);
        if (table) blocks.push(table);
        break;
      }
      case "blockquote": {
        const inner = renderBlocks(node.children, baseUrl).join("\n\n");
        if (inner.trim()) {
          blocks.push(inner.split("\n").map((l) => `> ${l}`).join("\n"));
        }
        break;
      }
      case "pre": {
        const code = textOf(node).replace(/\s+$/,"");
        if (code.trim()) blocks.push(`\`\`\`\n${code}\n\`\`\``);
        break;
      }
      case "hr":
        blocks.push("---");
        break;
      case "li":
        // Stray <li> outside a list: treat as a bullet.
        {
          const text = renderInline(node.children, baseUrl).replace(/\s+/g, " ").trim();
          if (text) blocks.push(`- ${text}`);
        }
        break;
      default:
        // Structural containers (div/section/article/main/…): recurse into children.
        blocks.push(...renderBlocks(node.children, baseUrl));
    }
  }
  flushInline();
  return blocks;
}

/** Choose the main content region, preferring semantic containers over the whole body. */
function selectMainRegion(nodes: HtmlNode[]): HtmlNode[] {
  const main = findFirst(nodes, (el) => el.tag === "main" || (el.attrs["role"] ?? "").toLowerCase() === "main");
  if (main) return main.children;
  const article = findFirst(nodes, (el) => el.tag === "article");
  if (article) return article.children;
  const byId = findFirst(nodes, (el) => {
    const tokens = classAndIdTokens(el);
    return tokens.some((t) => t === "content" || t === "main-content" || t === "maincontent" || t === "page-content" || t === "primary");
  });
  if (byId) return byId.children;
  const body = findFirst(nodes, (el) => el.tag === "body");
  return body ? body.children : nodes;
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}(?=\S)/g, " ")
    .trim();
}

/**
 * Extract cleaned content + metadata from an HTML string. `baseUrl` resolves relative links
 * and is used only for link hrefs (never to widen the approved-domain check).
 */
export function extractContent(html: string, baseUrl: string): ExtractedContent {
  const tree = parseHtml(html);

  const title = extractTitle(tree);
  const canonicalUrl = extractCanonical(tree);
  const description = extractMeta(tree, ["description", "og:description"]);
  const lastModified = extractMeta(tree, [
    "last-modified",
    "article:modified_time",
    "og:updated_time",
    "date",
    "dcterms.modified",
  ]);

  const pruned = pruneBoilerplate(tree);
  const region = selectMainRegion(pruned);
  const blocks = renderBlocks(region, baseUrl)
    .map((b) => b.trim())
    .filter(Boolean);
  const markdown = normalizeMarkdown(decodeEntities(blocks.join("\n\n")));

  const text = markdown.replace(/[#>*`\-|[\]()]/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(/\s+/).length : 0;

  return { title, canonicalUrl, description, lastModified, markdown, text, wordCount };
}
