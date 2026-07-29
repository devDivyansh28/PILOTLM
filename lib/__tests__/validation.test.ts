import { describe, it, expect } from "vitest";
import { createSourceSchema, chatRequestSchema, createNotebookSchema, completeUploadSchema } from "@/lib/validation";

describe("createSourceSchema", () => {
  it("accepts valid PDF source", () => {
    const result = createSourceSchema.safeParse({ notebookId: "nb1", type: "PDF", name: "doc.pdf" });
    expect(result.success).toBe(true);
  });

  it("rejects missing notebookId", () => {
    const result = createSourceSchema.safeParse({ type: "PDF", name: "doc.pdf" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createSourceSchema.safeParse({ notebookId: "nb1", type: "DOCX", name: "doc.docx" });
    expect(result.success).toBe(false);
  });

  it("accepts optional URL", () => {
    const result = createSourceSchema.safeParse({ notebookId: "nb1", type: "WEBSITE", name: "site", url: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = createSourceSchema.safeParse({ notebookId: "nb1", type: "WEBSITE", name: "site", url: "not-a-url" });
    expect(result.success).toBe(false);
  });
});

describe("chatRequestSchema", () => {
  it("accepts valid chat request", () => {
    const result = chatRequestSchema.safeParse({ notebookId: "nb1", query: "hello" });
    expect(result.success).toBe(true);
  });

  it("rejects empty query", () => {
    const result = chatRequestSchema.safeParse({ notebookId: "nb1", query: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional chatId", () => {
    const result = chatRequestSchema.safeParse({ notebookId: "nb1", query: "hello", chatId: "ch1" });
    expect(result.success).toBe(true);
  });
});

describe("createNotebookSchema", () => {
  it("accepts valid title", () => {
    const result = createNotebookSchema.safeParse({ title: "My Notebook" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createNotebookSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});

describe("completeUploadSchema", () => {
  it("accepts valid data", () => {
    const result = completeUploadSchema.safeParse({ action: "completeUpload", filePath: "/sources/doc.pdf" });
    expect(result.success).toBe(true);
  });

  it("rejects wrong action", () => {
    const result = completeUploadSchema.safeParse({ action: "reindex", filePath: "/sources/doc.pdf" });
    expect(result.success).toBe(false);
  });
});
