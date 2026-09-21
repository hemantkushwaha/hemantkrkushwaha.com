# Google Drive API v3 & OAuth 2.0 Integration Foundation

**Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)**  
**Architecture Specification: Step 22 — Google Drive API / OAuth Foundation**

---

## Executive Summary

Step 22 establishes the official, secure foundation for Google Drive API v3 and OAuth 2.0 integration within the platform's automated content ingestion architecture.

```
Google Drive (User Account)
       │
       ▼ (Official OAuth 2.0 Authorization Code Flow)
GoogleDriveOAuthService (Server-Side)
       │
       ▼ (Official Drive API v3 - Least-Privilege Read-Only)
GoogleDriveService (Server-Side Provider Client)
       │
       ▼ (Preserves User Taxonomy Supremacy)
GoogleDriveSourceInput
       │
       ▼ (Pure Transformation Layer - Step 21)
GoogleDriveAdapter
       │
       ▼ (Canonical Manifest v1.0)
Automation Gateway (Step 16)
       │
       ▼ (Secure Ingestion Pipeline - Step 10 & 13)
Supabase (PostgreSQL + Content-Files Storage)
       │
       ▼
hemantkrkushwaha.com
```

### Critical Architectural Boundary & Safety Invariants

> **MANDATORY INVARIANT**:  
> **Step 22 does not connect a Google account and does not perform live Google Drive API calls.**

1. **Official APIs Only**: Relies strictly on official Google Drive API v3 endpoints (`https://www.googleapis.com/drive/v3`) and Google OAuth 2.0 endpoints (`https://accounts.google.com/o/oauth2/v2/auth`, `https://oauth2.googleapis.com/token`).
2. **Zero Browser Automation**: Strictly bans Puppeteer, Playwright, Selenium, browser drivers, and synthetic UI interaction.
3. **Zero Scraping & Session Harvesting**: Prohibits cookie extraction, session cookie reuse, or unofficial internal Google endpoints.
4. **Least-Privilege Scopes**: Requests only `https://www.googleapis.com/auth/drive.readonly`. No write, modify, or delete scopes are ever requested.
5. **Taxonomy Non-Inference**: The system **NEVER** guesses, infers, or modifies `section`, `category`, `topic`, `content_type`, or `title` from folder names, file titles, MIME types, or document content. The caller/user is the sole taxonomical authority.
6. **Token Security**: OAuth credentials and tokens exist strictly server-side. Zero tokens are ever exposed to the client-side, browser bundles, Vite variables, logs, or public storage.

---

## 1. Google Cloud Project Setup

To connect Google Drive in future steps, the platform administrator must configure a Google Cloud project:

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Google Cloud Project or select an existing organization project:
   - Project Name: `hemantkrkushwaha-knowledge-platform`
3. Link billing to the project if required by Google Cloud policies.

---

## 2. Google Drive API Enablement

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**.
2. Search for **Google Drive API**.
3. Select **Google Drive API** by Google and click **Enable**.
4. Confirm that the API status is active for the project.

---

## 3. OAuth Consent Screen Configuration

1. In the Google Cloud Console, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **User Type**:
   - **External**: Suitable for personal Google accounts authorizing the ingestion runner.
   - Or **Internal**: If using Google Workspace organization accounts.
3. Provide Application Information:
   - **App name**: `Hemant Kumar Kushwaha Knowledge Platform Automation`
   - **User support email**: `hemantsrmit@gmail.com`
   - **Developer contact information**: `hemantsrmit@gmail.com`
   - **Authorized domains**: `hemantkrkushwaha.com`
4. Scopes Step: Add `https://www.googleapis.com/auth/drive.readonly`.
5. Test Users (for External in "Testing" status):
   - Add the administrator Google account (e.g. `hemantsrmit@gmail.com`).
   - In "Testing" mode, only authorized test users can complete the OAuth flow without undergoing full Google app verification.

---

## 4. OAuth Client Creation

1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Application type**: **Web application**.
4. Name: `Hemant Knowledge Platform Drive Ingestion Client`.
5. Configure **Authorized redirect URIs**:
   - Local development: `http://localhost:3000/api/auth/google/callback`
   - Production primary: `https://www.hemantkrkushwaha.com/api/auth/google/callback`
   - Production apex: `https://hemantkrkushwaha.com/api/auth/google/callback`
6. Click **Create**.
7. Google Cloud displays:
   - **Client ID**
   - **Client Secret**
8. Store these credentials securely in your local environment or password manager. **NEVER** commit them to Git or share them in public repositories.

---

## 5. Scope Evaluation & Least Privilege

The platform evaluates all potential Google Drive scopes against the principle of least privilege:

| Scope | Permissions | Feasible for Content Ingestion? | Decision |
| :--- | :--- | :--- | :--- |
| `https://www.googleapis.com/auth/drive.readonly` | Read-only access to file metadata and contents | **YES** — Allows listing files, downloading binary files, and exporting Google Docs/Sheets/Slides. | **APPROVED (Selected Default)** |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | Read metadata only | **NO** — Explicitly forbids downloading binary payloads (`alt=media`) and forbids document export. | **REJECTED** |
| `https://www.googleapis.com/auth/drive.file` | Per-file access to files created/opened by app | **NO** — Cannot access pre-existing NotebookLM exports or user study materials stored in Drive folders. | **REJECTED** |
| `https://www.googleapis.com/auth/drive` | Full read, write, modify, delete access | **NO** — Unnecessarily broad; violates least privilege since ingestion never modifies Drive files. | **REJECTED** |

**Conclusion**: `https://www.googleapis.com/auth/drive.readonly` is the minimum viable scope for ingesting study materials and research documents from Google Drive.

---

## 6. Token Security & Management

OAuth credentials and tokens are sensitive secrets with access to the user's files.

### Security Invariants:
1. **Never in Frontend**: No `VITE_` prefix, no client-side bundles, no React context.
2. **Never in Manifests**: The Content Manifest v1.0 and Automation Gateway request never accept or transmit OAuth tokens.
3. **Never in Plaintext Database Tables**: Step 22 does not create a plaintext database table for tokens. Future persistent token storage will utilize authenticated encrypted storage (e.g. envelope encryption with AES-256-GCM or cloud secret manager).
4. **Never in Logs**: The `GoogleDriveOAuthService` explicitly sanitizes all output and error payloads to prevent logging tokens or client secrets.

### Environment Variable Contract:
```env
# Server-side only (never prefix with VITE_)
GOOGLE_CLIENT_ID="<your-google-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

---

## 7. Server-Side Architecture & Services

### `GoogleDriveOAuthService` (`src/services/googleDriveOAuthService.ts`)
- **`generateAuthorizationUrl(options)`**: Generates the official Google OAuth authorization URL with `response_type=code`, `access_type=offline`, `prompt=consent`, and a cryptographically secure random `state`.
- **`validateState(receivedState, expectedState)`**: Constant-time state comparison to mitigate CSRF attacks.
- **`exchangeCodeForTokens(code, options)`**: Performs POST exchange to `https://oauth2.googleapis.com/token` to retrieve `access_token` and `refresh_token`.
- **`refreshAccessToken(refreshToken)`**: Uses an offline refresh token to obtain a fresh access token without user re-authentication.

### `GoogleDriveService` (`src/services/googleDriveService.ts`)
- **`listFiles(options)`**: Queries `https://www.googleapis.com/drive/v3/files`. Automatically enforces `trashed = false`. Supports querying by designated folder ID.
- **`getFile(fileId, fields)`**: Retrieves metadata for a specific Drive file.
- **`downloadFile(fileId)`**: Downloads binary content (`alt=media`). Rejects Google-native documents with a clear error instructing caller to use export.
- **`exportGoogleDocument(fileId, targetMimeType)`**: Exports Google Docs, Sheets, and Slides using official Google export targets.
- **`buildSourceInput(params)`**: Packages file metadata, downloaded/exported buffer, and user-supplied taxonomy into `GoogleDriveSourceInput`.

---

## 8. Google-Native Document Export Targets

Google Docs, Sheets, and Slides do not have binary byte streams in Google Drive; they are proprietary cloud document representations. Google Drive API v3 provides an official `export` endpoint:

```
GET https://www.googleapis.com/drive/v3/files/{fileId}/export?mimeType={targetMimeType}
```

The service maintains an authoritative mapping of supported export targets:

```typescript
export const GOOGLE_NATIVE_EXPORT_TARGETS = {
  'application/vnd.google-apps.document': [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'text/plain',
    'text/markdown',
  ],
  'application/vnd.google-apps.spreadsheet': [
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  ],
  'application/vnd.google-apps.presentation': [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'text/plain',
  ],
};
```

---

## 9. Designated Folder Architecture

Future automated ingestion may read from a designated Drive folder (e.g. `NotebookLM Exports`).

### Rules:
- **No Hardcoded Folder IDs**: The folder ID must be dynamically discovered via a folder search (`mimeType = 'application/vnd.google-apps.folder' and name = 'NotebookLM Exports' and trashed = false`) or supplied through configuration (`GOOGLE_DRIVE_FOLDER_ID`).
- **No Folder Name Taxonomy**: The name of the folder is purely organizational for the user in Drive. It is **NEVER** used to infer platform taxonomy (`section`, `category`, `topic`).

---

## 10. Taxonomy Authority: Non-Inference Invariant

The platform's taxonomical model is user-governed and authoritative. The Google Drive API client and adapter enforce this invariant:

```
Drive File Metadata (Name, MIME, Folder, Timestamps)
       │
       ├─ [REJECTED] Auto-inferring section from folder name
       ├─ [REJECTED] Auto-inferring category from file title
       ├─ [REJECTED] Auto-inferring content_type from extension
       │
       └─► Taxonomical Fields MUST be explicitly provided:
           - section
           - category
           - topic
           - content_type
           - title
```

If any taxonomical field is missing, the adapter rejects the operation with `GoogleDriveAdapterError` (`MISSING_REQUIRED_FIELD`).

---

## 11. Complete Future Ingestion Workflow

When live ingestion is activated in subsequent steps, the workflow will be:

```
1. User creates or exports content in Google Drive (e.g. in "NotebookLM Exports")
2. Runner queries GoogleDriveService.listFiles({ folderId, trashed: false })
3. Runner retrieves document metadata and downloads/exports content buffer
4. User supplies explicit taxonomy (section, category, topic, content_type, title)
5. GoogleDriveService.buildSourceInput() packages the raw source input
6. GoogleDriveAdapter.adapt() transforms input into canonical Content Manifest v1.0
7. Deterministic Idempotency-Key generated from payload
8. Runner submits package to POST /api/automation/ingest (with CONTENT_INGESTION_API_KEY)
9. Automation Gateway validates manifest and idempotency
10. Existing File-Aware Ingestion Pipeline stores file in Supabase Storage and inserts record in Supabase Database
11. Published content renders immediately on hemantkrkushwaha.com
```

---

## 12. What is NOT Implemented in Step 22

To preserve system safety and prevent unauthorized mutations:

- **NO live Google accounts connected** (Connection count: 0)
- **NO OAuth consent flows initiated in production** (Authorization count: 0)
- **NO live Google Drive API requests** (Request count: 0)
- **NO files read from user Drive** (Files read: 0)
- **NO files uploaded to platform storage** (Storage mutations: 0)
- **NO database records inserted** (Database mutations: 0)
- **NO schema changes or RLS policy changes** (Schema/RLS changes: 0)
- **NO tokens persisted in database** (Plaintext token tables: 0)
- **NO production deployment in Step 22** (Pre-deployment foundation only)
