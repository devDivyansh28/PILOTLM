import * as fs from "fs";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { SourceType } from "@/lib/generated/prisma/enums";

export interface LoaderResult {
  documents: Document[];
  metadata: Record<string, unknown>;
}

export async function loadSource(
  type: SourceType,
  source: { filePath?: string; url?: string; metadata?: Record<string, unknown> }
): Promise<LoaderResult> {
  switch (type) {
    case "PDF":
      return loadPDF(source.filePath!);
    case "TEXT":
      return loadText(source.filePath!);
    case "WEBSITE":
      return loadWebsite(source.url!);
    case "YOUTUBE":
      return loadYouTube(source.url!);
    case "VTT":
      return loadVTT(source.filePath!);
    case "PPTX":
      return loadPPTX(source.filePath!);
    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}

async function loadPDF(filePath: string): Promise<LoaderResult> {
  const loader = new PDFLoader(filePath, {
    splitPages: false,
  });
  const documents = await loader.load();

  const metadata: Record<string, unknown> = {
    pageCount: documents.length,
    fileType: "pdf",
  };

  return { documents, metadata };
}

async function loadText(filePath: string): Promise<LoaderResult> {
  const content = fs.readFileSync(filePath, "utf-8");
  const documents = [new Document({ pageContent: content, metadata: { source: filePath } })];

  const metadata: Record<string, unknown> = {
    fileType: "text",
    charCount: content.length,
  };

  return { documents, metadata };
}

async function loadWebsite(url: string): Promise<LoaderResult> {
  const loader = new CheerioWebBaseLoader(url);
  const documents = await loader.load();

  const metadata: Record<string, unknown> = {
    fileType: "website",
    sourceUrl: url,
    charCount: documents[0]?.pageContent?.length || 0,
  };

  return { documents, metadata };
}

async function loadYouTube(url: string): Promise<LoaderResult> {
  const loader = YoutubeLoader.createFromUrl(url, {
    language: "en",
    addVideoInfo: true,
  });
  const documents = await loader.load();

  const videoInfo = documents[0]?.metadata;
  const metadata: Record<string, unknown> = {
    fileType: "youtube",
    videoId: videoInfo?.videoId,
    title: videoInfo?.title,
    author: videoInfo?.author,
    duration: videoInfo?.duration,
    sourceUrl: url,
  };

  return { documents, metadata };
}

async function loadVTT(filePath: string): Promise<LoaderResult> {
  const content = fs.readFileSync(filePath, "utf-8");
  const documents = [new Document({ pageContent: content, metadata: { source: filePath } })];

  const metadata: Record<string, unknown> = {
    fileType: "vtt",
    charCount: content.length,
  };

  return { documents, metadata };
}

async function loadPPTX(filePath: string): Promise<LoaderResult> {
  const loader = new PPTXLoader(filePath);
  const documents = await loader.load();

  const metadata: Record<string, unknown> = {
    fileType: "pptx",
    slideCount: documents.length,
  };

  return { documents, metadata };
}