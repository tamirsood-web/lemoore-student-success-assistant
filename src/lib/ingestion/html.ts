// Minimal dependency-free HTML tokenizer + tree builder (pure; server/script-only).
//
// This is NOT a spec-complete HTML5 parser. It implements just enough — void elements and the
// common optional-close rules (p, li, td/th, tr, dt/dd, option) — to build a usable tree from
// real-world college-website markup so the extractor can reliably drop boilerplate and convert
// content. Comments, doctypes, scripts, and styles are handled by the extractor before/around
// this layer. Untrusted input: nothing here executes markup; tags become inert data nodes.

export type HtmlTextNode = { readonly type: "text"; readonly value: string };
export type HtmlElementNode = {
  readonly type: "element";
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: HtmlNode[];
};
export type HtmlNode = HtmlTextNode | HtmlElementNode;

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

// Start tags that implicitly close an open <p>.
const CLOSES_P = new Set([
  "address", "article", "aside", "blockquote", "details", "div", "dl", "fieldset",
  "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
  "header", "hr", "main", "menu", "nav", "ol", "p", "pre", "section", "table", "ul",
]);

/** Parse `attrsText` (the part after the tag name) into a lowercase-keyed attribute map. */
function parseAttrs(attrsText: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s"'=/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrsText)) !== null) {
    const name = (m[1] ?? "").toLowerCase();
    if (!name) continue;
    const value = m[3] ?? m[4] ?? m[5] ?? "";
    attrs[name] = value;
  }
  return attrs;
}

function shouldAutoClose(openTag: string, startingTag: string): boolean {
  switch (openTag) {
    case "p":
      return CLOSES_P.has(startingTag);
    case "li":
      return startingTag === "li";
    case "dt":
    case "dd":
      return startingTag === "dt" || startingTag === "dd";
    case "td":
    case "th":
      return startingTag === "td" || startingTag === "th" || startingTag === "tr";
    case "tr":
      return startingTag === "tr";
    case "option":
      return startingTag === "option" || startingTag === "optgroup";
    default:
      return false;
  }
}

/**
 * Parse HTML into a flat forest of nodes. Removes comments and CDATA. `<script>`/`<style>`
 * bodies are dropped (their raw text is never emitted). Malformed/never-closed tags degrade
 * gracefully rather than throwing.
 */
export function parseHtml(html: string): HtmlNode[] {
  // Strip comments and doctype up front so the tokenizer never sees them.
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<!doctype[^>]*>/gi, "");

  const root: HtmlElementNode = { type: "element", tag: "#root", attrs: {}, children: [] };
  const stack: HtmlElementNode[] = [root];
  const top = () => stack[stack.length - 1] as HtmlElementNode;

  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (text) top().children.push({ type: "text", value: text });
  };

  while ((m = tagRe.exec(cleaned)) !== null) {
    pushText(cleaned.slice(lastIndex, m.index));
    lastIndex = tagRe.lastIndex;

    const isClose = m[1] === "/";
    const tag = (m[2] ?? "").toLowerCase();
    const attrsText = m[3] ?? "";
    const selfClosed = m[4] === "/";

    // Raw-text elements: consume the body verbatim and drop it (script/style/etc.).
    if (!isClose && (tag === "script" || tag === "style" || tag === "template" || tag === "svg")) {
      const closeRe = new RegExp(`</${tag}\\s*>`, "i");
      const rest = cleaned.slice(lastIndex);
      const closeMatch = closeRe.exec(rest);
      if (closeMatch) {
        lastIndex += closeMatch.index + closeMatch[0].length;
        tagRe.lastIndex = lastIndex;
      } else {
        lastIndex = cleaned.length;
        tagRe.lastIndex = lastIndex;
      }
      continue;
    }

    if (isClose) {
      // Pop up to the matching open tag if present.
      let foundAt = -1;
      for (let i = stack.length - 1; i >= 1; i -= 1) {
        if ((stack[i] as HtmlElementNode).tag === tag) {
          foundAt = i;
          break;
        }
      }
      if (foundAt !== -1) {
        stack.length = foundAt;
      }
      continue;
    }

    // Auto-close optional-end tags before opening a new element.
    while (stack.length > 1 && shouldAutoClose(top().tag, tag)) {
      stack.pop();
    }

    const el: HtmlElementNode = { type: "element", tag, attrs: parseAttrs(attrsText), children: [] };
    top().children.push(el);
    if (!selfClosed && !VOID_ELEMENTS.has(tag)) {
      stack.push(el);
    }
  }
  pushText(cleaned.slice(lastIndex));

  return root.children;
}

/** Decode the common HTML entities that appear in body text. */
export function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
    mdash: "—", ndash: "–", hellip: "…", copy: "©",
    reg: "®", trade: "™", deg: "°", eacute: "é",
    egrave: "è", agrave: "à", uuml: "ü", ouml: "ö",
    times: "×", divide: "÷", frac12: "½", middot: "·",
    bull: "•", laquo: "«", raquo: "»", euro: "€",
  };
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? safeFromCodePoint(code) : whole;
    }
    if (body.startsWith("#")) {
      const code = parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? safeFromCodePoint(code) : whole;
    }
    const mapped = named[body.toLowerCase()];
    return mapped ?? whole;
  });
}

function safeFromCodePoint(code: number): string {
  try {
    if (code <= 0 || code > 0x10ffff) return "";
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
