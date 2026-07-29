import { z } from "zod";

export const SourceTypeEnum = z.enum(["PDF", "TEXT", "WEBSITE", "YOUTUBE", "VTT", "PPTX"]);

export const createSourceSchema = z.object({
  notebookId: z.string().min(1),
  type: SourceTypeEnum,
  name: z.string().min(1),
  filePath: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
});

export const chatRequestSchema = z.object({
  notebookId: z.string().min(1),
  query: z.string().min(1).max(10000),
  chatId: z.string().optional(),
});

export const createNotebookSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const completeUploadSchema = z.object({
  action: z.literal("completeUpload"),
  filePath: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});
