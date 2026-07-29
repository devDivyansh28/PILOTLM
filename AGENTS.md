# AGENTS.md — PilotLM (AI Research Assistant)

## Project Overview
AI-powered research assistant inspired by NotebookLM. Users upload sources (PDF, text, websites, YouTube, VTT/SRT, PPTX), ask questions, get answers with precise citations linked to source viewers.

## Tech Stack (Locked In)
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Auth | Clerk (route groups: `(auth)`, `(dashboard)`) |
| Database | Neon PostgreSQL + Prisma ORM (`lib/db.ts`) |
| Vector DB | Qdrant Cloud (per-notebook collections) |
| File Storage | ImageKit (direct client upload) |
| Job Queue | BullMQ + Railway Redis (worker on Railway) |
| RAG Framework | LangChain.js (TypeScript) |
| Providers | Multi-provider via `config/providers.yaml` (OpenAI for MVP) |
| Reranker | Cohere Rerank API |
| UI | shadcn/ui + Radix + Tailwind + CSS Variables |
| Dark Mode | next-themes (`components/providers/theme-provider.tsx`) |
| Icons | lucide-react |
| Hosting | Vercel (app) + Railway (Redis + BullMQ worker) |

## Repository Structure (Feature-Based)
```
src/
├── app/
│   ├── (auth)/              # Clerk sign-in/up pages
│   ├── (dashboard)/         # Protected notebook routes
│   ├── api/                 # API routes (chat, sources, viewers)
│   ├── layout.tsx           # Root layout with providers
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn/ui primitives (do not modify directly)
│   ├── providers/           # ThemeProvider, QueryProvider
│   └── layout/              # Sidebar, Header, ThemeToggle
├── features/                # Feature-based modules (NEW CONVENTION)
│   └── auth/
│       ├── action/          # Server Actions
│       ├── components/      # Feature-specific UI components
│       ├── hooks/           # Feature-specific hooks
│       └── utils/           # Feature-specific utilities
├── hooks/                   # Shared React hooks
├── lib/
│   ├── db.ts                # Prisma client singleton (import from `@/lib/db`)
│   ├── queue/               # BullMQ client + workers
│   ├── vector/              # Qdrant client
│   ├── storage/             # ImageKit helpers
│   ├── rag/                 # 7-step RAG chain (LangChain.js)
│   ├── providers/           # providers.yaml loader + abstractions
│   └── utils.ts             # cn(), helpers
├── config/
│   └── providers.yaml       # LLM/embedding/reranker config
└── prompts/                 # Prompt templates for RAG steps
```

## Feature Folder Convention
Each feature under `features/` owns its own:
- `action/` — Server Actions (mutations, data fetching)
- `components/` — Feature-specific React components
- `hooks/` — Feature-specific React hooks
- `utils/` — Feature-specific utilities

**Do not** create feature code outside this structure. Shared code goes in `components/`, `hooks/`, `lib/`.

Example: `features/auth/action/onboard.ts` — Clerk user sync to Neon via Prisma.

## Key Files to Know
- `prisma/schema.prisma` — Data models (User, Notebook, Source, SourceChunk, Job, Citation)
- `lib/db.ts` — Prisma singleton (use `import { prisma } from '@/lib/db'`)
- `lib/providers/` — Provider registry (OpenAI, Anthropic, Cohere, Ollama, HF)
- `config/providers.yaml` — All model config (temperature, maxTokens, prompts)
- `components/providers/theme-provider.tsx` — Dark mode setup
- `middleware.ts` — Clerk auth protection (create if missing)

## Developer Commands
```bash
# Dev
pnpm dev                    # Next.js dev server
pnpm db:push                # Push Prisma schema to Neon
pnpm db:studio              # Prisma Studio
pnpm db:generate            # Generate Prisma client

# Quality
pnpm lint                   # ESLint (flat config, next/core-web-vitals + TS)
pnpm build                  # Production build (runs typecheck)
pnpm typecheck              # tsc --noEmit (if configured)

# Queue (Railway worker)
pnpm worker:dev             # BullMQ worker locally (needs Redis)
```

## Environment Variables (Required)
```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database
DATABASE_URL=               # Neon connection string

# Qdrant
QDRANT_URL=
QDRANT_API_KEY=

# ImageKit
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=

# Redis (Railway)
REDIS_URL=

# Providers
OPENAI_API_KEY=
COHERE_API_KEY=             # For reranker

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Conventions & Gotchas
1. **Server Actions** for mutations (upload, delete, reindex) — not API routes
2. **Streaming responses** via Vercel AI SDK or custom ReadableStream in `/api/chat`
3. **BullMQ worker runs on Railway** — not on Vercel (serverless timeout). Local dev: `pnpm worker:dev` with Docker Redis.
4. **Per-notebook Qdrant collections** — naming: `notebook_{notebookId}`
5. **Prisma client** — import from `@/lib/db` (singleton), never `new PrismaClient()`
6. **shadcn/ui** — components in `components/ui/` are generated; customize via `components.json` aliases
7. **Providers abstraction** — all LLM/embedding/reranker calls go through `lib/providers/` registry, never direct SDK calls
8. **Citation format** — structured per source type (PDF: page+bbox, YouTube: timestamp, etc.)

## Phase Status (Track Progress)
- [ ] Phase 1: Foundation (Next.js, Clerk, Prisma, Qdrant, ImageKit, providers.yaml, Docker Compose, BullMQ skeleton)
- [ ] Phase 2: Ingestion Pipeline (6 loaders, BullMQ jobs, status tracking, retry/DLQ)
- [ ] Phase 3: Advanced RAG (7-step chain, streaming, Cohere rerank, token tracking)
- [ ] Phase 4: Source Viewers & Citations (PDF/YouTube/Website/PPTX/Text viewers, citation chips, modal)
- [ ] Phase 5: Chat UI & Polish (notebook chat, source sidebar, theme, mobile, a11y)
- [ ] Phase 6: Production Deploy (Vercel + Railway + Neon + Qdrant Cloud + monitoring)

## When You Need Me (The Human)
- **Phase 1**: Provide Clerk keys, Neon URL, Qdrant Cloud URL/key, ImageKit keys, Railway Redis URL
- **Phase 3**: Provide Cohere API key (reranker)
- **Phase 6**: Vercel project linking, production env vars, Railway worker deployment

## Do Not Assume
- OCR is in scope (deferred post-MVP)
- Admin panel exists (deferred)
- Notebook sharing/collab exists (deferred)
- Any provider besides OpenAI works (abstraction ready, not tested)

## Quick Reference
- **Add shadcn component**: `pnpm dlx shadcn@latest add <component>`
- **Prisma migration**: `pnpm db:push` (dev) or `pnpm prisma migrate dev`
- **Typecheck**: `pnpm build` (includes tsc) or add explicit `typecheck` script
- **Queue dashboard**: BullMQ Board on Railway (if installed) or `pnpm worker:dev` logs