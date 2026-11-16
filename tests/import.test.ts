import { describe, expect, it } from "vitest";
import { fileToHtml, titleFromFilename } from "@/lib/import";
import { updateDocSchema } from "@/lib/validation";

describe("file import", () => {
  it("converts markdown to formatted HTML", async () => {
    const html = await fileToHtml("notes.md", Buffer.from("# Title\n\nSome **bold** text\n\n- one\n- two\n"));
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
  });

  it("converts plain text to paragraphs and escapes HTML", async () => {
    const html = await fileToHtml("a.txt", Buffer.from("Hello <script>x</script>\nline two\n\nSecond para"));
    expect(html).toBe("<p>Hello &lt;script&gt;x&lt;/script&gt;<br />line two</p><p>Second para</p>");
  });

  it("rejects unsupported, empty and oversized files", async () => {
    await expect(fileToHtml("image.png", Buffer.from("x"))).rejects.toMatchObject({ status: 400 });
    await expect(fileToHtml("empty.txt", Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
    await expect(fileToHtml("big.txt", Buffer.alloc(2_000_001, "a"))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a corrupt .docx with a friendly error", async () => {
    await expect(fileToHtml("broken.docx", Buffer.from("not a zip"))).rejects.toMatchObject({ status: 400 });
  });

  it("derives a title from the filename", () => {
    expect(titleFromFilename("Meeting Notes.final.md")).toBe("Meeting Notes.final");
  });
});

describe("validation", () => {
  it("rejects empty titles and empty updates", () => {
    expect(updateDocSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(updateDocSchema.safeParse({}).success).toBe(false);
    expect(updateDocSchema.safeParse({ title: "Ok" }).success).toBe(true);
  });
});
