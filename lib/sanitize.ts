import sanitizeHtml from "sanitize-html";

// Only the formatting the editor can actually produce is allowed through.
// Everything else (scripts, inline handlers, styles, iframes) is stripped server-side.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "code", "pre", "hr", "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
};

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
