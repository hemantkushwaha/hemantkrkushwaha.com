# Step 13: File-Aware Content Ingestion Pipeline

Hemant Kumar Kushwaha Knowledge Platform (`hemantkrkushwaha.com`)

## Overview

The File-Aware Content Ingestion Pipeline extends the platform's ingestion architecture to support both:
1. **Metadata-Only Ingestion**: Ingesting a structured `ContentManifest` without binary files.
2. **Metadata + File Ingestion**: Ingesting a `ContentManifest` accompanied by exactly one supported binary file.

All operations execute strictly server-side through `POST /api/ingest/content`, requiring authorization via `Authorization: Bearer <CONTENT_INGESTION_API_KEY>`.

---

## Architecture & Flow

```
Client / Automation Source
           │
           │ POST /api/ingest/content (Bearer CONTENT_INGESTION_API_KEY)
           ▼
[ authMiddleware ] ──(Validates Bearer Token; 401 if missing/invalid)
           │
           ▼
[ multipartMiddleware ] ──(Parses multipart stream in-memory if multipart; extracts file & fields)
           │
           ▼
[ ingestController ] ──(Enforces 1-file limit; parses manifest & file; validates schema; 400 on error)
           │
           ▼
[ contentIngestionService ]
     ├── 1. Validate Content Manifest (required fields, section, content_type)
     ├── 2. Validate File Data & Metadata (existence, non-empty, extension, MIME, size, path safety)
     ├── 3. Generate Deterministic Slug
     ├── 4. Check for Duplicate Slug in DB (409 Conflict if found; zero storage upload)
     ├── 5. Dry-Run Mode (calculates deterministic storage path and preview without DB writes)
     ├── 6. Upload File to Supabase Storage ('content-files' private bucket)
     │       └── If upload fails: abort; no DB record created.
     ├── 7. Insert Record into PostgreSQL 'content' table (with file_url = storage path)
     │       └── If DB insert fails: ROLLBACK by deleting uploaded storage object.
     ├── 8. Process Tags & Relationships
     └── 9. Return Structured Ingestion Result
```

---

## 1. Supported Ingestion Formats

### Format A: JSON Payload (Metadata-Only)

```http
POST /api/ingest/content
Authorization: Bearer <CONTENT_INGESTION_API_KEY>
Content-Type: application/json

{
  "section": "academics",
  "category": "computer-networks",
  "topic": "arp",
  "content_type": "study_material",
  "title": "Address Resolution Protocol Lecture Notes",
  "description": "Comprehensive explanation of ARP frame structure and operation.",
  "tags": ["Networking", "ARP", "Protocols"],
  "visibility": "public",
  "published": true
}
```

### Format B: JSON Payload (Metadata + File via Base64)

```http
POST /api/ingest/content
Authorization: Bearer <CONTENT_INGESTION_API_KEY>
Content-Type: application/json

{
  "section": "academics",
  "category": "computer-networks",
  "topic": "arp",
  "content_type": "study_material",
  "title": "Address Resolution Protocol Packet Analysis",
  "tags": ["Networking", "ARP"],
  "visibility": "public",
  "published": true,
  "file": {
    "fileName": "arp-analysis.pdf",
    "fileType": "application/pdf",
    "fileSize": 10240,
    "data": "JVBERi0xLjQKJ..."
  }
}
```

### Format C: Multipart Form-Data (Metadata + File via Binary Stream)

```http
POST /api/ingest/content
Authorization: Bearer <CONTENT_INGESTION_API_KEY>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXYZ

------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="manifest"

{
  "section": "research",
  "category": "artificial-intelligence",
  "topic": "reinforcement-learning",
  "content_type": "research_paper",
  "title": "Adaptive Exploration in Sparse Environments",
  "tags": ["AI", "RL"]
}
------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="file"; filename="adaptive-exploration.pdf"
Content-Type: application/pdf

<binary PDF bytes>
------WebKitFormBoundaryXYZ--
```

---

## 2. Ingestion Rules & Constraints

### One-File Limitation
In Step 13, each ingestion request may contain either 0 or 1 file. Multi-file uploads are strictly rejected with:
`400 Bad Request: Multiple files are not supported in Step 13. Only one file may be uploaded per ingestion request.`

### Supported File Extensions & Canonical MIME Types

| Extension | Canonical MIME Types |
|---|---|
| `.pdf` | `application/pdf` |
| `.ppt` | `application/vnd.ms-powerpoint` |
| `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-powerpoint` |
| `.doc` | `application/msword` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.webp` | `image/webp` |
| `.mp4` | `video/mp4` |
| `.webm` | `video/webm` |

Any other file extension (e.g., `.exe`, `.zip`, `.sh`, `.bin`) is immediately rejected with HTTP 400.

### Server-Side File Validation
Before Storage upload, the pipeline verifies:
1. **File Existence & Content**: File data must exist, be a valid buffer/Uint8Array/Blob/base64 string, and have length > 0.
2. **File Name**: Non-empty, safe filename with a valid base name and supported extension. Path traversal (`..`), path separators (`/`, `\`), and null bytes (`\0`) are strictly rejected.
3. **MIME Type Validation**: Declared MIME type must match the detected file extension.
4. **File Size**: Size cannot exceed `MAX_FILE_SIZE_BYTES` (default: 52,428,800 bytes / 50MB, read from environment configuration).
5. **Storage Path Safety**: Storage paths must be relative, deterministic, without directory traversal (`..`), without leading slashes, and cannot reference the bucket name directly.

---

## 3. Storage & Consistency Boundaries

### Cross-System Consistency
PostgreSQL and Supabase Storage are distinct systems that do not form a single atomic ACID transaction. The pipeline guarantees consistency through deliberate sequencing and rollback handlers:
1. **Pre-Check Slug Uniqueness**: The database is queried for an existing publication with the calculated slug *before* attempting file upload. If a duplicate exists, the request returns `409 Conflict` immediately, ensuring zero orphaned storage writes.
2. **Storage Upload Precedence**: The file is uploaded to the private bucket (`content-files`) before the database record is inserted. If storage upload fails, ingestion terminates immediately with no database record created.
3. **Database Insertion Rollback**: If PostgreSQL insertion fails (e.g., connection drop, RLS error, or concurrent race condition resulting in duplicate key error `23505`), the pipeline catches the error and executes an immediate rollback deletion of the uploaded storage object via `deleteFile()`.
4. **Clean Status Reporting**: The response indicates whether the uploaded file was safely cleaned up, preventing orphaned files in storage.

### Private Bucket Architecture
- The Supabase Storage bucket `content-files` is **PRIVATE**.
- Binary files are never stored in PostgreSQL columns; the database record stores only the safe relative storage path in `file_url`.
- Public URLs are never directly generated or exposed for private bucket assets.
- Time-bounded signed URLs (TTL: 900s / 15m) are generated on demand via `POST /api/storage/signed-url` after verifying content status and authorization.

---

## 4. API Ingestion Responses

### Metadata-Only Ingestion (HTTP 201)
```json
{
  "success": true,
  "contentId": "b1f13b5e-1490-482a-bc91-314227183002",
  "slug": "address-resolution-protocol-lecture-notes",
  "title": "Address Resolution Protocol Lecture Notes"
}
```

### Metadata + File Ingestion (HTTP 201)
```json
{
  "success": true,
  "contentId": "c2a24c6f-2501-493b-cd02-425338294113",
  "slug": "address-resolution-protocol-packet-analysis",
  "title": "Address Resolution Protocol Packet Analysis",
  "fileUploaded": true,
  "fileName": "arp-analysis.pdf",
  "fileType": "application/pdf",
  "fileSize": 10240,
  "storagePath": "academics/computer-networks/arp/study-material/arp-analysis.pdf",
  "filePath": "academics/computer-networks/arp/study-material/arp-analysis.pdf"
}
```

### Security Guarantee
Responses **NEVER** expose:
- `SUPABASE_SECRET_KEY`
- `CONTENT_INGESTION_API_KEY`
- Database credentials or connection strings
- Unrestricted public storage URLs
