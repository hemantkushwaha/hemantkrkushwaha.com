# Google Drive Source Adapter Foundation

**Platform:** Hemant Kumar Kushwaha Knowledge Platform ([hemantkrkushwaha.com](https://hemantkrkushwaha.com))  
**Architecture Milestone:** Step 21 — Google Drive Source Adapter Foundation  
**Specification Version:** 1.0  
**Status:** Implemented & Verified  

---

> ### **CRITICAL ARCHITECTURAL BOUNDARY**
> **Step 21 does NOT connect to Google Drive.**  
> It establishes a pure, provider-neutral in-memory transformation adapter foundation that normalizes future Google Drive metadata and binary content into the canonical **Content Manifest v1.0** contract.
> - Zero Google API connections (`googleapis`, `@google-cloud/*`)
> - Zero OAuth credentials or tokens (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, access/refresh tokens)
> - Zero network calls (`fetch`, `http`, `https`, `axios`)
> - Zero browser automation (no Puppeteer, Playwright, Selenium, cookies, or session extraction)
> - Zero database mutations, schema edits, or RLS changes
> - Zero storage modifications or unrequested uploads

---

## 1. Purpose of the Google Drive Adapter Foundation

The **Google Drive Source Adapter Foundation** is the provider-specific adapter layer designed to bridge Google Drive files and export resources into the platform's established automated content ingestion pipeline.

As established in Step 20 (Feasibility Research), consumer-facing NotebookLM workflows cannot be automated via direct private web automation without violating security invariants. The official architectural trajectory relies on standard Google workspace exports (Google Drive files, exported documents, presentations, and binary artifacts). 

The Google Drive Adapter:
1. Translates metadata and content from future official Google Drive API responses into the canonical **Content Manifest v1.0**.
2. Preserves caller-specified taxonomy with 100% fidelity, prohibiting any automatic inference.
3. Distinguishes between **Google-native documents** (Google Docs, Google Sheets, Google Slides) and **downloadable binary files** (PDF, DOCX, PPTX, images, videos).
4. Enforces the platform's strict **50 MB file boundary** and supported file type constraints.
5. Emits normalized source metadata (`source.system = "google-drive"`, `source_id`, `source_url`, `generated_at`) suitable for downstream request-level idempotency and audit tracking.

---

## 2. Architecture & Pipeline Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│              UPSTREAM SOURCE / FUTURE GOOGLE DRIVE API                  │
│       Google Drive API v3 (drive.files.get / drive.files.export)        │
│       Metadata: file_id, name, mimeType, webViewLink, modifiedTime      │
│       Payload: Extracted body text OR exported/downloaded binary buffer │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼  GoogleDriveSourceInput
┌─────────────────────────────────────────────────────────────────────────┐
│               GOOGLE DRIVE SOURCE ADAPTER (Step 21)                     │
│                 (src/services/adapters/googleDriveAdapter.ts)            │
│   - Enforces user-controlled taxonomy (Section, Category, Topic, ...)  │
│   - Prohibits AI / heuristic taxonomy guessing                          │
│   - Normalizes Google Drive v3 metadata into source provenance          │
│   - Classifies Google-native vs binary files                            │
│   - Normalizes tags and validates timestamps                            │
│   - Validates payload limit (<= 50 MB)                                  │
│   - Validates via canonical validateAutomationManifest()                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼  AdaptedManifestResult (Content Manifest v1.0)
┌─────────────────────────────────────────────────────────────────────────┐
│                 AUTOMATION GATEWAY (Step 16 Contract)                   │
│   - Bearer Authentication (CONTENT_INGESTION_API_KEY)                   │
│   - Request-level idempotency cache (Idempotency-Key / source_id)       │
│   - Sanitized audit logging                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼  ingestContent(manifest, options)
┌─────────────────────────────────────────────────────────────────────────┐
│              CONTENT INGESTION PIPELINE (Steps 9–13 Core)               │
│   - Deterministic slug generation & PostgreSQL conflict detection       │
│   - Supabase Storage private upload (content-files)                     │
│   - PostgreSQL relational transactions (content, tags, relationships)   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Expected Future Google Drive API Input Structure

The adapter operates on `GoogleDriveSourceInput`, which separates caller-mandated taxonomy from Google Drive v3 resource attributes:

```typescript
export interface GoogleDriveSourceInput {
  // =========================================================================
  // 1. Mandatory User-Controlled Taxonomy (Authoritative — Never Inferred)
  // =========================================================================
  section: ManifestSection | string;        // e.g., 'academics', 'research', 'thoughts'
  category: string;                         // e.g., 'Computer Science'
  topic: string;                            // e.g., 'Computer Networks'
  content_type: ManifestContentType | string;// e.g., 'study_material', 'analysis'
  title: string;                            // e.g., 'OSPF Protocol Specification'

  // Optional presentation & publishing controls
  subcategory?: string;
  description?: string;
  tags?: string[];
  language?: string;                        // Default 'en'
  visibility?: ContentVisibility;           // 'public' | 'registered' | 'premium'
  is_featured?: boolean;
  published?: boolean;
  external_url?: string;

  // Body content (verbatim preservation of extracted/caller text)
  body?: string;
  content?: string;                         // Accepted synonym for body

  // =========================================================================
  // 2. Future Official Google Drive API v3 Fields
  // =========================================================================
  file_id?: string;                         // Google Drive resource ID (drive.files.get 'id')
  id?: string;                              // Standard Drive API v3 resource 'id'
  name?: string;                            // Drive file resource 'name'
  mime_type?: string;                       // Drive MIME type
  mimeType?: string;                        // Drive API v3 resource 'mimeType'
  web_view_link?: string;                   // Drive API v3 'webViewLink'
  webViewLink?: string;                     // Drive API v3 'webViewLink'
  download_url?: string;                    // Pre-authenticated download or export URL
  webContentLink?: string;                  // Drive API v3 'webContentLink'
  size?: number | string;                   // Drive API v3 'size' (bytes)
  modified_time?: string;                   // Drive API v3 'modifiedTime' (RFC 3339 / ISO-8601)
  modifiedTime?: string;                    // Drive API v3 'modifiedTime'
  created_time?: string;                    // Drive API v3 'createdTime'
  createdTime?: string;                     // Drive API v3 'createdTime'
  parent_folder_id?: string;                // Drive parent folder ID
  parents?: string[];                       // Drive API v3 'parents' array

  // Source provenance tracking
  source_id?: string;
  source_url?: string;
  source_name?: string;
  generated_at?: string;

  // Binary file payload (if exported/downloaded into memory)
  file_name?: string;
  file_type?: string;
  file_size?: number;
  file_data?: Buffer | Uint8Array;
  data?: Buffer | Uint8Array;
}
```

---

## 4. Transformation Rules to Content Manifest v1.0

The adapter follows deterministic rules to produce a canonical `AutomationManifest`:

| Manifest Field | Source / Transformation Rule | Invariant Enforced |
| :--- | :--- | :--- |
| `manifest_version` | Constant `"1.0"` | Required by schema |
| `section` | Verbatim `payload.section` | Validated against `MANIFEST_SECTIONS` |
| `category` | Verbatim `payload.category.trim()` | Cannot be empty or inferred |
| `topic` | Verbatim `payload.topic.trim()` | Cannot be empty or inferred |
| `content_type` | Verbatim `payload.content_type` | Validated against `MANIFEST_CONTENT_TYPES` |
| `title` | Verbatim `payload.title.trim()` | Cannot be empty or inferred |
| `body` | Verbatim `payload.body ?? payload.content` | Never rewritten or summarized |
| `description` | Verbatim `payload.description` | Truncated whitespace; null if empty |
| `tags` | Array of strings | Trimmed, case-insensitively deduplicated |
| `source.system` | Constant `"google-drive"` | Validated against `SUPPORTED_SOURCE_SYSTEMS` |
| `source.source_id` | `file_id ?? id ?? source_id` | Unique Google Drive file identifier |
| `source.source_url` | `web_view_link ?? webViewLink ?? source_url` | Canonical web view URL |
| `source.source_name`| `name ?? source_name` | Original Google Drive file name/title |
| `source.generated_at`| `generated_at ?? modified_time ?? modifiedTime` | Strict ISO-8601 timestamp |
| `file_name` | `file_name ?? (isBinary(name) ? name : undefined)` | Only set for supported binary types |
| `file_type` | `file_type ?? (!isNative ? mimeType : undefined)` | Validated against `SUPPORTED_MIME_TYPES` |
| `file_size` | `file_size ?? size` | Validated <= 50 MB |

---

## 5. Non-Inference Taxonomy Rule

> ### **MANDATORY ARCHITECTURAL PRINCIPLE**
> The adapter **MUST NOT** automatically classify, infer, guess, or re-categorize content using:
> - Google Drive folder names or folder hierarchy (e.g. parent folder `academics/computer-networks`)
> - File names (e.g. `OSPF-lecture-notes.pdf`)
> - MIME types (e.g. `application/pdf` or `application/vnd.google-apps.document`)
> - Document text contents or headings
> - AI models, heuristics, or external categorizers

If any required taxonomy field (`section`, `category`, `topic`, `content_type`, `title`) is omitted or invalid, the adapter **fails immediately** with `GoogleDriveAdapterError` and error code `MISSING_REQUIRED_FIELD` or `INVALID_SECTION` / `INVALID_CONTENT_TYPE`.

---

## 6. Handling of Binary Files vs. Google-Native Documents

Google Drive items fall into two distinct structural categories:

### A. Google-Native Documents
* **MIME Types:**
  - Google Docs: `application/vnd.google-apps.document`
  - Google Sheets: `application/vnd.google-apps.spreadsheet`
  - Google Slides: `application/vnd.google-apps.presentation`
  - Google Forms: `application/vnd.google-apps.form`
  - Google Drawings: `application/vnd.google-apps.drawing`
* **Characteristics in Google Drive:**
  - Do not possess a static file extension on Drive storage.
  - Google Drive returns `size = undefined` or `0`.
  - **Cannot be downloaded directly as raw binary blobs** using `drive.files.get({ alt: 'media' })`.
* **Adapter Behavior:**
  - Preserves Google Drive metadata (`file_id`, `name`, `webViewLink`, `modifiedTime`) in `source`.
  - Accepts text extracts (Markdown, plain text) in `body` without attempting to register an invalid `.gdoc` binary file in Supabase storage.
  - Does NOT set `manifest.file_name` or `manifest.file_type` unless an official export has already been performed.

### B. Standard Binary Files
* **MIME Types & Extensions:**
  - Documents: PDF (`application/pdf`), DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), DOC (`application/msword`), PPTX (`application/vnd.openxmlformats-officedocument.presentationml.presentation`), PPT (`application/vnd.ms-powerpoint`)
  - Images: PNG (`image/png`), JPEG/JPG (`image/jpeg`), WEBP (`image/webp`)
  - Videos: MP4 (`video/mp4`), WEBM (`video/webm`)
* **Characteristics in Google Drive:**
  - Can be downloaded directly as binary streams via `drive.files.get({ alt: 'media' })`.
* **Adapter Behavior:**
  - Validates extension and MIME type against the platform's supported list.
  - Enforces the **50 MB size ceiling**.
  - Populates `manifest.file_name`, `manifest.file_type`, `manifest.file_size`, and the in-memory `fileResource` payload for ingestion.

---

## 7. Google Docs / Sheets / Slides Export Requirements

In a future live integration, retrieving content from Google-native files requires calling the official Google Drive export endpoint rather than direct media download:

```
GET https://www.googleapis.com/drive/v3/files/{fileId}/export?mimeType={targetMimeType}
```

The adapter defines the canonical export mappings in `GOOGLE_NATIVE_EXPORT_TARGETS`:

| Google-Native Type | Supported Official Export MIME Types | Destination in Knowledge Platform |
| :--- | :--- | :--- |
| **Google Docs** (`application/vnd.google-apps.document`) | `application/pdf`<br>`application/vnd.openxmlformats-officedocument.wordprocessingml.document`<br>`text/plain`<br>`text/markdown` | Ingested as binary PDF/DOCX resource, or extracted text ingested into `manifest.body`. |
| **Google Sheets** (`application/vnd.google-apps.spreadsheet`) | `application/pdf`<br>`text/csv`<br>`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Ingested as companion PDF or tabular benchmark data. |
| **Google Slides** (`application/vnd.google-apps.presentation`) | `application/pdf`<br>`application/vnd.openxmlformats-officedocument.presentationml.presentation`<br>`text/plain` | Ingested as presentation slides (PDF/PPTX) in academics or research. |

*(Note: Step 21 documents this requirement and provides helper utilities; it does not call Google Drive export endpoints).*

---

## 8. Security Boundaries & Invariants

1. **Zero Google API Client Imports:** The codebase does not import `googleapis` or any Google Cloud SDKs.
2. **Zero Credential / Token Exposure:** The adapter never handles `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or tokens.
3. **Zero Browser Automation:** Puppeteer, Playwright, Selenium, and session cookies are strictly prohibited.
4. **Offline Transformation:** The adapter operates 100% in memory with zero HTTP network I/O.
5. **No Secret Leakage:** Serialized outputs, error objects, and logs contain no secrets, database URLs, or service role keys.
6. **Strict Size Guard:** Payloads exceeding 50 MB are rejected before reaching downstream storage.

---

## 9. What Step 21 Implements

1. **`GoogleDriveSourceInput` Interface:** Strongly typed representation of caller taxonomy and expected future Google Drive v3 file metadata (`src/types/automation.ts`).
2. **`DefaultGoogleDriveAdapter`:** Production-grade implementation of `GoogleDriveAdapter` (`src/services/adapters/googleDriveAdapter.ts`).
3. **MIME Mapping & Classification Engine:**
   - `GOOGLE_DRIVE_NATIVE_MIME_TYPES`
   - `GOOGLE_DRIVE_BINARY_MIME_TYPES`
   - `GOOGLE_NATIVE_EXPORT_TARGETS`
   - `isGoogleNativeDocument(...)`
   - `classifyGoogleDriveItem(...)`
4. **Non-Throwing `tryAdapt()` Method:** Provides safe error handling for integration pipelines.
5. **Comprehensive Test Suite:** 28 test suites with 103 assertions verifying all requirements and static security rules (`tests/googleDriveAdapter.test.ts`).
6. **Architectural Documentation:** Full specification and future integration guide (`docs/GOOGLE_DRIVE_ADAPTER.md`).

---

## 10. What Step 21 Intentionally Does NOT Implement

To preserve architectural safety, the following remain strictly out of scope for Step 21:
- Connecting to the Google Drive REST API.
- Google Cloud Console project creation, OAuth consent screens, or client ID configuration.
- Generating OAuth access or refresh tokens.
- Live file downloads or calling Google Drive export endpoints.
- Browser automation, scraping, or web automation.
- Live production ingestion or database row creation.

---

## 11. Preconditions for Future Live Google Drive Integration

Before live Google Drive synchronization or retrieval can be initiated in future milestones, the following prerequisites must be fulfilled:

1. **Google Cloud Project & Scopes:**
   - A dedicated Google Cloud Project with the Google Drive API enabled.
   - Minimal required OAuth scope (e.g. `https://www.googleapis.com/auth/drive.readonly`).
2. **Secure Token Storage:**
   - Secure server-side credential storage (e.g. encrypted secrets in environment configuration; never exposed to browser clients).
3. **Export Pipeline Module:**
   - A server-side retrieval service that calls `drive.files.get` for binary assets and `drive.files.export` for Google Docs/Sheets/Slides.
4. **Explicit User Taxonomy Mapping:**
   - A user interface or configuration file mapping specific Google Drive folders or files to platform taxonomy (`section`, `category`, `topic`, `content_type`).

---

## 12. Compatibility with the Existing Automation Gateway

The `GoogleDriveAdapter` is 100% compatible with the Step 16 Automation Gateway:

1. **Source System Alignment:** The generated manifest sets `source.system = "google-drive"`, which is already registered in `SUPPORTED_SOURCE_SYSTEMS`.
2. **Standard Output Envelope:** Produces `AdaptedManifestResult`, containing the canonical `AutomationManifest` (v1.0) and optional `fileResource`.
3. **Idempotency Readiness:** Exposes `source.source_id` (Google Drive `file_id`), enabling request deduplication via the Gateway's idempotency engine (`Idempotency-Key`).
4. **Single Ingestion Pathway:** The adapted manifest flows seamlessly into `processAutomationGatewayRequest(...)` and `ingestContent(...)` without any custom storage or database logic.
