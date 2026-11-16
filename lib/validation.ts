import { z } from "zod";

export const MAX_CONTENT_BYTES = 500_000; // ~500 KB of HTML per document
export const MAX_UPLOAD_BYTES = 2_000_000; // 2 MB per imported file

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title cannot be empty")
  .max(200, "Title must be 200 characters or fewer");

export const contentSchema = z
  .string()
  .refine((s) => Buffer.byteLength(s, "utf8") <= MAX_CONTENT_BYTES, "Document is too large (max 500 KB)");

export const createDocSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
});

export const updateDocSchema = z
  .object({ title: titleSchema.optional(), content: contentSchema.optional() })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update");

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["viewer", "editor"]).default("editor"),
});
