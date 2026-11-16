import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createDocument } from "@/lib/documents";
import { badRequest } from "@/lib/errors";
import { fileToHtml, titleFromFilename } from "@/lib/import";

// Upload a .txt / .md / .docx file and turn it into a new editable document.
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Expected a multipart form upload");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("No file was uploaded");
  const html = await fileToHtml(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await createDocument(user.id, { title: titleFromFilename(file.name), content: html });
  return NextResponse.json(doc, { status: 201 });
});
