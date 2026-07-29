import * as fs from "fs";
import * as path from "path";
import * as os from "os";
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

async function downloadToTemp(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = path.extname(new URL(url).pathname) || ".tmp";
  const tmp = path.join(os.tmpdir(), `pilotlm-${Date.now()}${ext}`);
  fs.writeFileSync(tmp, buffer);
  return tmp;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
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
  const isRemote = filePath.startsWith("http");
  const localPath = isRemote ? await downloadToTemp(filePath) : filePath;
  try {
    const loader = new PDFLoader(localPath, { splitPages: false });
    const documents = await loader.load();
    return { documents, metadata: { pageCount: documents.length, fileType: "pdf" } };
  } finally {
    if (isRemote) fs.unlinkSync(localPath);
  }
}

async function loadText(filePath: string): Promise<LoaderResult> {
  const content = filePath.startsWith("http") ? await fetchText(filePath) : fs.readFileSync(filePath, "utf-8");
  const documents = [new Document({ pageContent: content, metadata: { source: filePath } })];
  return { documents, metadata: { fileType: "text", charCount: content.length } };
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
  const loader = YoutubeLoader.createFromUrl(url, { language: "en", addVideoInfo: true });
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

function parseVTT(content: string): { text: string; segments: { start: number; end: number; text: string }[] } {
  const lines = content.split("\n");
  const segments: { start: number; end: number; text: string }[] = [];
  let currentStart = 0;
  let currentEnd = 0;
  let currentText: string[] = [];

  const timeRegex = /(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(timeRegex);
    if (match) {
      if (currentText.length > 0) {
        segments.push({ start: currentStart, end: currentEnd, text: currentText.join(" ").replace(/<[^>]+>/g, "") });
        currentText = [];
      }
      const toMs = (h: string, m: string, s: string, ms: string) =>
        (parseInt(h || "0") * 3600 + parseInt(m) * 60 + parseInt(s)) * 1000 + parseInt(ms);
      currentStart = toMs(match[1] || "0", match[2], match[3], match[4]);
      currentEnd = toMs(match[5] || "0", match[6], match[7], match[8]);
    } else if (trimmed && !trimmed.startsWith("WEBVTT") && !trimmed.startsWith("NOTE") && !/^\d+$/.test(trimmed)) {
      currentText.push(trimmed);
    }
  }
  if (currentText.length > 0) {
    segments.push({ start: currentStart, end: currentEnd, text: currentText.join(" ") });
  }

  const text = segments.map((s) => s.text).join("\n");
  return { text, segments };
}

async function loadVTT(filePath: string): Promise<LoaderResult> {
  const raw = filePath.startsWith("http") ? await fetchText(filePath) : fs.readFileSync(filePath, "utf-8");
  const { text, segments } = parseVTT(raw);
  const documents = [new Document({ pageContent: text, metadata: { source: filePath, segments } })];
  return { documents, metadata: { fileType: "vtt", charCount: text.length, segmentCount: segments.length } };
}

async function loadPPTX(filePath: string): Promise<LoaderResult> {
  const isRemote = filePath.startsWith("http");
  const localPath = isRemote ? await downloadToTemp(filePath) : filePath;
  try {
    const loader = new PPTXLoader(localPath);
    const documents = await loader.load();
    return { documents, metadata: { fileType: "pptx", slideCount: documents.length } };
  } finally {
    if (isRemote) fs.unlinkSync(localPath);
  }
}
