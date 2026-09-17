# Content Manifest System Specification

**Hemant Kumar Kushwaha Knowledge Platform** (`hemantkrkushwaha.com`)  
**Architecture:** Automation Foundation + Standardized Content Manifest

---

## 1. Purpose

The **Content Manifest** is the standardized metadata contract for the platform's content publishing pipeline. It defines exactly where a resource belongs across the platform's knowledge taxonomy without relying on AI to infer, guess, or reclassify the author's work.

### Core Architectural Principle
> **The manifest is the single source of truth for content placement.**  
> Automation pipelines and ingestion services must **NEVER** infer or override:
> - `section`
> - `category`
> - `topic`
> - `content_type`  
> These values originate solely from the author-provided manifest.

The manifest is **metadata only** and does not embed large binary files. File assets (PDFs, presentations, datasets) are referenced by filename or URL and processed via storage ingestion.

---

## 2. Architecture & Data Flow

```
+---------------------------+
|  Author Content Manifest  |  (JSON metadata declaration)
+---------------------------+
              │
              ▼
+---------------------------+
|   Manifest Validation &   |  (validateContentManifest,
|       Normalization       |   normalizeContentManifest)
+---------------------------+
              │
              ▼
+---------------------------+
|   Conversion Boundary     |  (prepareIngestionPayload:
|     (Ingestion Spec)      |   ManifestIngestionPayload)
+---------------------------+
              │
              ▼
+-----------------------------------------------------------+
|               Future Content Ingestion Service            |
|  - Creates/links records in Supabase `content`            |
|  - Resolves/creates tags in Supabase `tags`               |
|  - Links junction records in `content_tags`               |
|  - Establishes relationships in `content_relationships`   |
+-----------------------------------------------------------+
```

---

## 3. Field Definitions & Schema

### Required Fields

| Field | Type | Description | Allowed Values |
| :--- | :--- | :--- | :--- |
| `section` | `string` | The top-level knowledge domain | `'academics'`, `'research'`, `'philosophy'`, `'writings'` |
| `category` | `string` | Primary subject classification within the section | Non-empty string (e.g., `'computer-networks'`, `'Psychology'`, `'Poetry'`) |
| `topic` | `string` | Logical subject grouping that multiple resources belong to | Non-empty string (e.g., `'arp'`, `'neural-networks'`, `'consciousness'`) |
| `content_type` | `string` | Nature/format of the resource | Allowed content types (see section 4) |
| `title` | `string` | Official display title of the resource | Non-empty string |

### Optional Fields

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `subcategory` | `string` | `null` | Optional granular division within category |
| `description` | `string` | `null` | Editorial summary or abstract |
| `tags` | `string[]` | `[]` | Array of topic tags associated with the resource |
| `language` | `string` | `'en'` | ISO 639-1 language code (e.g. `'en'`, `'hi'`) |
| `visibility` | `string` | `'public'` | Access scope (`'public'`, `'registered'`, `'premium'`) |
| `is_featured` | `boolean` | `false` | Highlighted placement flag |
| `external_url` | `string` | `null` | External publication, DOI, or interactive tool link |
| `source_url` | `string` | `null` | Source repository, Google Drive, or reference URL |
| `file_name` | `string` | `null` | File identifier (e.g. `'arp-lecture-notes.pdf'`) |
| `related_content` | `(string \| object)[]` | `[]` | Slugs or IDs of related companion items |
| `published` | `boolean` | `false` | If `true`, ready for published status; otherwise draft |

---

## 4. Allowed Values

### Sections
- `academics`
- `research`
- `philosophy`
- `writings`

### Standard Content Types
The manifest supports the following extensible content types:
- `article`
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

## 5. Topic Grouping Model & Ingestion Preservation

A **topic** is a logical concept grouping multiple companion resources without requiring a separate relational database table.

### Ingestion Preservation & Database Association
- **Schema Boundary**: The current PostgreSQL `content` table does not possess a dedicated `topic` column. In Step 9, the database schema remains strictly unmodified.
- **Model Preservation**: The `ingestContent()` service accepts the author's topic, preserves it inside the metadata model boundary, and returns it explicitly in `IngestionResult.topic`. The topic is never silently discarded.
- **Future Association Strategy**: In future database milestones or ingestion pipelines, `topic` will be permanently mapped via:
  1. Automated semantic tag creation (associating `#topic` with the content item), and/or
  2. A dedicated `topic` column migration, and/or
  3. Automatic companion relationship clustering via `content_relationships` for all resources sharing the identical `topic` within a category.

For example, for the topic **"arp"** under `section: academics` and `category: computer-networks`:
1. Lecture Notes (`content_type: "study_material"`, `file_name: "arp-notes.pdf"`)
2. Slide Deck (`content_type: "presentation"`, `file_name: "arp-slides.pptx"`)
3. Packet Simulator (`content_type: "interactive"`, `external_url: "https://..."`)
4. Video Lecture (`content_type: "lecture"`, `external_url: "https://..."`)

All resources share the same `topic: "arp"`, enabling companion discovery and relationship linking.

---

## 6. Example Manifests

### Example A: Academic Study Material
```json
{
  "section": "academics",
  "category": "computer-networks",
  "topic": "arp",
  "content_type": "study_material",
  "title": "ARP – Address Resolution Protocol",
  "description": "Lecture notes on Address Resolution Protocol, frame structure, and cache operation.",
  "tags": ["ARP", "IPv4", "Networking", "Data Link Layer"],
  "language": "en",
  "visibility": "public",
  "file_name": "arp-address-resolution-protocol.pdf",
  "published": false
}
```

### Example B: Research Publication
```json
{
  "section": "research",
  "category": "Publications",
  "topic": "federated-learning-iot",
  "content_type": "research_paper",
  "title": "Energy-Efficient Federated Edge Intelligence for Sensor Networks",
  "description": "Empirical study on gradient quantization and privacy preservation across constrained nodes.",
  "tags": ["Federated Learning", "Edge Computing", "IoT"],
  "language": "en",
  "visibility": "public",
  "external_url": "https://doi.org/10.1109/example.2026.001",
  "published": false
}
```

### Example C: Philosophy Essay
```json
{
  "section": "philosophy",
  "category": "Consciousness",
  "topic": "subjective-experience",
  "content_type": "essay",
  "title": "The Boundary Between Observation and Identity",
  "description": "An inquiry into the architecture of self-awareness and meditative contemplation.",
  "tags": ["Consciousness", "Meditation", "Philosophy of Mind"],
  "language": "en",
  "visibility": "public",
  "published": false
}
```

---

## 7. Future Ingestion Pipeline Implementation Guide

When developing future ingestion pipelines:
1. **Read & Validate**: Invoke `validateContentManifest(manifest)`. Reject malformed or missing metadata with descriptive errors.
2. **Normalize**: Call `normalizeContentManifest(manifest)` to trim strings and obtain deterministic slug helpers (`title_slug`, `topic_slug`).
3. **Map to Payload**: Use `prepareIngestionPayload(normalized)` to format records directly compatible with Supabase `content`, `tags`, and `content_relationships`.
4. **No AI Classification**: Ingestion pipelines must respect manifest values verbatim.
