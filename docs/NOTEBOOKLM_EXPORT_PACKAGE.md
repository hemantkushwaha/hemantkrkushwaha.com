# NotebookLM Export Package & Automation Workflow

**Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)**  
**Architecture Specification: Step 17 — NotebookLM Export Package & Automation Workflow**

---

## 1. Purpose

The **NotebookLM Export Package** (`NotebookLMExportPackage`) is a standardized intermediate interchange format for packaging educational, research, philosophical, and literary materials derived from NotebookLM workspaces before converting them into the platform's canonical **Content Manifest v1.0**.

### Explicit Architectural Scope & Declaration
> **CRITICAL ARCHITECTURAL BOUNDARY:**  
> **Step 17 does not establish a direct NotebookLM API integration.**  
> The system strictly prohibits:
> - NotebookLM login automation
> - Scraping or web automation (Puppeteer, Playwright, Selenium)
> - Undocumented or private Google/NotebookLM APIs
> - Google OAuth or credential harvesting
> - Direct NotebookLM network connections

Instead, educational material is prepared via an approved copy/export workflow into an intermediate structured package that feeds into the platform's existing adapter and ingestion pipeline.

---

## 2. End-to-End Automation Pipeline Topology

```
+-------------------------------------------------------------+
|                      NotebookLM                             |
|         (Educational / Research Workspace)                 |
+-------------------------------------------------------------+
                              │
                              ▼ (Approved export/copy workflow)
+-------------------------------------------------------------+
|                NotebookLM Export Package                    |
|                      (Version 1.0)                          |
+-------------------------------------------------------------+
                              │
                              ▼ (validateNotebookLMExportPackage)
+-------------------------------------------------------------+
|               NotebookLM Export Package Service             |
|   (Pure transformation: zero DB writes, zero file uploads)  |
+-------------------------------------------------------------+
                              │
                              ▼ (convertNotebookLMExportPackageToManifest)
+-------------------------------------------------------------+
|                     NotebookLM Adapter                      |
|                      (DefaultAdapter)                       |
+-------------------------------------------------------------+
                              │
                              ▼ (Canonical Manifest v1.0)
+-------------------------------------------------------------+
|                  Automation Gateway API                     |
|                POST /api/automation/ingest                  |
+-------------------------------------------------------------+
                              │
                              ▼ (Internal delegation)
+-------------------------------------------------------------+
|                  Existing Ingestion API                     |
|                  POST /api/ingest/content                   |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
|                 Supabase Database & Storage                 |
|               (Private bucket: "content-files")             |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
|                hemantkrkushwaha.com Website                 |
+-------------------------------------------------------------+
```

---

## 3. Package Structure

The package is a strictly typed JSON object adhering to `package_version: "1.0"`:

```json
{
  "package_version": "1.0",
  "source": {
    "system": "notebooklm",
    "source_id": "test-notebook-id-12345",
    "source_url": "https://notebooklm.google.com/notebook/...",
    "source_name": "Sample Test Notebook",
    "generated_at": "2026-09-19T00:00:00.000Z"
  },
  "metadata": {
    "section": "academics",
    "category": "computer-networks",
    "topic": "arp",
    "content_type": "study_material",
    "title": "Address Resolution Protocol (ARP) Notes",
    "description": "Educational summary and packet layout for ARP.",
    "tags": ["networking", "protocols", "arp"]
  },
  "content": {
    "body": "# Address Resolution Protocol\n\nDetailed markdown..."
  },
  "file": {
    "file_name": "arp_notes.pdf",
    "file_type": "application/pdf",
    "file_size": 1048576
  }
}
```

---

## 4. Required Metadata & User Taxonomy Authority

The platform enforces **User Taxonomy Supremacy**:
The caller explicitly defines where the material belongs in the knowledge platform taxonomy.

The following fields are strictly **user-controlled**:
- `metadata.section` (`academics`, `research`, `philosophy`, `writings`)
- `metadata.category` (e.g. `computer-networks`, `machine-learning`)
- `metadata.topic` (e.g. `arp`, `transformers`)
- `metadata.content_type` (`article`, `study_material`, `presentation`, `interactive`, `book`, `book_chapter`, `research_paper`, `research_project`, `patent`, `dataset`, `lecture`, `video`, `poem`, `novel`, `short_story`, `essay`, `reflection`, `resource`)
- `metadata.title`

### Strict Prohibitions
The package parser and adapter MUST NOT:
- Infer or guess section, category, or topic from the body content
- Reclassify or override user-supplied content types
- Use AI or heuristic classifiers to alter taxonomy
- Rewrite or alter titles

If any required taxonomy field is missing or empty, the package is immediately **rejected** with `MISSING_REQUIRED_FIELD`.

---

## 5. Content Integrity Rules

The package transformation preserves the body text with 100% fidelity:
- **Markdown syntax**: Headers (`#`, `##`), blockquotes (`>`), formatting (`**bold**`, `*italic*`)
- **Code blocks**: Syntax tags and indentation (` ```ts ... ``` `)
- **Tables**: ASCII/Markdown pipes and alignment (`| col | col |`)
- **Mathematical notation**: LaTeX inline (`$E=mc^2$`) and display blocks (`$$\sum...$$`)
- **Links**: Standard markdown anchors (`[text](url)`)
- **Lists**: Ordered and unordered bullet hierarchies
- **Line breaks**: Paragraph spacing and literal newlines

The system does **NOT** summarize, compress, clean, or rewrite educational content.

---

## 6. Source Metadata

Source metadata tracks provenance without affecting content classification:
- `system`: Must be strictly `"notebooklm"`.
- `source_id` (optional): NotebookLM notebook or artifact identifier.
- `source_url` (optional): Deep link to original notebook workspace.
- `source_name` (optional): Title of the NotebookLM workspace.
- `generated_at` (optional): ISO 8601 timestamp.

Validation delegates to `validateSourceMetadata()` in `src/services/manifestService.ts`.

---

## 7. Package Validation

Export package validation is encapsulated in `src/services/notebookLMExportPackageService.ts`:
- `validateNotebookLMExportPackage(pkg: unknown)`: Validates structural schema, version, taxonomy, source metadata, body content, and file limits.
- `parseNotebookLMExportPackage(raw: unknown)`: Safely parses JSON strings or objects into a typed `NotebookLMExportPackage`.
- `convertNotebookLMExportPackageToManifest(pkg)`: Converts validated package to `Content Manifest v1.0`.

### Invariant Rules:
- Service performs **zero database queries**.
- Service performs **zero file uploads** or disk operations.
- Service performs **zero network calls**.

---

## 8. Manifest Conversion

Conversion executes as a pipeline without duplicating transformation logic:
```
Export Package → Validation → NotebookLM Adapter → Content Manifest v1.0
```
1. Package is parsed and validated.
2. Metadata and content are mapped to `NotebookLMSourceInput`.
3. Existing `notebookLMAdapter.tryAdapt(sourceInput)` transforms the input and validates against canonical `AutomationManifest` rules.
4. Output is a valid `AdaptedManifestResult` ready for downstream submission to `POST /api/automation/ingest`.

---

## 9. File Handling

Packages may include optional binary files (e.g., lecture slides, generated PDF guides, diagrams):
- **Size Limit**: Maximum 50MB (`52,428,800` bytes). Exceeding this returns `PAYLOAD_TOO_LARGE`.
- **Supported Formats**: `pdf`, `ppt`, `pptx`, `doc`, `docx`, `png`, `jpg`, `jpeg`, `webp`, `mp4`, `webm`.
- **MIME Type Enforcement**: `file_type` must be compatible with the file extension.
- **In-Memory Retention**: File bytes are held purely in memory (`Buffer` or `Uint8Array`) as part of `fileResource` and are **never written to disk** or automatically uploaded during package conversion.

---

## 10. Security Boundary

- **No Secrets in Package**: The export package contains no API keys, bearer tokens, or database passwords.
- **No Supabase Leakage**: Package service does not import `@supabase/supabase-js`.
- **No Storage Leakage**: Package service does not import `storageService`.
- **Path Traversal Protection**: File names are checked for `..`, slashes, and null bytes.

---

## 11. Current Limitations

- Package construction is currently performed externally via exported markdown, manual curation, or external tooling.
- Automated browser extraction from NotebookLM is intentionally excluded by security and stability design.
- Rate limits and API keys remain governed by the downstream Automation Gateway and Ingestion APIs.

---

## 12. Future Automation Workflow

The envisioned end-to-end automated export pipeline:
1. **Curate in NotebookLM**: User generates study guides, summaries, or lectures in NotebookLM.
2. **Export / Copy**: Material is saved and packaged into `NotebookLMExportPackage` format using a local helper or CLI.
3. **Validate**: Client or pipeline runs `validateNotebookLMExportPackage()`.
4. **Convert**: Adapter generates canonical `Content Manifest v1.0`.
5. **Gateway Ingestion**: Package is submitted to `POST /api/automation/ingest` with `Authorization: Bearer <CONTENT_INGESTION_API_KEY>` and optional `Idempotency-Key`.
6. **Publication**: Platform persists content to Supabase PostgreSQL and private Storage, surfacing it live on `hemantkrkushwaha.com`.
