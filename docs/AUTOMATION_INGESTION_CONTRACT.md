# Automation Ingestion Contract & External Interface Specification

**Platform:** Hemant Kumar Kushwaha Knowledge Platform (`hemantkrkushwaha.com`)  
**Specification Version:** `1.0`  
**Target Ingestion Endpoint:** `POST /api/ingest/content`  
**Status:** Production Standard  

---

## Table of Contents
1. [Overview of Ingestion Architecture](#1-overview-of-ingestion-architecture)
2. [Single-Endpoint Rule](#2-single-endpoint-rule)
3. [Authentication and Authorization](#3-authentication-and-authorization)
4. [Automation Manifest Schema (v1.0)](#4-automation-manifest-schema-v10)
5. [Required Fields Specification](#5-required-fields-specification)
6. [Optional Fields Specification](#6-optional-fields-specification)
7. [Source Metadata Boundary](#7-source-metadata-boundary)
8. [Authority Rule: User Manifest vs AI Classification](#8-authority-rule-user-manifest-vs-ai-classification)
9. [Supported Content Types and Taxonomy](#9-supported-content-types-and-taxonomy)
10. [Supported File Types and Size Limits](#10-supported-file-types-and-size-limits)
11. [Transport Methods (JSON and Multipart)](#11-transport-methods-json-and-multipart)
12. [Private Supabase Storage Architecture](#12-private-supabase-storage-architecture)
13. [Storage Access Rule & Signed URLs](#13-storage-access-rule--signed-urls)
14. [Idempotency Behavior & Retry Guidance](#14-idempotency-behavior--retry-guidance)
15. [Future Adapter Architecture](#15-future-adapter-architecture)
16. [Standard Success Response Examples](#16-standard-success-response-examples)
17. [Standard Error Response Examples](#17-standard-error-response-examples)

---

## 1. Overview of Ingestion Architecture

The Hemant Kumar Kushwaha Knowledge Platform provides a centralized, deterministic, and secure ingestion pipeline. External automation systems (such as NotebookLM, Google Slides, Google Drive, or Google AI Studio workflows) ingest knowledge assets directly through the platform's unified server API.

```
External Source (NotebookLM / Slides / AI Studio / Drive)
                         │
                         ▼
        Source Adapter (maps raw source → Manifest v1.0)
                         │
                         ▼
             POST /api/ingest/content
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
  API Key Auth Check          Manifest & File Validation
  (CONTENT_INGESTION_API_KEY) (Schema, MIME, Path safety)
         │                               │
         └───────────────┬───────────────┘
                         ▼
       Private Supabase Storage (`content-files`)
       (Zero public URLs, relative paths only)
                         │
                         ▼
      PostgreSQL Content Record (`public.content`)
      (Deterministic slugs, taxonomy, relationships)
                         │
                         ▼
              Website Knowledge Graph
```

All operations are executed server-side with strict administrative isolation. Database schemas and storage buckets are strictly protected against unauthorized public mutations.

---

## 2. Single-Endpoint Rule

To prevent fragmentation, API duplication, and security drift:

- **Target Endpoint:** `POST https://hemantkrkushwaha.com/api/ingest/content`
- **Method:** `POST` exclusively. All other HTTP methods (`GET`, `PUT`, `DELETE`, `PATCH`) return `HTTP 405 Method Not Allowed`.
- **Architectural Mandate:** There is **only ONE** ingestion endpoint. No secondary ingestion routes or parallel ingest controllers exist or may be created.

---

## 3. Authentication and Authorization

All requests to the ingestion endpoint require an API key passed via the standard HTTP `Authorization` header.

### Header Format
```http
Authorization: Bearer <CONTENT_INGESTION_API_KEY>
```

### Authentication Rules
1. **Missing Header:** If the `Authorization` header is omitted, the API responds with `HTTP 401 Unauthorized`.
2. **Invalid Key:** If the provided token does not match the server-side `CONTENT_INGESTION_API_KEY`, the API responds with `HTTP 401 Unauthorized`.
3. **Secret Isolation:** API keys and database service role secrets are never reflected in response bodies, error messages, or client bundles.

---

## 4. Automation Manifest Schema (v1.0)

External ingestion requests must supply a valid `AutomationManifest` adhering to Version `1.0`.

```json
{
  "manifest_version": "1.0",
  "section": "research",
  "category": "Artificial Intelligence",
  "subcategory": "Deep Learning",
  "topic": "Neural Reasoning",
  "content_type": "research_paper",
  "title": "Autonomous Verification in Multimodal Reasoning",
  "description": "Exploration of deterministic validation frameworks.",
  "body": "Full body text or markdown synopsis...",
  "tags": ["AI", "Reasoning", "Verification"],
  "language": "en",
  "visibility": "public",
  "is_featured": false,
  "external_url": "https://arxiv.org/abs/example",
  "file_name": "reasoning_verification.pdf",
  "file_type": "application/pdf",
  "file_size": 2048576,
  "source": {
    "system": "notebooklm",
    "source_id": "nb-study-9812",
    "source_url": "https://notebooklm.google.com/notebook/example",
    "generated_at": "2026-09-18T10:00:00.000Z"
  }
}
```

---

## 5. Required Fields Specification

Every `AutomationManifest` MUST include the following 6 fields:

| Field | Type | Allowed Values / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `manifest_version` | `string` | `"1.0"` | Identifies the automation contract version. Must be `"1.0"`. |
| `section` | `string` | `"academics"`, `"research"`, `"philosophy"`, `"writings"`, `"about"` | The root knowledge pillar. |
| `category` | `string` | Non-empty string (trimmed length ≥ 1) | Primary subject domain. |
| `topic` | `string` | Non-empty string (trimmed length ≥ 1) | Specific subject or curriculum node. |
| `content_type` | `string` | `"study_material"`, `"presentation"`, `"interactive"`, `"book"`, `"book_chapter"`, `"research_paper"`, `"research_project"`, `"patent"`, `"dataset"`, `"lecture"`, `"video"`, `"poem"`, `"novel"`, `"short_story"`, `"essay"`, `"reflection"`, `"resource"` | Canonical content archetype. |
| `title` | `string` | Non-empty string (trimmed length ≥ 1) | Canonical title of the resource. |

---

## 6. Optional Fields Specification

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `subcategory` | `string` | `null` | Optional granular division within category. |
| `description` | `string` | `null` | Abstract or executive summary. |
| `body` | `string` | `null` | Markdown, LaTeX, or plain-text body content. |
| `tags` | `string[]` | `[]` | Categorical index tags (whitespace trimmed, duplicates removed). |
| `language` | `string` | `"en"` | Content language code (e.g., `"en"`, `"hi"`, `"sa"`). |
| `visibility` | `string` | `"public"` | `"public"`, `"registered"`, or `"premium"`. |
| `is_featured` | `boolean` | `false` | Highlighted placement flag. |
| `external_url` | `string` | `null` | Canonical external reference URL. |
| `source_url` | `string` | `null` | Origin reference URL. |
| `file_name` | `string` | `null` | Original filename when a file accompanies the manifest. |
| `file_type` | `string` | `null` | Standard MIME type of the file. |
| `file_size` | `number` | `null` | Size of the file in bytes (must be > 0 and ≤ 52,428,800). |
| `related_content` | `array` | `[]` | Array of relationship objects (`{ slug, relationship_type }`). |
| `published` | `boolean` | `true` | When `false`, resource is ingested as `draft`. |
| `source` | `object` | `null` | Source metadata object (see Section 7). |

---

## 7. Source Metadata Boundary

The `source` metadata boundary identifies the originating automation tool:

```json
{
  "source": {
    "system": "notebooklm",
    "source_id": "doc-abc-123",
    "source_url": "https://example.com/source",
    "generated_at": "2026-09-18T12:00:00Z"
  }
}
```

### Fields:
- `system` (`string`, required if `source` is provided): System identifier (e.g. `"notebooklm"`, `"google-slides"`, `"google-ai-studio"`, `"google-drive"`, `"manual"`).
- `source_id` (`string`, optional): External unique document ID.
- `source_url` (`string`, optional): External link to source artifact.
- `generated_at` (`string`, optional): ISO-8601 timestamp of source export.

---

## 8. Authority Rule: User Manifest vs AI Classification

### CRITICAL PLATFORM RULE
**The user-controlled manifest is the single source of truth.**
- The platform **NEVER** overrides, guesses, or reclassifies `section`, `category`, `topic`, or `content_type` using AI.
- Source metadata (e.g. `system: "google-slides"`) must **NEVER** automatically force or override `content_type` to `"presentation"`.
- If a user specifies `content_type: "lecture"` from a Google Slides source, the system records `content_type: "lecture"` exactly as commanded.

---

## 9. Supported Content Types and Taxonomy

### Pillar Sections:
- `academics`
- `research`
- `philosophy`
- `writings`
- `about`

### Content Types:
- `study_material`
- `presentation`
- `interactive`
- `book`
- `book_chapter`
- `research_paper`
- `research_project`
- `patent`
- `dataset`
- `lecture`
- `video`
- `poem`
- `novel`
- `short_story`
- `essay`
- `reflection`
- `resource`

---

## 10. Supported File Types and Size Limits

When an ingestion request includes a binary file, it must strictly comply with the following limits:

| File Type Category | Allowed Extensions | Canonical MIME Types |
| :--- | :--- | :--- |
| **Documents / Presentations** | `.pdf`, `.ppt`, `.pptx`, `.doc`, `.docx` | `application/pdf`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.webp` | `image/png`, `image/jpeg`, `image/webp` |
| **Media / Video** | `.mp4`, `.webm` | `video/mp4`, `video/webm` |

### Enforcement Rules:
1. **Maximum File Size:** 50 MB (`52,428,800` bytes). Requests exceeding this limit return `HTTP 400 Bad Request` (`PAYLOAD_TOO_LARGE`).
2. **Single-File Limit:** Each ingestion request accepts at most one file resource. Requests attempting multiple files return `HTTP 400 Bad Request`.
3. **Executable Rejection:** Executables (`.exe`, `.sh`, `.bat`, etc.) are strictly rejected.
4. **MIME Consistency:** The file extension must match the provided MIME type.

---

## 11. Transport Methods (JSON and Multipart)

The platform supports two standard transport methods:

### Method A: `multipart/form-data` (Recommended for binary files)
Enables streaming file upload alongside manifest metadata without base64 overhead.
```http
POST /api/ingest/content HTTP/1.1
Host: hemantkrkushwaha.com
Authorization: Bearer <API_KEY>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryX

------WebKitFormBoundaryX
Content-Disposition: form-data; name="manifest"
Content-Type: application/json

{
  "manifest_version": "1.0",
  "section": "academics",
  "category": "Computer Science",
  "topic": "Distributed Systems",
  "content_type": "presentation",
  "title": "Consensus in Asynchronous Systems"
}
------WebKitFormBoundaryX
Content-Disposition: form-data; name="file"; filename="consensus.pptx"
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation

<binary pptx content>
------WebKitFormBoundaryX--
```

### Method B: `application/json` (Metadata-only or Base64 File)
Used for metadata-only publications or inline base64 encoded files:
```json
{
  "manifest_version": "1.0",
  "section": "writings",
  "category": "Essays",
  "topic": "Philosophy of Technology",
  "content_type": "essay",
  "title": "The Limits of Mechanized Intuition",
  "body": "Full text of the essay...",
  "file": {
    "fileName": "essay_manuscript.pdf",
    "fileType": "application/pdf",
    "fileSize": 45020,
    "data": "<base64 encoded content>"
  }
}
```

---

## 12. Private Supabase Storage Architecture

- **Storage Bucket:** Strictly `content-files`.
- **Public Access:** Disabled (`public: false`). The storage bucket cannot be read by anonymous users.
- **Storage Path Resolution:** Structured deterministically:
  `{section}/{topic_slug}/{title_slug}_{timestamp}_{uniqueHash}.{extension}`
- **Database Storage:** The database `file_url` column stores ONLY the relative storage path (e.g. `research/neural-reasoning/verification_1726700000000_a1b2c3d4.pdf`). It **never** stores absolute URLs, domain names, or presigned URLs.

---

## 13. Storage Access Rule & Signed URLs

- Direct public downloads from Supabase Storage are forbidden.
- To access protected files, clients request time-limited signed URLs via the platform's secure access layer.
- Expiration is bounded between 60 seconds and 24 hours (default: 900 seconds).

---

## 14. Idempotency Behavior & Retry Guidance

External automation engines frequently retry network calls during intermittent connectivity.

### Idempotency-Key Header
Clients may pass an `Idempotency-Key` header:
```http
Idempotency-Key: <unique-uuid-or-hash>
```

### Behavioral Guarantees:
1. **Duplicate Request Prevention:** If a request with the same `Idempotency-Key` is received within the cache window (5 minutes), the server immediately returns the cached response with `X-Cache-Lookup: HIT`.
2. **Deterministic Database Slugs:** If a duplicate submission is sent without an idempotency key (or after the cache expires), the platform's PostgreSQL unique slug constraint guarantees that existing content is never silently overwritten. Instead, the endpoint returns `HTTP 409 Conflict`.
3. **Safe Retries:** Callers encountering `HTTP 5xx` errors or network timeouts may safely retry with the same `Idempotency-Key`.

---

## 15. Future Adapter Architecture

The platform defines a clean adapter interface for upcoming automated sources:

```
External System (NotebookLM / Slides / AI Studio / Drive)
                         │
                         ▼
        Source Adapter [SourceAdapter<TInput>]
  Maps vendor-specific export format → AutomationManifest (v1.0)
                         │
                         ▼
    Unified Production Endpoint: POST /api/ingest/content
```

### TypeScript Adapter Interface Definition:
```typescript
export interface SourceAdapter<TInput = unknown> {
  readonly system: AutomationSourceSystem;
  adapt(input: RawSourceInput<TInput>): Promise<AdaptedManifestResult> | AdaptedManifestResult;
}
```

Future adapters will simply transform native source outputs into standard v1.0 manifests without altering any backend ingestion logic.

---

## 16. Standard Success Response Examples

### Example 1: Ingestion with File (HTTP 201 Created)
```json
{
  "success": true,
  "data": {
    "content_id": "c1f7b8a2-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
    "slug": "neural-reasoning-autonomous-verification",
    "title": "Autonomous Verification in Multimodal Reasoning",
    "file": {
      "name": "reasoning_verification.pdf",
      "type": "application/pdf",
      "size": 2048576,
      "path": "research/neural-reasoning/autonomous-verification_1726700000000_a1b2c3d4.pdf"
    }
  }
}
```

### Example 2: Metadata-Only Ingestion (HTTP 201 Created)
```json
{
  "success": true,
  "data": {
    "content_id": "d2e8c9b3-4f5a-6b7c-8d9e-0a1b2c3d4e5f",
    "slug": "philosophy-of-technology-limits-of-mechanized-intuition",
    "title": "The Limits of Mechanized Intuition"
  }
}
```

---

## 17. Standard Error Response Examples

All error responses use standardized JSON structures with explicit error codes.

### Example 1: Missing Required Manifest Version (HTTP 400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "MISSING_MANIFEST_VERSION",
    "message": "Missing required field: \"manifest_version\". Expected \"1.0\"."
  }
}
```

### Example 2: Unsupported Manifest Version (HTTP 400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_MANIFEST_VERSION",
    "message": "Bad Request: Unsupported manifest_version \"2.0\". Only version \"1.0\" is supported."
  }
}
```

### Example 3: Missing Authentication Header (HTTP 401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized: Missing Authorization header. Provide a valid Bearer token."
  }
}
```

### Example 4: Duplicate Slug Conflict (HTTP 409 Conflict)
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_DUPLICATE_SLUG",
    "message": "Conflict: A publication with this slug already exists."
  },
  "slug": "neural-reasoning-autonomous-verification"
}
```

### Example 5: Payload Exceeds Maximum Size Limit (HTTP 400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Bad Request: File size exceeds the maximum allowed limit of 50MB."
  }
}
```
