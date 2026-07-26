# AI Research Assistant — Product Understanding

## Product Concept

An AI-powered research assistant inspired by Google's NotebookLM that lets users upload multiple knowledge sources, ask natural language questions grounded in those sources, and receive answers with precise citations that can be inspected at the exact source location.

Each source is ingested (extracted, chunked, embedded, stored in a vector database), and per-notebook isolation ensures knowledge never leaks between projects.

---

## Source Types (6)

| Source | Ingestion Method | Viewer | Citation Precision |
|--------|------------------|--------|-------------------|
| **PDF** | LangChain's `PDFLoader`, plus OCR (PaddleOCR) for scanned/handwritten pages | PDF.js with bbox highlight and page jump | Page number + bbox coordinates |
| **Plain Text** | LangChain's `TextLoader` | In-app highlight with char range | Character range [start, end] |
| **Website** | LangChain's `SitemapLoader` (sitemap-based crawl) | Rendered iframe with highlighted segment | URL + character range |
| **YouTube** | LangChain's `YoutubeLoader` (yt-dlp transcript extraction) | Embedded IFrame player seeked to timestamp | Timestamp in seconds |
| **VTT/SRT** | Custom parser or UnstructuredLoader | In-app highlight with cue reference | Cue timestamp |
| **PPTX** | LangChain's `UnstructuredPowerPointLoader` | Slide viewer with highlighted section | Slide index + char range |

**Third-party libraries are used only when LangChain does not provide a loader — otherwise LangChain loaders are preferred.**

---

## Ingestion Pipeline (Per Source)

```
Upload → Extract Content → Chunk (RecursiveCharacterTextSplitter) 
  → Generate Embeddings → Store in Vector DB → Status: Ready
```

Status transitions: `Pending → Uploading → Extracting → Chunking → Embedding → Storing → Ready (or Failed)`

Auto-retry 3 times on failure, then move to dead letter queue. Sources can be manually re-indexed or auto-detected for changes (local file system watch, YouTube transcript polling, website content hash).

---

## Advanced RAG Pipeline (All in MVP)

```
User Query
  → Query Rewrite (grammar/semantic correction)  
  → Step-Back Prompting (abstract higher-level question)
  → Sub-Query Decomposition (break into sub-questions)
  → HyDE (Hypothetical Document Embedding generation)
  → Parallel Retrieval (k=50 per query)
  → Reciprocal Rank Fusion (RRF — merge and deduplicate)
  → Rerank (Cohere Rerank API, top 10)
  → LLM Generation (streaming, citation-enforced prompt)
  → Answer with Inline Citations
```

Uses LangChain.js (TypeScript) as the RAG framework. All providers (LLM, embeddings, reranker) are configurable via a single `providers.yaml` file — no hardcoded providers.

---

## Citation & Source Viewer

Every answer must include citations; the user should **never receive an answer without knowing where it came from**.

Citations are precise: PDF page + bbox, YouTube timestamp, char ranges, slide index. Clicking a citation chip opens the in-app source viewer at the exact location:

| Source Type | Viewer Behavior |
|-------------|-----------------|
| PDF | Opens PDF.js at exact page with bbox highlight |
| YouTube | Embedded IFrame player seeks to exact timestamp |
| Website | Renders iframe with highlighted text segment |
| PPTX | Opens slide viewer at exact slide with highlight |
| Text/VTT | Scrolls to char range with yellow highlight |

---

## Notebook & Knowledge Isolation

Each notebook maintains its own isolated knowledge base (one Qdrant collection per notebook). No data leaks between notebooks. Auth is via Clerk; notebooks are private to the user — no sharing/collaboration in MVP.

---

## Admin Panel (Developer Only)

Not exposed to end users. Allows:
- Configuring LLM, embedding, and reranker providers (CRUD table + test connection)
- Toggling feature flags (OCR, auto-reindex, each step of advanced RAG)
- Viewing usage analytics (API calls, token counts, cost estimates)

---

## Tech Stack (Decided)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend & Backend** | Next.js 14 (App Router, TypeScript) | Full-stack, Vercel-native, Server Actions, streaming support |
| **Auth** | Clerk | Managed, webhooks for user sync, generous free tier |
| **Database** | Neon (PostgreSQL) + Prisma ORM | Serverless, branching, generous free tier |
| **Vector DB** | Qdrant Cloud (per-notebook collections) | Payload filtering, per-collection isolation, free tier |
| **File Storage** | ImageKit (direct client-signed upload) | CDN, transformations, generous free tier |
| **Job Queue** | Inngest | Vercel-native (no separate worker), cron, retries, observability |
| **RAG Framework** | LangChain.js | First-class TypeScript support, modular chains |
| **LLM/Embedding Providers** | Multi-provider via `providers.yaml` | OpenAI, Anthropic, Cohere, Ollama, HuggingFace — swappable |
| **Reranker** | Cohere Rerank API | Free tier, no GPU needed |
| **OCR** | PaddleOCR (via Python microservice or WASM) | Auto language detection, better than Tesseract for handwriting |
| **UI Primitives** | shadcn/ui + Radix | Accessible, customizable, own the code |
| **Styling** | Tailwind CSS + CSS Variables | Light + Dark theme from day one |
| **Dark Mode** | next-themes | Class-based, persists preference |
| **Icons** | lucide-react | Tree-shakeable, consistent 24px/2px stroke |
| **Hosting** | Vercel (free tier) | Serverless, edge functions, automatic deployments |

**Process for every source type:** Use LangChain's built-in loaders first. Only bring in a third-party library (like PaddleOCR) when LangChain does not natively support the feature.

---

## Client Requirements Summary

- Build an AI-powered research assistant inspired by NotebookLM
- Upload multiple source types: PDF, plain text, website URL, YouTube video, VTT/SRT transcript, PowerPoint
- OCR for scanned PDFs and handwritten notes/scripts
- Each notebook maintains its own isolated knowledge base
- Sources show status: uploading → indexing → ready for querying
- Sources can be removed or re-indexed
- Ask natural language questions grounded in uploaded sources
- Retrieve chunks → send to LLM → generate grounded answer with citations
- Display citations for every answer — never show an answer without source attribution
- Clicking a citation opens the original source at exact location (PDF page, YouTube timestamp, etc.)
- Source viewer renders in-app (PDF.js, embedded YouTube, iframe preview, etc.)
- Citations at precise granularity (page numbers, timestamps, char ranges)
- Full authentication (Clerk), private notebooks (no sharing in MVP)
- Light + Dark theme support
- Admin panel for developer to configure providers and feature flags