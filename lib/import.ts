/**
 * File import: turns an uploaded .txt / .md / .docx into editor-ready (sanitized) HTML.
 * Supported types are deliberately limited and stated in the UI and README.
 */
import { marked } from "marked";
import { badRequest } from "./errors";
import { sanitizeContent } from "./sanitize";
import { MAX_UPLOAD_BYTES } from "./validation";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return (base || "Imported document").slice(0, 200);
}

export async function fileToHtml(filename: string, data: Buffer): Promise<string> {
  if (data.byteLength === 0) throw badRequest("The file is empty");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw badRequest("File is too large (max 2 MB)");

  const ext = extensionOf(filename);
  let html: string;
  switch (ext) {
    case ".txt":
      html = textToHtml(data.toString("utf8"));
      break;
    case ".md":
      html = await marked.parse(data.toString("utf8"));
      break;
    case ".docx": {
      const mammoth = await import("mammoth");
      try {
        const result = await mammoth.convertToHtml({ buffer: data });
        html = result.value;
      } catch {
        throw badRequest("Could not read this .docx file. Is it a valid Word document?");
      }
      break;
    }
    default:
      throw badRequest(`Unsupported file type "${ext || "none"}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
  }
  return sanitizeContent(html);
}
