# NotebookLM Ingestion Workflow & Adapter Architecture

**Platform**: Hemant Kumar Kushwaha Knowledge Platform ([hemantkrkushwaha.com](https://hemantkrkushwaha.com))  
**Document Status**: Formal Architectural Specification (Step 15)  
**Contract Version**: Manifest v1.0  
**Target Ingestion Boundary**: `POST /api/ingest/content`  

---

## 1. Executive Summary & Architectural Separation

This document specifies the integration architecture between **NotebookLM** and the **Hemant Kumar Kushwaha Knowledge Platform**.

```
NotebookLM User Workspace
        ↓ (Approved Export / Manual Copy)
External Normalization Engine
        ↓ (Normalized NotebookLMSourceInput)
NotebookLM Source Adapter (`src/services/adapters/notebookLMAdapter.ts`)
        ↓ (Content Manifest v1.0)
Existing Ingestion Endpoint (`POST /api/ingest/content`)
        ↓ (File-Aware Pipeline & Transaction Rollback)
Supabase PostgreSQL & Private Storage Bucket (`content-files`)
        ↓ (SSR / Client Views)
Website UI
```

---

## 2. Implementation Status: CURRENT vs. FUTURE

To ensure strict engineering discipline and transparency, the boundary between what is currently implemented and what represents future external automation is explicitly delineated:

### ✅ CURRENTLY IMPLEMENTED (Step 15)
- **Source Adapter Contract**: `NotebookLMAdapter` implementation conforming to `SourceAdapter<NotebookLMSourceInput>`.
- **In-Memory Transformation**: Transforms valid `NotebookLMSourceInput` into canonical `AutomationManifest` (Version 1.0).
- **User Taxonomy Supremacy**: Strict preservation of user-specified `section`, `category`, `topic`, `content_type`, and `title`. Zero AI inference or reclassification.
- **Content Integrity**: Educational text and markdown bodies are preserved character-for-character with zero rewriting or summarization.
- **Safe Normalization**: Whitespace trimming, tag deduplication/filtering, and strict ISO-8601 date parsing.
- **Deterministic Validation**: Leverages centralized `validateAutomationManifest` with standardized error codes (`MISSING_REQUIRED_FIELD`, `INVALID_SECTION`, `INVALID_CATEGORY`, `INVALID_TOPIC`, `INVALID_CONTENT_TYPE`, `INVALID_TITLE`, `INVALID_SOURCE_METADATA`).
- **File Metadata Support**: File metadata and in-memory resources are preserved without direct storage mutations.
- **Single Ingestion Boundary**: All persistence remains behind `POST /api/ingest/content`.

### 🔮 FUTURE AUTOMATION (Not Yet Implemented / Out of Scope)
- **Direct NotebookLM Account Connection**: No automated Google login, OAuth token generation for private notebooks, or live NotebookLM API integration.
- **Automated Webhooks / Polling**: No background daemons scraping notebooks or polling NotebookLM exports.
- **Browser Automation**: No Puppeteer/Playwright scripts extracting cookies or automating web UI interactions.
- **Google Drive / Google Slides Connectors**: Addressed in subsequent platform steps.

> **CRITICAL ARCHITECTURAL MANDATE**:  
> The platform does **not** scrape NotebookLM, does **not** use browser automation, does **not** store Google credentials, and does **not** connect to private Google accounts. Ingestion occurs solely via user-exported payloads passed into the adapter and submitted to `POST /api/ingest/content`.

---

## 3. End-to-End Workflow Specification

The intended end-to-end publishing pipeline functions in eight deterministic steps:

### Step 1: User Material Creation in NotebookLM
The author creates syntheses, study guides, research notes, or lecture materials within NotebookLM notebooks.

### Step 2: User Export Through Approved Workflow
The author copies or exports the material (as markdown, plain text, PDF, or document) using official user-facing export mechanisms.

### Step 3: External Automation Normalization
An external script or tooling prepares a `NotebookLMSourceInput` payload, capturing:
- `title`
- `description`
- `body` / `content`
- `source_url` (notebook link)
- `source_reference` or `source_id`
- `generated_at` (timestamp)
- optional file attachment metadata (`file_name`, `file_type`, `file_size`)

### Step 4: Attachment of User-Controlled Taxonomy
The author explicitly declares the knowledge placement:
```json
{
  "section": "academics",
  "category": "Computer Science",
  "topic": "Computer Networks",
  "content_type": "study_material",
  "title": "Address Resolution Protocol (ARP) Deep Dive"
}
```
*Rule: The platform never guesses or overrides these five fields.*

### Step 5: Adapter Ingestion & Manifest Generation
The `NotebookLMAdapter` (`src/services/adapters/notebookLMAdapter.ts`) executes:
```ts
const { manifest, fileResource } = notebookLMAdapter.adapt(input);
```
Validates against Version 1.0 rules and stamps `source.system = "notebooklm"`.

### Step 6: HTTP Ingestion
The generated manifest (and optional file) is dispatched via an authenticated HTTP request:
```http
POST /api/ingest/content
Authorization: Bearer ${CONTENT_INGESTION_API_KEY}
Content-Type: application/json (or multipart/form-data)

{
  "manifest": { ... }
}
```

### Step 7: Existing Ingestion Pipeline Processing
The server-side ingestion controller:
1. Verifies the ingestion API key and idempotency key.
2. Checks for slug conflicts (`409 Conflict`).
3. Uploads files (if present) to the private `content-files` Supabase storage bucket under a deterministic hierarchy.
4. Inserts the unified record into the `content` table in PostgreSQL.
5. Executes automatic rollback (deleting uploaded files) if the database insert fails.

### Step 8: Website Publication
The content becomes immediately accessible across the academic portal, research archive, or writings catalog according to its visibility tier (`public`, `registered`, `premium`).

---

## 4. Normalized Input Contract (`NotebookLMSourceInput`)

```typescript
export interface NotebookLMSourceInput {
  // Required User-Controlled Taxonomy
  section: 'academics' | 'research' | 'philosophy' | 'writings' | 'about';
  category: string;
  topic: string;
  content_type:
    | 'article'
    | 'study_material'
    | 'presentation'
    | 'interactive'
    | 'book'
    | 'book_chapter'
    | 'research_paper'
    | 'research_project'
    | 'patent'
    | 'dataset'
    | 'lecture'
    | 'video'
    | 'poem'
    | 'novel'
    | 'short_story'
    | 'essay'
    | 'reflection'
    | 'resource';
  title: string;

  // Optional Presentation & Taxonomy
  subcategory?: string;
  description?: string;

  // Educational Content from NotebookLM
  body?: string;
  content?: string; // Synonym for body

  // Tags
  tags?: string[];

  // Source Provenance
  source_id?: string;
  source_reference?: string; // Synonym for source_id
  source_name?: string;
  source_url?: string;
  generated_at?: string;

  // Publishing Controls
  language?: string;
  visibility?: 'public' | 'registered' | 'premium';
  is_featured?: boolean;
  published?: boolean;
  external_url?: string;

  // File Metadata
  file_name?: string;
  file_type?: string;
  file_size?: number;
  file_data?: Buffer | Uint8Array;
}
```

---

## 5. Manifest v1.0 Output Contract

The adapter deterministically produces an `AutomationManifest` structured as follows:

```json
{
  "manifest_version": "1.0",
  "section": "academics",
  "category": "Computer Science",
  "subcategory": "Networking",
  "topic": "Computer Networks",
  "content_type": "study_material",
  "title": "Address Resolution Protocol (ARP) Deep Dive",
  "description": "Comprehensive protocol reference synthesized from academic sources.",
  "body": "## Address Resolution Protocol\n\nARP is a communication protocol used for discovering the link layer address...",
  "tags": ["Networking", "Protocols", "ARP"],
  "language": "en",
  "visibility": "public",
  "is_featured": false,
  "published": true,
  "source": {
    "system": "notebooklm",
    "source_id": "notebook-doc-8812",
    "source_url": "https://notebooklm.google.com/notebook/example",
    "source_name": "Computer Networks Notebook",
    "generated_at": "2026-09-18T22:00:00.000Z"
  }
}
```

---

## 6. Security Invariants & Credentials Boundary

1. **Zero Adapter Credentials**: `notebookLMAdapter.ts` contains no API keys, tokens, or client secrets.
2. **Zero Direct Network Access**: The adapter executes synchronously in memory. It makes no `fetch`, `http`, or `axios` calls.
3. **Storage Isolation**: The adapter has no reference to Supabase clients or storage buckets.
4. **Secret Isolation**: `CONTENT_INGESTION_API_KEY` and `SUPABASE_SECRET_KEY` exist only inside server routes/services and are never exposed to adapters or client builds.
