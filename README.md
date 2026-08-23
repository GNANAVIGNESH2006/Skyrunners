<<<<<<< HEAD
# KnowBase AI — AI Powered Knowledge Assistant

> **"Ask your documents. Get grounded answers."**

A complete, hackathon-ready Retrieval-Augmented Generation (RAG) system that answers questions *exclusively* from uploaded documents with source citations — and honestly says "I don't know" when information isn't available.

---

## Problem Statement

Generic AI assistants hallucinate facts confidently. For domain-specific knowledge bases (college handbooks, legal documents, company wikis), this is unacceptable. KnowBase AI solves this by grounding every answer in the actual content of uploaded documents.

---

## Features

| Feature | Description |
|---|---|
| 📄 Document Upload | PDF, DOCX, TXT, Markdown with drag-and-drop |
| 🔪 Smart Chunking | Paragraph-first chunking with configurable overlap |
| 🧠 Semantic Embeddings | OpenAI `text-embedding-3-small` (fallback: keyword vectors) |
| 🔍 Vector Search | In-memory cosine similarity over SQLite-stored embeddings |
| 🤖 Grounded Answers | GPT-4o-mini with strict anti-hallucination system prompt |
| 📎 Source Citations | Every answer linked to exact document, page, and passage |
| 🚫 No Hallucination | Refuses to answer if no relevant chunks are found |
| 💬 Conversation History | Follow-up questions with context |
| 📊 Analytics | Real SQL-based query statistics with charts |
| 🔎 Semantic Search | Direct passage search across the knowledge base |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          KnowBase AI                                 │
├──────────────────┬──────────────────────────────────────────────────┤
│   Frontend       │   Backend (Express + TypeScript)                  │
│   React + Vite   │                                                   │
│   Tailwind CSS   │   ┌──────────────────────────────────────────┐   │
│   Recharts       │   │           RAG Pipeline                    │   │
│                  │   │                                            │   │
│  Pages:          │   │  Upload → Extract → Clean → Chunk         │   │
│  • Landing       │   │       ↓                                    │   │
│  • Dashboard     │   │  Embed (OpenAI / Keyword Fallback)        │   │
│  • KB Manager    │   │       ↓                                    │   │
│  • Documents     │   │  Store in SQLite (embedding as JSON)      │   │
│  • Chat (RAG)    │   │                                            │   │
│  • Search        │   │  Query → Embed → Cosine Similarity        │   │
│  • Analytics     │   │       ↓                                    │   │
│  • Settings      │   │  Top-K Chunks → LLM (Grounded Prompt)    │   │
│                  │   │       ↓                                    │   │
│                  │   │  Answer + Sources (or "Not Found")        │   │
│                  │   └──────────────────────────────────────────┘   │
│                  │                                                   │
│                  │   Database: SQLite (sql.js / WASM, no native build) │
│                  │   Embeddings: text-embedding-3-small              │
│                  │   LLM: GPT-4o-mini                                │
└──────────────────┴───────────────────────────────────────────────────┘
```

---

## RAG Workflow

```
1. DOCUMENT UPLOAD
   → pdf-parse / mammoth / fs.readFile
   → Text extraction + cleaning
   → Chunking (800–1200 tokens, 150 token overlap)
   → Embedding generation (OpenAI or keyword fallback)
   → Store chunks + embeddings in SQLite

2. QUERY PROCESSING
   → Embed user question
   → Cosine similarity search (all KB chunks)
   → Filter by threshold (default: 0.25)
   → Retrieve Top-K=5 chunks
   → Build grounded prompt: system + context + question
   → LLM response with strict anti-hallucination instructions
   → Return answer + source references + relevance score

3. NOT FOUND CASE
   → If similarity threshold not met for any chunk
   → Return: "I couldn't find this information in the provided documents."
   → Never call LLM (saves cost, prevents hallucination)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via `sql.js` (WebAssembly, no native build step) |
| Embeddings | OpenAI text-embedding-3-small |
| LLM | OpenAI GPT-4o-mini |
| PDF Parsing | pdf-parse |
| DOCX Parsing | mammoth |
| File Upload | multer |

---

## Database Schema

```sql
knowledge_bases (id, name, description, created_at, updated_at)
documents       (id, kb_id, file_name, file_type, file_size, file_path, status, page_count, chunk_count, ...)
document_chunks (id, doc_id, chunk_index, content, page_number, token_count, embedding, ...)
conversations   (id, kb_id, title, created_at, updated_at)
messages        (id, conv_id, role, content, answered, avg_score, created_at)
source_references (id, message_id, doc_id, chunk_id, similarity_score, created_at)
```

### A note on the database engine

The database layer uses [`sql.js`](https://sql.js.org) — SQLite compiled to WebAssembly — instead of `better-sqlite3`. `better-sqlite3` ships a native C++ addon that has to be compiled with `node-gyp` on install, which requires the Visual Studio C++ Build Tools on Windows and often has no prebuilt binary for newer Node.js versions. `sql.js` runs the exact same SQLite engine but as WASM, so `npm install` never touches a C++ compiler and the app behaves identically on Windows, macOS, and Linux.

Since `sql.js` is normally an in-memory database, `backend/src/db/database.ts` adds a thin persistence layer: it loads `backend/data/knowbase.db` on startup (creating it if missing) and writes the full database back to that file after every insert/update/delete (and once after each transaction commits), so data still survives a backend restart. The schema, table names, and every query in the codebase are unchanged.

---

## Setup Instructions

### Prerequisites
- Node.js 18+ (tested through Node.js 24)
- npm 9+
- **No C++ build tools / Visual Studio needed** — the database engine (`sql.js`) is pure WebAssembly.

### 1. Clone / navigate to project
```bash
cd knowbase-ai
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
```bash
# Backend .env is already created with fallback mode
# To enable full AI, edit backend/.env and add your OpenAI key:
# OPENAI_API_KEY=sk-...
```

### 4. Install frontend dependencies
```bash
cd ../frontend
npm install
```

### 5. Start backend
```bash
cd ../backend
npm run dev
```

### 6. Start frontend (new terminal)
```bash
cd ../frontend
npm run dev
```

### 7. Open browser
- **App**: http://localhost:5173
- **API**: http://localhost:3001/api/health

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | (empty) | OpenAI API key — leave blank for fallback mode |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | LLM model for answer generation |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `RAG_TOP_K` | `5` | Chunks retrieved per query |
| `RAG_SIMILARITY_THRESHOLD` | `0.25` | Minimum similarity to include a chunk |
| `CHUNK_SIZE` | `1000` | Target chunk size in tokens |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks in tokens |
| `MAX_FILE_SIZE_MB` | `50` | Max upload file size |
| `PORT` | `3001` | Backend server port |

---

## Hallucination Prevention

The system prevents hallucination at two levels:

**Level 1 — Retrieval Threshold**
If no chunks exceed the similarity threshold, the LLM is never called.
The API immediately returns: *"I couldn't find this information in the provided documents."*

**Level 2 — System Prompt**
When the LLM is called, the system prompt strictly instructs it to:
- Answer ONLY from provided context excerpts
- Never use general training knowledge
- Say "I couldn't find this information" if context is insufficient
- Use temperature=0.1 for factual consistency

---

## Demo Flow (Hackathon Presentation)

1. **Open Dashboard** → See stats overview
2. **Knowledge Bases** → Open "College Student Handbook (Demo)"
3. **Documents** → See pre-loaded demo documents (Ready status)
4. **AI Assistant** → Select the demo KB
5. Ask: *"What is the minimum attendance requirement?"*
   → See: Answer + Source document + Page + Passage + 🟢 High relevance
6. Ask follow-up: *"What happens if I don't meet it?"*
   → See: Context-aware answer about consequences
7. Ask: *"What is the refund policy for international students?"*
   → See: ❌ "I couldn't find this information in the provided documents."
8. **Analytics** → View question statistics
9. **Upload** → Upload your own PDF → Watch: Processing → Ready

---

## API Reference

```
GET  /api/health
GET  /api/knowledge-bases
POST /api/knowledge-bases          { name, description }
GET  /api/knowledge-bases/:id
PUT  /api/knowledge-bases/:id
DELETE /api/knowledge-bases/:id

GET  /api/documents?kb_id=
POST /api/documents/upload         multipart/form-data { file, kb_id }
GET  /api/documents/:id
DELETE /api/documents/:id
POST /api/documents/:id/reprocess

POST /api/chat                     { kb_id, question, conversation_id?, top_k? }
GET  /api/conversations?kb_id=
GET  /api/conversations/:id
DELETE /api/conversations/:id

POST /api/search                   { kb_id, query, top_k? }
GET  /api/analytics?kb_id=
GET  /api/dashboard
```

---

## Notes

- The demo knowledge base is automatically seeded on first run
- In fallback mode (no OpenAI key), keyword-based embeddings provide basic search
- All API keys must be stored in `.env` — never in frontend code
- SQLite database is stored at `backend/data/knowbase.db`
- Uploaded files are stored at `backend/uploads/`
=======
# Skyrunners
for hackathon
>>>>>>> 4992e8ea56cfd50f2a92b0fab880b4c0da53c616
