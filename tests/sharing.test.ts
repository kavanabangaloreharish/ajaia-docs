/**
 * Integration tests for the access-control rules, run against a real (in-memory) Postgres.
 * These are the rules that matter most: a bug here leaks or corrupts someone's document.
 */
import { beforeAll, describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;

import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  revokeShare,
  shareDocument,
  updateDocument,
} from "@/lib/documents";

const ALICE = "u_alice";
const BOB = "u_bob";
const CAROL = "u_carol";

describe("documents and sharing", () => {
  let docId: string;

  beforeAll(async () => {
    const doc = await createDocument(ALICE, { title: "Q4 plan", content: "<h1>Plan</h1><p>Draft</p>" });
    docId = doc.id;
  });

  it("owner can read and edit; formatting is preserved", async () => {
    const doc = await getDocument(ALICE, docId);
    expect(doc.role).toBe("owner");
    expect(doc.content).toBe("<h1>Plan</h1><p>Draft</p>");

    const updated = await updateDocument(ALICE, docId, { title: "Q4 plan v2", content: "<p><strong>Bold</strong> <u>u</u></p>" });
    expect(updated.title).toBe("Q4 plan v2");
    expect(updated.content).toBe("<p><strong>Bold</strong> <u>u</u></p>");
  });

  it("a user without access gets 404, not the document", async () => {
    await expect(getDocument(BOB, docId)).rejects.toMatchObject({ status: 404 });
    await expect(updateDocument(BOB, docId, { content: "<p>hacked</p>" })).rejects.toMatchObject({ status: 404 });
  });

  it("viewer can read but not edit, share or delete", async () => {
    await shareDocument(ALICE, docId, "bob@ajaia.test", "viewer");
    const doc = await getDocument(BOB, docId);
    expect(doc.role).toBe("viewer");
    await expect(updateDocument(BOB, docId, { content: "<p>x</p>" })).rejects.toMatchObject({ status: 403 });
    await expect(shareDocument(BOB, docId, "carol@ajaia.test", "editor")).rejects.toMatchObject({ status: 403 });
    await expect(deleteDocument(BOB, docId)).rejects.toMatchObject({ status: 403 });
  });

  it("re-sharing upgrades the role; editor can edit but still not share", async () => {
    const shares = await shareDocument(ALICE, docId, "BOB@ajaia.test", "editor");
    expect(shares).toHaveLength(1);
    expect(shares[0]).toMatchObject({ user_id: BOB, role: "editor" });

    const edited = await updateDocument(BOB, docId, { content: "<p>Bob was here</p>" });
    expect(edited.content).toBe("<p>Bob was here</p>");
    await expect(shareDocument(BOB, docId, "carol@ajaia.test", "viewer")).rejects.toMatchObject({ status: 403 });
  });

  it("dashboard separates owned and shared documents", async () => {
    const alice = await listDocuments(ALICE);
    const bob = await listDocuments(BOB);
    expect(alice.owned.map((d) => d.id)).toContain(docId);
    expect(alice.shared.map((d) => d.id)).not.toContain(docId);
    expect(bob.owned.map((d) => d.id)).not.toContain(docId);
    expect(bob.shared.find((d) => d.id === docId)).toMatchObject({ role: "editor", owner_name: "Alice Johnson" });
  });

  it("rejects sharing with yourself or an unknown user", async () => {
    await expect(shareDocument(ALICE, docId, "alice@ajaia.test", "editor")).rejects.toMatchObject({ status: 400 });
    await expect(shareDocument(ALICE, docId, "nobody@ajaia.test", "editor")).rejects.toMatchObject({ status: 404 });
  });

  it("revoking access removes it immediately", async () => {
    await revokeShare(ALICE, docId, BOB);
    await expect(getDocument(BOB, docId)).rejects.toMatchObject({ status: 404 });
    expect((await listDocuments(BOB)).shared).toHaveLength(0);
  });

  it("stored content is sanitized (no script injection)", async () => {
    const doc = await createDocument(CAROL, { content: '<p onclick="steal()">Hi</p><script>alert(1)</script>' });
    expect(doc.content).toBe("<p>Hi</p>");
  });

  it("only the owner can delete", async () => {
    await deleteDocument(ALICE, docId);
    await expect(getDocument(ALICE, docId)).rejects.toMatchObject({ status: 404 });
  });
});
