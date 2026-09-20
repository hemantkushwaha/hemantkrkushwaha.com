# External Automation Gateway Foundation

**Platform:** Hemant Kumar Kushwaha Knowledge Platform ([hemantkrkushwaha.com](https://hemantkrkushwaha.com))  
**Architecture Milestone:** Step 16 — External Automation Gateway Foundation  
**Specification Version:** 1.0  
**Status:** Implemented & Verified  

---

> ### **CRITICAL ARCHITECTURAL STATEMENT**
> **Step 16 does not connect to NotebookLM or any external provider.**  
> It establishes the secure, provider-neutral internal gateway contract through which external automations can submit canonical **Content Manifest v1.0** payloads to the existing content ingestion system.

---

## 1. Purpose

The **External Automation Gateway** provides a unified, provider-neutral ingress layer for the platform. As external tools (NotebookLM, Google Slides, Google Drive, and Google AI Studio) export educational, scientific, philosophical, and literary content, the Automation Gateway ensures that:

1. All incoming payloads adhere to the strict, validated **Content Manifest v1.0** schema.
2. Ingestion delegates entirely to the **existing single content ingestion pipeline** (`ingestContent(...)`), avoiding duplicated database or storage pathways.
3. User-controlled taxonomy (`section`, `category`, `topic`, `content_type`, and `title`) is preserved with **100% fidelity**, prohibiting AI guessing, automated re-classification, or heuristic mutation.
4. Requests are protected by server-side authentication (`CONTENT_INGESTION_API_KEY`) and request-level idempotency (`Idempotency-Key`).
5. Execution telemetry and logging are non-sensitive, guaranteeing zero leakage of credentials, tokens, or private payload bodies.

---

## 2. Architecture & Pipeline Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│               UPSTREAM SOURCE SYSTEMS (Step 14/15/16 Scope)            │
│  NotebookLM  │  Google Slides  │  Google AI Studio  │  Google Drive   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL AUTOMATION RUNTIME                          │
│   (Normalized Source Object / In-Memory Adapted Manifest v1.0)         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼  POST /api/automation/ingest (or service call)
┌─────────────────────────────────────────────────────────────────────────┐
│              AUTOMATION GATEWAY FOUNDATION (Step 16)                    │
│   - Bearer Authentication Verification (CONTENT_INGESTION_API_KEY)     │
│   - Idempotency Cache Lookup (Idempotency-Key TTL 5m)                   │
│   - Payload Limit Verification (File <= 50MB)                          │
│   - Canonical Manifest Validation (validateAutomationManifest v1.0)     │
│   - Source System Taxonomy Validation (SUPPORTED_SOURCE_SYSTEMS)        │
│   - Non-Sensitive Audit Logging (createSafeAuditContext)                │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼  ingestContent(manifest, options)
┌─────────────────────────────────────────────────────────────────────────┐
│              EXISTING CONTENT INGESTION PIPELINE (Steps 9–13)           │
│   - Deterministic Slug Generation                                      │
│   - PostgreSQL Duplicate Slug Prevention (HTTP 409)                    │
│   - Private Storage Upload & Rollback (content-files)                  │
│   - Tag Creation & Junction Linking (content_tags)                     │
│   - Companion Relationship Linking (content_relationships)              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  PERSISTENCE & PUBLIC PLATFORM                          │
│        PostgreSQL Database (Supabase) + Private Storage Bucket          │
│                                  │                                      │
│                                  ▼                                      │
│                   hemantkrkushwaha.com Website                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Request Contract

The gateway accepts requests adhering to the `AutomationGatewayRequest` contract.

### Request Body (JSON)

```json
{
  "manifest": {
    "manifest_version": "1.0",
    "section": "research",
    "category": "Artificial Intelligence",
    "topic": "Deterministic Systems",
    "content_type": "research_paper",
    "title": "Deterministic Knowledge Ingestion in Autonomous Environments",
    "subcategory": "Formal Verification",
    "description": "A formal study of provider-neutral ingestion architectures.",
    "body": "Full body content formatted in standard Markdown...",
    "tags": ["AI", "Verification", "Systems Architecture"],
    "language": "en",
    "visibility": "public",
    "is_featured": true,
    "published": true
  },
  "source": {
    "system": "notebooklm",
    "source_id": "nb-doc-492",
    "source_url": "https://notebooklm.google.com/notebook/example",
    "generated_at": "2026-09-19T10:00:00.000Z"
  }
}
```

### Request Options

| Field | Type | Required | Description |
|---|---|---|---|
| `manifest` | `AutomationManifest` | **Yes** | Canonical Content Manifest adhering to Version 1.0. |
| `source` | `AutomationSourceMetadata` | No | Source system provenance. Validated against `SUPPORTED_SOURCE_SYSTEMS`. |
| `file` / `fileResource` | `object` | No | Accompanying file data (`fileName`, `fileType`, `fileSize`, `data`). |
| `idempotencyKey` | `string` | No | Request idempotency key (1–128 alphanumeric characters). |
| `dryRun` | `boolean` | No | If `true`, returns preview without mutating database or storage. |

---

## 4. Authentication Boundary

1. **Server-to-Server Only**: The gateway is callable exclusively via server-side credentials.
2. **Reused Credential**: Reuses `CONTENT_INGESTION_API_KEY` via `Authorization: Bearer <token>`.
3. **No Dual Credentials**: Does not introduce redundant API keys or secondary secrets.
4. **Client-Side Shielding**: The API key is strictly forbidden from appearing in:
   - `VITE_*` public variables
   - Client bundle JavaScript or HTML entry points
   - Error messages or stack traces
   - Git commits or public repositories

---

## 5. Idempotency Behavior

1. **Header**: Passed via `Idempotency-Key` header (or `idempotencyKey` in programmatic service calls).
2. **Scope**: Managed via an in-memory TTL cache (5-minute expiration, 1,000 entry eviction ceiling) at the server-instance level.
3. **Behavior**:
   - **First Call**: Processes request, caches status code and response envelope, and returns HTTP 201 (or 409).
   - **Replay**: Returns identical cached response with header `X-Cache-Lookup: HIT`.
4. **Database Level**: In addition to request-level caching, underlying PostgreSQL unique constraints on `slug` prevent duplicate database records.

---

## 6. Supported Source Systems

To prevent arbitrary third-party inputs without governance, source systems must belong to the platform's supported taxonomy (`SUPPORTED_SOURCE_SYSTEMS`):

| Source System | Canonical String | Description |
|---|---|---|
| **NotebookLM** | `notebooklm` | Material adapted from NotebookLM note exports and study guides. |
| **Google Slides** | `google-slides` | Presentations and academic slide decks. |
| **Google AI Studio** | `google-ai-studio` | Structured content generated or transformed via AI Studio. |
| **Google Drive** | `google-drive` | Documents and research files ingested from cloud storage. |
| **Manual** | `manual` | Curated author uploads and command-line publication scripts. |

*Any unrecognized source system is rejected with `INVALID_SOURCE_METADATA`.*

---

## 7. User Taxonomy Authority

The platform operates on the principle of **Authoritative User Taxonomy**:
- The gateway **NEVER** uses AI, heuristic parsers, or keyword matchers to alter:
  - `section`
  - `category`
  - `topic`
  - `content_type`
  - `title`
- Content markdown in `body` is preserved character-for-character without automated summarization or rewriting.
- Tags are cleaned deterministically (whitespace trimmed, duplicates removed case-insensitively while preserving original casing).

---

## 8. Security & Non-Sensitive Audit Logging

### Safe Audit Context
The gateway generates an audit context (`AutomationGatewayAuditContext`) for every request:

```json
{
  "source_system": "notebooklm",
  "source_id": "nb-doc-492",
  "idempotency_key_present": true,
  "has_file": false,
  "section": "research",
  "category": "Artificial Intelligence",
  "topic": "Deterministic Systems",
  "content_type": "research_paper",
  "timestamp": "2026-09-19T10:00:00.000Z"
}
```

### Prohibited Data
The following data are **strictly prohibited** from telemetry and logs:
- `CONTENT_INGESTION_API_KEY`
- `SUPABASE_SECRET_KEY`
- `Authorization` header
- Passwords, cookies, or OAuth tokens
- Raw binary file buffers or base64 streams

---

## 9. Standard Response & Error Envelopes

### Success (HTTP 201)

```json
{
  "success": true,
  "data": {
    "content_id": "d1e7c5b2-3f8a-4d2b-9e1a-8c5e2d1f4b3a",
    "slug": "deterministic-knowledge-ingestion-in-autonomous-environments",
    "title": "Deterministic Knowledge Ingestion in Autonomous Environments",
    "file": {
      "name": "study-guide.pdf",
      "type": "application/pdf",
      "size": 1048576,
      "path": "content-files/research/artificial-intelligence/deterministic-systems/study-guide.pdf"
    }
  },
  "slug": "deterministic-knowledge-ingestion-in-autonomous-environments"
}
```

### Error (HTTP 400 / 409 / 413 / 500)

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_DUPLICATE_SLUG",
    "message": "Conflict: A publication with this slug already exists."
  },
  "error_details": {
    "code": "CONFLICT_DUPLICATE_SLUG",
    "message": "Conflict: A publication with this slug already exists."
  },
  "error_code": "CONFLICT_DUPLICATE_SLUG",
  "errors": ["Publication with slug \"deterministic-knowledge-ingestion-in-autonomous-environments\" already exists."],
  "slug": "deterministic-knowledge-ingestion-in-autonomous-environments"
}
```

---

## 10. Current Implementation vs. Future Integrations

| Capability | Status in Step 16 | Future Milestone |
|---|---|---|
| **Gateway Service Interface** | **Active (`automationGatewayService.ts`)** | Extensible across future adapters |
| **HTTP Gateway Route** | **Active (`POST /api/automation/ingest`)** | Available for webhook automation |
| **Manifest v1.0 Validation** | **Active (`validateAutomationManifest`)** | Preserved across all future sources |
| **NotebookLM Live Connection** | **None (Prohibited)** | Step 17+ (OAuth / Webhook ingestion) |
| **Google Drive / Slides API** | **None (Prohibited)** | Future provider integration |
| **Persistent Audit Database** | **None (Prohibited)** | Optional future analytics service |
| **Database Schema Modifications** | **None (Zero migrations)** | Production PostgreSQL schema locked |

---

## 11. Step 19 — Controlled NotebookLM Export Ingestion Runner

The **NotebookLM Ingestion Runner** (`scripts/notebookLM-ingest.ts`) is a local/server-side CLI automation tool that validates, converts, and submits local `NotebookLM Export Package v1.0` files to the production Automation Gateway (`POST /api/automation/ingest`).

### Architectural Topology

```
NotebookLM
    ↓ (Manual export / copy)
NotebookLM Export Package v1.0 (Local JSON)
    ↓
Ingestion Runner (scripts/notebookLM-ingest.ts)
    ↓ (Validates package + reuses NotebookLMAdapter)
Content Manifest v1.0
    ↓ (Authenticated HTTP POST with Idempotency-Key)
POST /api/automation/ingest (Gateway)
    ↓
Existing Content Ingestion Pipeline (ingestContent)
    ↓
Supabase PostgreSQL + Private Storage
```

### Invariants

1. **Zero Browser Automation**: No Puppeteer, Playwright, scraping, session hijacking, or cookies.
2. **Zero Direct Database/Storage Access**: Runner only communicates with the gateway HTTP API; it never imports Supabase or touches storage buckets directly.
3. **Zero Secret Leakage**: `CONTENT_INGESTION_API_KEY` is loaded from server-side/local environment only and is never printed, logged, or included in error traces.
4. **Deterministic Idempotency**: Every package produces a deterministic `Idempotency-Key` (SHA-256 over canonical package content and taxonomy), ensuring that repeated runs never duplicate content.
5. **Production Confirmation**: Transmissions require an explicit `--confirm` flag. Without `--confirm`, the runner exits cleanly without initiating network traffic.
6. **No Automatic Retries**: If the gateway returns an error or failure, the runner stops immediately.

### Environment Configuration

| Variable | Scope | Purpose | Example |
|---|---|---|---|
| `CONTENT_INGESTION_BASE_URL` | Local / Server-side CLI | Base target URL of the platform gateway | `https://hemantkrkushwaha.com` |
| `CONTENT_INGESTION_API_KEY` | Local / Server-side CLI | Secret Bearer authentication token | `[REDACTED_SECRET]` |

*Never prefix these variables with `VITE_` or include them in client bundles.*

### CLI Usage

```bash
# 1. Safe Dry-Run Inspection (Zero Network Calls, Zero Content Created)
npm run ingest:notebooklm -- ./examples/notebooklm-export-package.json --dry-run

# 2. Confirmed Production Submission
CONTENT_INGESTION_BASE_URL="https://hemantkrkushwaha.com" \
CONTENT_INGESTION_API_KEY="<secret>" \
npm run ingest:notebooklm -- ./examples/notebooklm-export-package.json --confirm
```

### Deterministic Idempotency Key Algorithm

The runner computes a SHA-256 digest over the normalized package attributes:
- `source.system`, `source.source_id`
- `metadata.section`, `metadata.category`, `metadata.topic`, `metadata.content_type`, `metadata.title`
- `content.body`
- `file.file_name`, `file.file_size`

Formatted as:
```text
nlm_<32-character-hex-hash>
```
Identical packages generate the exact same key. Divergent packages generate distinct keys.
