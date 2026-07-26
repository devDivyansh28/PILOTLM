# AI Research Assistant — Business Context

> **Single source of truth** for product, technical, and business decisions.  
> Update as decisions are made. All team members reference this for alignment.

---

## 1. Product Vision

**One-liner**: *Gemini Notebook for researchers who need every answer grounded in their own sources — with precise citations they can click to verify.*

**Differentiator**: Citation-first UX. Every claim links to the exact source location (PDF page/bbox, YouTube timestamp, text char range). No hallucination theater.

---

## 2. Personas

| Persona | Description | Goals | Pain Points |
|---------|-------------|-------|-------------|
| **Solo Researcher** (Primary) | PhD student, analyst, journalist, consultant | Upload 10-50 sources per project, ask iterative questions, export verified findings | Existing tools hallucinate; citations are vague; can't trace claims to source |
| **Admin/Developer** (Secondary) | You — configuring providers, monitoring usage, managing feature flags | Swap LLM/embedding/reranker providers via config; observe costs; toggle features | Hardcoded providers; no observability; manual re-indexing |

---

## 3. MVP Scope (Phase 1-7)

### 3.1 Source Types (6)

| Type | Ingestion | Viewer | Citation Precision |
|------|-----------|--------|-------------------|
| **PDF** | `PDFLoader` + OCR (PaddleOCR, auto-lang) | PDF.js + bbox highlight | Page + bbox (x,y,w,h) |
| **Plain Text/Markdown** | `TextLoader` | In-app highlight | Char range [start, end] |
| **Website** | `SitemapLoader` (crawl sitemap.xml) | Rendered iframe + highlight | URL + char range |
| **YouTube** | `YoutubeLoader` (yt-dlp transcript) | Embedded player + transcript sidebar | Timestamp (seconds) |
| **VTT/SRT** | Custom parser | In-app highlight | Cue timestamp |
| **PPTX** | `UnstructuredPowerPointLoader` | Slide viewer + notes toggle | Slide index + char range |

### 3.2 Advanced RAG Pipeline (All in MVP)

```
User Query
    → Query Rewrite (grammar/semantics)
    → Step-Back Prompting (abstract → specific)
    → Sub-Query Decomposition
    → HyDE (hypothetical doc generation)
    → Parallel Retrieval (50 chunks each)
    → Reciprocal Rank Fusion (RRF)
    → Cohere Rerank (top 10)
    → LLM Generation (streaming, citation-enforced)
    → Answer + Inline Citation Chips
```

### 3.3 Source Viewer (6 Tabs, Citation-Deep-Linked)

Click citation `[1]` → Viewer opens at exact location:
- **PDF**: Jump to page, draw bbox overlay
- **YouTube**: Seek to timestamp, highlight transcript line
- **Website**: Scroll to highlighted segment
- **PPTX**: Jump to slide, highlight text
- **Text/VTT**: Scroll to char range, highlight

### 3.4 Admin Panel (Developer Only — Not End-User)

| Section | Config |
|---------|--------|
| **LLM Providers** | Add/edit/delete: provider, model, API key, default toggle, test connection |
| **Embeddings** | Same pattern: provider, model, dimensions, default |
| **Reranker** | Provider, model, top-k, enable toggle |
| **Feature Flags** | OCR, Auto-reindex, Advanced RAG steps (rewrite, step-back, sub-queries, HyDE, RRF) |
| **Usage** | API calls, tokens, estimated cost per provider |

---

## 4. Technical Architecture (Decided)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14 (App Router, TypeScript) | Vercel-native, Server Actions, streaming |
| **Auth** | Clerk | Managed, webhooks for user sync |
| **Database** | Neon (PostgreSQL) + Prisma ORM | Serverless, branching, generous free tier |
| **Vector DB** | Qdrant Cloud (per-notebook collections) | Payload filtering, multi-tenancy via collections |
| **File Storage** | ImageKit (direct client upload, signed URLs) | CDN, transformations, generous free tier |
| **Job Queue** | Inngest (Vercel-native, no worker hosting) | Cron, retries, fan-out, observability |
| **RAG Framework** | LangChain.js | JS/TS native, modular chains |
| **LLM/Embedding Providers** | Multi-provider via `providers.yaml` | OpenAI, Anthropic, Cohere, Ollama, HuggingFace |
| **Reranker** | Cohere Rerank v3.5 (API) | Free tier, no GPU needed |
| **OCR** | PaddleOCR (via Python microservice or WASM) | Auto-lang detect, better handwriting than Tesseract |
| **Observability** | Phase 2: LangSmith + Vercel Analytics | RAG tracing + web vitals |

### 4.1 Data Model (Lean — No Chunks Table)

```prisma
// All chunk data + citation metadata lives in Qdrant payload
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  notebooks Notebook[]
  queries   Query[]
}

model Notebook {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                  String
  description           String?
  qdrantCollectionName  String   @unique // "notebook_{id}"
  sources               Source[]
  queries               Query[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  @@index([userId])
}

model Source {
  id              String      @id @default(cuid())
  notebookId      String
  notebook        Notebook    @relation(fields: [notebookId], references: [id], onDelete: Cascade)
  type            SourceType
  uri             String      // Original URL or ImageKit file URL
  title           String?
  status          SourceStatus @default(PENDING)
  metadata        Json        @default("{}") // {pages, duration, language, sitemapUrl, etc.}
  errorMessage    String?
  retryCount      Int         @default(0)
  lastIndexedAt   DateTime?
  imageKitFileId  String?     // For uploaded files
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  @@index([notebookId])
  @@index([status])
}

model Query {
  id                   String   @id @default(cuid())
  notebookId           String
  notebook             Notebook @relation(fields: [notebookId], references: [id], onDelete: Cascade)
  userId               String
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  question             String
  rewrittenQueries     Json     @default("[]")
  hydeDocument         String?
  retrievedChunkIds    Json     @default("[]") // Qdrant point IDs
  answer               String
  citations            Json     @default("[]") // Full citation objects for viewer
  latencyMs            Int?
  createdAt            DateTime @default(now())
  @@index([notebookId])
  @@index([userId])
}

enum SourceType { PDF, TEXT, WEBSITE, YOUTUBE, VTT, PPTX }
enum SourceStatus { PENDING, UPLOADING, EXTRACTING, CHUNKING, EMBEDDING, STORING, READY, FAILED, DELETING }
```

**Qdrant Payload per Chunk**:
```json
{
  "source_id": "uuid",
  "notebook_id": "uuid",
  "text": "chunk content",
  "source_type": "pdf",
  "chunk_index": 0,
  "page": 5,
  "timestamp": 120.5,
  "char_range": [100, 600],
  "bbox": [x, y, w, h],
  "slide_index": 3,
  "cue_index": 7
}
```

---

## 5. Configuration-Driven Providers (`lib/config/providers.yaml`)

```yaml
llm:
  default: "openai-gpt4o"
  providers:
    openai-gpt4o:
      provider: "openai"
      model: "gpt-4o"
      apiKey: "${OPENAI_API_KEY}"
      temperature: 0.1
      maxTokens: 4096
    anthropic-sonnet:
      provider: "anthropic"
      model: "claude-3-5-sonnet-20241022"
      apiKey: "${ANTHROPIC_API_KEY}"
    ollama-local:
      provider: "ollama"
      model: "llama3.1:8b"
      baseUrl: "${OLLAMA_BASE_URL}"

embeddings:
  default: "openai-3-large"
  providers:
    openai-3-large:
      provider: "openai"
      model: "text-embedding-3-large"
      apiKey: "${OPENAI_API_KEY}"
      dimensions: 3072
    cohere-v3:
      provider: "cohere"
      model: "embed-english-v3.0"
      apiKey: "${COHERE_API_KEY}"
      dimensions: 1024

reranker:
  default: "cohere-rerank-v3"
  providers:
    cohere-rerank-v3:
      provider: "cohere"
      model: "rerank-v3.5"
      apiKey: "${COHERE_API_KEY}"
      topN: 10
```

---

## 6. Inngest Functions (Job Queue)

| Function | Trigger | Steps |
|----------|---------|-------|
| `ingest-source` | Event `source/ingest` | Status: EXTRACTING → CHUNKING → EMBEDDING → STORING → READY (3 retries each) |
| `reindex-source` | Event `source/reindex` | Delete old vectors → Re-trigger ingest |
| `auto-sync-sources` | Cron `0 */6 * * *` | Poll Website/YouTube for changes → Reindex if changed |
| `process-ocr` | Event `ocr/process` | Download PDF → PaddleOCR → Update source with extracted text |

---

## 7. Business Model

| Tier | Price | Limits | Target |
|------|-------|--------|--------|
| **Free** | $0 | 3 notebooks, 10 sources/notebook, 50 queries/day, OpenAI only | Hobbyists, students |
| **Pro** | $20/mo | Unlimited notebooks/sources, 500 queries/day, all providers, OCR, export | Researchers, analysts |
| **Team** | $50/user/mo | Pro + shared notebooks (Phase 2), SSO, audit logs, priority support | Research teams |
| **API** | Usage | Per 1K queries + token costs | Embed in other apps |

---

## 8. Success Metrics

| Category | Metric | Target (6mo) |
|----------|--------|--------------|
| **Activation** | % users creating notebook + uploading ≥1 source + asking ≥1 query | >40% |
| **Engagement** | Queries/user/week (Pro) | >20 |
| **Quality** | User "citation helpful" thumbs-up rate | >80% |
| **Retention** | Week-4 retention (Pro) | >50% |
| **Technical** | P95 query latency (streaming first token) | <1.5s |
| **Technical** | Ingestion success rate | >98% |

---

## 9. Roadmap

| Phase | Timeline | Focus |
|-------|----------|-------|
| 1-2 | Done | Requirements + Architecture |
| 3-4 | **Current** | UX/UI Design → Prototype → Design System |
| 5 | 1 wk | Component Library (shadcn/ui + custom) |
| 6 | 3 wks | Frontend Implementation |
| 7 | 2 wks | Backend + Inngest + RAG Pipeline |
| 8 | 1 wk | Integration + E2E Testing |
| 9 | 1 wk | Deploy + Launch |

**Post-MVP**:
- Notebook sharing & collaboration
- Export (Markdown, PDF, Anki, Obsidian)
- Local-first mode (Ollama + embedded Qdrant)
- Graph view (source connections)
- Prompt templates library
- Browser extension (save to notebook)

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Citation accuracy** (wrong page/timestamp) | High | Critical | Automated eval (Ragas), manual spot-check, user feedback loop |
| **Provider API costs spike** | Medium | High | Usage caps per tier, cost estimates in admin, local Ollama fallback |
| **Qdrant Cloud free tier limits** | Medium | Medium | Monitor collection size, archive old notebooks, self-host option |
| **OCR quality on handwriting** | High | Medium | Flag low-confidence OCR, allow manual correction, Phase 2: fine-tune |
| **Inngest/Vercel timeout on large PDFs** | Medium | High | Chunk processing, streaming uploads, background OCR microservice |
| **Citation injection prompt leakage** | Low | Critical | Hardened system prompt, output parser validates citation format |

---

## 11. Design Principles (For Phase 4/5)

1. **Citation visibility** — Never hide source. Inline chips > footnotes.
2. **Density over whitespace** — Researchers scan; they don't read.
3. **Keyboard-first** — `j/k` navigate sources, `Enter` open, `Esc` close, `Cmd+K` command palette.
4. **Streaming = perceived speed** — First token <500ms, citations inject as they arrive.
5. **Dark mode native** — Not inverted light mode. Semantic tokens.
6. **State clarity** — Every source shows status: `pending → extracting → chunking → embedding → storing → ready/failed`.
7. **Admin ≠ User** — Admin panel is technical, dense, table-heavy. No hand-holding.

---

## 12. Open Questions (Resolve Before Phase 5)

| # | Question | Options | Decision |
|---|----------|---------|----------|
| 1 | **Mobile support MVP?** | A) Desktop only  B) Responsive tablet  C) Mobile-specific flows | |
| 2 | **Export formats MVP?** | A) Markdown only  B) + PDF  C) + Anki/Obsidian | |
| 3 | **PaddleOCR hosting?** | A) Python FastAPI on Railway  B) WASM in browser  C) Serverless GPU (Modal) | |
| 4 | **Design tokens export format?** | A) Tailwind config  B) CSS variables  C) Both | |
| 5 | **Admin panel: user management in MVP?** | A) Yes (Clerk orgs)  B) Phase 2 | |
| 6 | **Default embedding model?** | A) `text-embedding-3-large` (3072d)  B) `text-embedding-3-small` (1536d) | |

---

## 13. File Map (Key Paths)

```
├── prisma/schema.prisma
├── lib/config/providers.yaml
├── lib/inngest/functions/
│   ├── ingest-source.ts
│   ├── reindex-source.ts
│   ├── auto-sync.ts
│   └── ocr-process.ts
├── features/
│   ├── sources/ingestion/{extractors,chunkers,embedders,indexers}
│   ├── query/pipeline/{rewrite,stepback,subqueries,hyde,retrieve,rerank,rrf,generate}
│   └── viewer/components/{PDF,YouTube,Website,PPTX,Text,VTT}Viewer.tsx
├── app/api/{notebooks,sources,query,clerk-webhook,imagekit-webhook}
├── components/ui/ (shadcn/ui)
└── design.md (output of Phase 5)
```

---

## 14. Reference Links

- **LangChain.js**: https://js.langchain.com
- **Inngest**: https://inngest.com
- **Qdrant Cloud**: https://cloud.qdrant.io
- **Neon**: https://neon.tech
- **ImageKit**: https://imagekit.io
- **Clerk**: https://clerk.com
- **PaddleOCR**: https://github.com/PaddlePaddle/PaddleOCR
- **Ragas**: https://docs.ragas.io
- **shadcn/ui**: https://ui.shadcn.com

---

*Last updated: 2026-07-26*  
*Owner: Product/Tech Lead*