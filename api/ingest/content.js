// src/server/middleware/authMiddleware.ts
import crypto from "crypto";
function safeCompare(a, b) {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
function checkRateLimitExtension(_req) {
  return true;
}
function authenticateIngestionRequest(req, res, next) {
  if (!checkRateLimitExtension(req)) {
    res.status(429).json({
      success: false,
      error: "Too Many Requests: Ingestion rate limit exceeded."
    });
    return;
  }
  const configuredKey = process.env.CONTENT_INGESTION_API_KEY;
  if (!configuredKey || configuredKey.trim().length === 0) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Content Ingestion API key is not configured on the server."
    });
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Missing or invalid Authorization header."
    });
    return;
  }
  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Authorization header format must be "Bearer <token>".'
    });
    return;
  }
  const providedToken = parts[1];
  const isMatch = safeCompare(providedToken, configuredKey.trim());
  if (!isMatch) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid authentication credentials."
    });
    return;
  }
  next();
}

// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseClientInstance = null;
function getPublicEnvVar(key) {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return void 0;
}
function getSupabaseClient() {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }
  const supabaseUrl = getPublicEnvVar("VITE_SUPABASE_URL");
  const publishableKey = getPublicEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !publishableKey) {
    return null;
  }
  try {
    supabaseClientInstance = createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    return supabaseClientInstance;
  } catch (error) {
    console.warn("[Supabase] Failed to initialize Supabase client:", error);
    return null;
  }
}

// src/types/storage.ts
var SUPPORTED_FILE_EXTENSIONS = [
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "mp4",
  "webm"
];
var SUPPORTED_MIME_TYPES = {
  pdf: ["application/pdf"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint"
  ],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword"
  ],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  mp4: ["video/mp4"],
  webm: ["video/webm"]
};

// src/services/storageService.ts
var DEFAULT_STORAGE_BUCKET = "content-files";
var DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
function getStorageBucketName() {
  if (typeof process !== "undefined" && process.env?.SUPABASE_STORAGE_BUCKET) {
    return process.env.SUPABASE_STORAGE_BUCKET.trim();
  }
  return DEFAULT_STORAGE_BUCKET;
}
function validateBucketName(bucket) {
  const canonicalBucket = getStorageBucketName();
  if (!bucket || typeof bucket !== "string" || bucket.trim().length === 0) {
    return { valid: true, bucket: canonicalBucket };
  }
  const normalized = bucket.trim();
  if (normalized !== canonicalBucket) {
    return {
      valid: false,
      error: `Arbitrary bucket access is forbidden. Target bucket must resolve to "${canonicalBucket}".`,
      bucket: normalized
    };
  }
  return { valid: true, bucket: canonicalBucket };
}
function getMaxFileSizeBytes() {
  if (typeof process !== "undefined" && process.env?.MAX_FILE_SIZE_BYTES) {
    const parsed = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_FILE_SIZE_BYTES;
}
function sanitizeFileName(rawFileName) {
  if (!rawFileName || typeof rawFileName !== "string") {
    return "";
  }
  const baseName = rawFileName.replace(/^.*[\\/]/, "").trim();
  const sanitized = baseName.replace(/\0/g, "").replace(/[^\w.-]/g, "_").replace(/\.\.+/g, ".");
  return sanitized;
}
function validateStoragePath(path) {
  if (!path || typeof path !== "string" || path.trim().length === 0) {
    return { valid: false, error: "Storage path cannot be empty." };
  }
  if (path.includes("\0")) {
    return { valid: false, error: "Storage path contains null bytes." };
  }
  if (/[\x00-\x1F\x7F]/.test(path)) {
    return { valid: false, error: "Storage path contains invalid control characters." };
  }
  if (/%2e|%2f|%5c/i.test(path)) {
    return { valid: false, error: "Storage path contains encoded traversal sequences." };
  }
  if (path.startsWith("/") || path.startsWith("\\")) {
    return { valid: false, error: "Storage path must be relative and cannot begin with a slash." };
  }
  if (/^[a-zA-Z]:/.test(path)) {
    return { valid: false, error: "Storage path must be relative and cannot contain drive letters." };
  }
  if (/\/{2,}|\\{2,}/.test(path)) {
    return { valid: false, error: "Storage path contains invalid double slashes." };
  }
  const segments = path.split(/[/\\]/);
  for (const seg of segments) {
    if (seg === ".." || seg === ".") {
      return { valid: false, error: 'Storage path contains unsafe path traversal elements ("..").' };
    }
    if (seg.trim() !== seg) {
      return { valid: false, error: "Storage path segments cannot contain leading or trailing whitespace." };
    }
  }
  const canonicalBucket = getStorageBucketName().toLowerCase();
  const lowerPath = path.toLowerCase();
  if (lowerPath.startsWith(`${canonicalBucket}/`) || lowerPath.startsWith(`${canonicalBucket}\\`)) {
    return { valid: false, error: "Storage path must not include the bucket name prefix." };
  }
  return { valid: true };
}
function generateDeterministicStoragePath(params) {
  const sanitizeSlugSegment = (val) => {
    return (val || "").toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-]/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");
  };
  const cleanSection = sanitizeSlugSegment(params.section) || "general";
  const cleanCategory = sanitizeSlugSegment(params.category) || "general";
  const cleanTopic = sanitizeSlugSegment(params.topic) || "general";
  const cleanType = sanitizeSlugSegment(params.contentType) || "resource";
  const cleanFile = sanitizeFileName(params.fileName) || "file.bin";
  return `${cleanSection}/${cleanCategory}/${cleanTopic}/${cleanType}/${cleanFile}`;
}
function validateFileMetadata(metadata) {
  const errors = [];
  if (!metadata || typeof metadata !== "object") {
    return {
      valid: false,
      errors: ["File metadata must be a non-null object."],
      detectedExtension: null,
      sanitizedFileName: null
    };
  }
  const raw = metadata;
  if (raw.file_name === void 0 || raw.file_name === null) {
    errors.push('Missing required field: "file_name".');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null
    };
  }
  if (typeof raw.file_name !== "string") {
    errors.push('Field "file_name" must be a string.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null
    };
  }
  const rawFileName = raw.file_name.trim();
  if (rawFileName.length === 0) {
    errors.push('Field "file_name" cannot be empty or contain only whitespace.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null
    };
  }
  if (rawFileName.includes("..") || rawFileName.includes("/") || rawFileName.includes("\\") || rawFileName.includes("\0") || rawFileName.toLowerCase().includes("%2e%2e") || rawFileName.toLowerCase().includes("%2f")) {
    errors.push('Field "file_name" must not contain path traversal characters (".."), path separators ("/", "\\"), or null bytes.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null
    };
  }
  const sanitized = sanitizeFileName(rawFileName);
  if (sanitized.length === 0) {
    errors.push('Field "file_name" contains no valid characters.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null
    };
  }
  const lastDot = sanitized.lastIndexOf(".");
  if (lastDot === -1 || lastDot === sanitized.length - 1 || lastDot === 0) {
    errors.push(`File "${rawFileName}" lacks a valid file extension or base name.`);
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: sanitized
    };
  }
  const ext = sanitized.substring(lastDot + 1).toLowerCase();
  if (!SUPPORTED_FILE_EXTENSIONS.includes(ext)) {
    errors.push(
      `Unsupported file extension ".${ext}". Supported extensions are: ${SUPPORTED_FILE_EXTENSIONS.map((e) => `.${e}`).join(", ")}.`
    );
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: sanitized
    };
  }
  const detectedExtension = ext;
  if (raw.file_type !== void 0 && raw.file_type !== null) {
    if (typeof raw.file_type !== "string") {
      errors.push('Field "file_type" must be a string representing the MIME type.');
    } else {
      const mime = raw.file_type.trim().toLowerCase();
      const allowedMimes = SUPPORTED_MIME_TYPES[detectedExtension] || [];
      if (!allowedMimes.includes(mime)) {
        errors.push(
          `Invalid MIME type "${raw.file_type}" for file extension ".${detectedExtension}" (MIME mismatch). Expected one of: ${allowedMimes.join(", ")}.`
        );
      }
    }
  }
  if (raw.file_size !== void 0 && raw.file_size !== null) {
    if (typeof raw.file_size !== "number" || isNaN(raw.file_size)) {
      errors.push('Field "file_size" must be a valid number of bytes.');
    } else if (raw.file_size < 0) {
      errors.push('Field "file_size" cannot be negative.');
    } else {
      const maxLimit = getMaxFileSizeBytes();
      if (raw.file_size > maxLimit) {
        const maxMb = Math.round(maxLimit / (1024 * 1024));
        errors.push(
          `File size (${raw.file_size} bytes) exceeds the maximum allowed limit of ${maxLimit} bytes (${maxMb}MB).`
        );
      }
    }
  }
  if (raw.file_path !== void 0 && raw.file_path !== null) {
    if (typeof raw.file_path !== "string") {
      errors.push('Field "file_path" must be a string.');
    } else {
      const pathCheck = validateStoragePath(raw.file_path);
      if (!pathCheck.valid) {
        errors.push(pathCheck.error || "Invalid storage file_path.");
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    detectedExtension,
    sanitizedFileName: sanitized
  };
}
async function uploadFile(params, client) {
  const bucketCheck = validateBucketName(params.bucket);
  if (!bucketCheck.valid) {
    return {
      success: false,
      path: null,
      bucket: params.bucket || "",
      publicUrl: null,
      error: bucketCheck.error || "Invalid bucket name."
    };
  }
  const bucket = bucketCheck.bucket;
  const pathCheck = validateStoragePath(params.path);
  if (!pathCheck.valid) {
    return {
      success: false,
      path: null,
      bucket,
      publicUrl: null,
      error: pathCheck.error || "Invalid storage path."
    };
  }
  const resolvedClient = client || getSupabaseClient();
  if (!resolvedClient) {
    return {
      success: false,
      path: null,
      bucket,
      publicUrl: null,
      error: "Supabase storage client is unavailable."
    };
  }
  try {
    const { error: uploadError } = await resolvedClient.storage.from(bucket).upload(params.path, params.data, {
      contentType: params.contentType,
      upsert: params.upsert ?? false,
      metadata: params.metadata
    });
    if (uploadError) {
      return {
        success: false,
        path: null,
        bucket,
        publicUrl: null,
        error: `Storage upload failed: ${uploadError.message}`
      };
    }
    const { data: publicUrlData } = resolvedClient.storage.from(bucket).getPublicUrl(params.path);
    return {
      success: true,
      path: params.path,
      bucket,
      publicUrl: publicUrlData?.publicUrl || null
    };
  } catch (err) {
    return {
      success: false,
      path: null,
      bucket,
      publicUrl: null,
      error: `Unexpected storage upload error: ${err?.message || String(err)}`
    };
  }
}
async function deleteFile(params, client) {
  const bucketCheck = validateBucketName(params.bucket);
  if (!bucketCheck.valid) {
    return {
      success: false,
      path: params.path,
      bucket: params.bucket || "",
      error: bucketCheck.error || "Invalid bucket name."
    };
  }
  const bucket = bucketCheck.bucket;
  const pathCheck = validateStoragePath(params.path);
  if (!pathCheck.valid) {
    return {
      success: false,
      path: params.path,
      bucket,
      error: pathCheck.error || "Invalid storage path."
    };
  }
  const resolvedClient = client || getSupabaseClient();
  if (!resolvedClient) {
    return {
      success: false,
      path: params.path,
      bucket,
      error: "Supabase storage client is unavailable."
    };
  }
  try {
    const { error } = await resolvedClient.storage.from(bucket).remove([params.path]);
    if (error) {
      return {
        success: false,
        path: params.path,
        bucket,
        error: `Storage deletion failed: ${error.message}`
      };
    }
    return {
      success: true,
      path: params.path,
      bucket
    };
  } catch (err) {
    return {
      success: false,
      path: params.path,
      bucket,
      error: `Unexpected storage deletion error: ${err?.message || String(err)}`
    };
  }
}

// src/server/middleware/multipartMiddleware.ts
function parseMultipartBuffer(buffer, boundary) {
  const parts = [];
  const boundaryDelimiter = Buffer.from(`--${boundary}`);
  const crlfcrlf = Buffer.from("\r\n\r\n");
  const lflf = Buffer.from("\n\n");
  let currentPos = 0;
  while (currentPos < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryDelimiter, currentPos);
    if (boundaryIndex === -1) break;
    const afterBoundary = boundaryIndex + boundaryDelimiter.length;
    if (afterBoundary + 1 < buffer.length && buffer[afterBoundary] === 45 && // '-'
    buffer[afterBoundary + 1] === 45) {
      break;
    }
    let headerStart = afterBoundary;
    if (buffer[headerStart] === 13 && buffer[headerStart + 1] === 10) {
      headerStart += 2;
    } else if (buffer[headerStart] === 10) {
      headerStart += 1;
    }
    let headerEnd = buffer.indexOf(crlfcrlf, headerStart);
    let bodyStart = headerEnd + 4;
    if (headerEnd === -1) {
      headerEnd = buffer.indexOf(lflf, headerStart);
      if (headerEnd === -1) break;
      bodyStart = headerEnd + 2;
    }
    const headersRaw = buffer.subarray(headerStart, headerEnd).toString("utf8");
    const headerLines = headersRaw.split(/\r?\n/);
    const headers = {};
    for (const line of headerLines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim().toLowerCase();
        const val = line.substring(colonIdx + 1).trim();
        headers[key] = val;
      }
    }
    const nextBoundary = buffer.indexOf(boundaryDelimiter, bodyStart);
    if (nextBoundary === -1) break;
    let bodyEnd = nextBoundary;
    if (bodyEnd >= 2 && buffer[bodyEnd - 2] === 13 && buffer[bodyEnd - 1] === 10) {
      bodyEnd -= 2;
    } else if (bodyEnd >= 1 && buffer[bodyEnd - 1] === 10) {
      bodyEnd -= 1;
    }
    const partBody = buffer.subarray(bodyStart, bodyEnd);
    parts.push({ headers, body: partBody });
    currentPos = nextBoundary;
  }
  return parts;
}
function parseMultipartIngestion(req, res, next) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return next();
  }
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2] || "").trim() : "";
  if (!boundary) {
    res.status(400).json({
      success: false,
      error: "Bad Request: Missing or invalid boundary in multipart/form-data Content-Type header."
    });
    return;
  }
  const maxLimit = getMaxFileSizeBytes() + 1024 * 1024;
  const handleBuffer = (rawBuffer) => {
    try {
      const parts = parseMultipartBuffer(rawBuffer, boundary);
      if (!req.body || typeof req.body !== "object") {
        req.body = {};
      }
      const files = [];
      for (const part of parts) {
        const disposition = part.headers["content-disposition"] || "";
        const nameMatch = /name="([^"]+)"/i.exec(disposition);
        const filenameMatch = /filename="([^"]*)"/i.exec(disposition);
        const fieldName = nameMatch ? nameMatch[1] : "";
        const rawFileName = filenameMatch ? filenameMatch[1] : null;
        if (rawFileName !== null) {
          if (rawFileName.trim().length > 0) {
            const partContentType = part.headers["content-type"] || "application/octet-stream";
            files.push({
              fileName: rawFileName,
              fileType: partContentType,
              fileSize: part.body.length,
              data: part.body
            });
          }
        } else if (fieldName) {
          const strValue = part.body.toString("utf8");
          if (fieldName === "manifest") {
            try {
              req.body.manifest = JSON.parse(strValue);
            } catch {
              req.body.manifest = strValue;
            }
          } else {
            req.body[fieldName] = strValue;
          }
        }
      }
      if (files.length > 1) {
        req.multipleFilesDetected = true;
      } else if (files.length === 1) {
        req.fileResource = files[0];
      }
      return next();
    } catch (err) {
      res.status(400).json({
        success: false,
        error: `Bad Request: Failed to parse multipart payload: ${err?.message || "Malformed multipart stream"}`
      });
    }
  };
  if (Buffer.isBuffer(req.rawBody)) {
    return handleBuffer(req.rawBody);
  }
  if (Buffer.isBuffer(req.body)) {
    return handleBuffer(req.body);
  }
  const chunks = [];
  let totalLength = 0;
  let hasAborted = false;
  req.on("data", (chunk) => {
    if (hasAborted) return;
    totalLength += chunk.length;
    if (totalLength > maxLimit) {
      hasAborted = true;
      res.status(413).json({
        success: false,
        error: `Payload Too Large: Upload exceeds the maximum allowed limit of ${maxLimit} bytes.`
      });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    if (hasAborted) return;
    const fullBuffer = Buffer.concat(chunks);
    handleBuffer(fullBuffer);
  });
  req.on("error", (err) => {
    if (hasAborted) return;
    res.status(400).json({
      success: false,
      error: `Bad Request: Stream read error: ${err?.message || "Failed to read request stream"}`
    });
  });
}

// src/types/manifest.ts
var MANIFEST_SECTIONS = [
  "academics",
  "research",
  "philosophy",
  "writings"
];
var MANIFEST_CONTENT_TYPES = [
  "article",
  "study_material",
  "presentation",
  "interactive",
  "book",
  "book_chapter",
  "research_paper",
  "research_project",
  "patent",
  "dataset",
  "lecture",
  "video",
  "poem",
  "novel",
  "short_story",
  "essay",
  "reflection",
  "resource"
];

// src/services/manifestService.ts
function slugify(text) {
  if (!text) return "";
  return text.toString().toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
}
function validateContentManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      valid: false,
      errors: ["Manifest must be a non-null JSON object."]
    };
  }
  const raw = manifest;
  if (raw.title === void 0 || raw.title === null) {
    errors.push('Missing required field: "title".');
  } else if (typeof raw.title !== "string") {
    errors.push('Field "title" must be a string.');
  } else if (raw.title.trim().length === 0) {
    errors.push('Field "title" cannot be empty or contain only whitespace.');
  }
  if (raw.section === void 0 || raw.section === null) {
    errors.push('Missing required field: "section".');
  } else if (typeof raw.section !== "string") {
    errors.push('Field "section" must be a string.');
  } else if (!MANIFEST_SECTIONS.includes(raw.section)) {
    errors.push(
      `Invalid section "${raw.section}". Allowed sections are: ${MANIFEST_SECTIONS.join(", ")}.`
    );
  }
  if (raw.category === void 0 || raw.category === null) {
    errors.push('Missing required field: "category".');
  } else if (typeof raw.category !== "string") {
    errors.push('Field "category" must be a string.');
  } else if (raw.category.trim().length === 0) {
    errors.push('Field "category" cannot be empty or contain only whitespace.');
  }
  if (raw.topic === void 0 || raw.topic === null) {
    errors.push('Missing required field: "topic".');
  } else if (typeof raw.topic !== "string") {
    errors.push('Field "topic" must be a string.');
  } else if (raw.topic.trim().length === 0) {
    errors.push('Field "topic" cannot be empty or contain only whitespace.');
  }
  if (raw.content_type === void 0 || raw.content_type === null) {
    errors.push('Missing required field: "content_type".');
  } else if (typeof raw.content_type !== "string") {
    errors.push('Field "content_type" must be a string.');
  } else if (!MANIFEST_CONTENT_TYPES.includes(raw.content_type)) {
    errors.push(
      `Invalid content_type "${raw.content_type}". Allowed types are: ${MANIFEST_CONTENT_TYPES.join(", ")}.`
    );
  }
  if (raw.tags !== void 0 && raw.tags !== null) {
    if (!Array.isArray(raw.tags)) {
      errors.push('Field "tags", when provided, must be an array of strings.');
    } else {
      raw.tags.forEach((tag, idx) => {
        if (typeof tag !== "string") {
          errors.push(`Tag at index ${idx} must be a string, received ${typeof tag}.`);
        } else if (tag.trim().length === 0) {
          errors.push(`Tag at index ${idx} cannot be empty or whitespace.`);
        }
      });
    }
  }
  if (raw.visibility !== void 0 && raw.visibility !== null) {
    const allowedVisibility = ["public", "registered", "premium"];
    if (!allowedVisibility.includes(raw.visibility)) {
      errors.push(
        `Invalid visibility "${raw.visibility}". Allowed values are: ${allowedVisibility.join(", ")}.`
      );
    }
  }
  if (raw.is_featured !== void 0 && typeof raw.is_featured !== "boolean") {
    errors.push('Field "is_featured", when provided, must be a boolean.');
  }
  if (raw.published !== void 0 && typeof raw.published !== "boolean") {
    errors.push('Field "published", when provided, must be a boolean.');
  }
  if (raw.external_url !== void 0 && raw.external_url !== null && typeof raw.external_url !== "string") {
    errors.push('Field "external_url", when provided, must be a string.');
  }
  if (raw.source_url !== void 0 && raw.source_url !== null && typeof raw.source_url !== "string") {
    errors.push('Field "source_url", when provided, must be a string.');
  }
  if (raw.file_name !== void 0 && raw.file_name !== null && typeof raw.file_name !== "string") {
    errors.push('Field "file_name", when provided, must be a string.');
  }
  const trimmedFileName = typeof raw.file_name === "string" ? raw.file_name.trim() : null;
  const hasFileAttributes = raw.file_type !== void 0 || raw.file_size !== void 0 || raw.file_path !== void 0;
  if (trimmedFileName || hasFileAttributes) {
    const fileValidation = validateFileMetadata({
      file_name: raw.file_name,
      file_type: raw.file_type,
      file_size: raw.file_size,
      file_path: raw.file_path,
      source_url: raw.source_url
    });
    if (!fileValidation.valid) {
      errors.push(...fileValidation.errors);
    }
  }
  if (raw.related_content !== void 0 && raw.related_content !== null) {
    if (!Array.isArray(raw.related_content)) {
      errors.push('Field "related_content", when provided, must be an array.');
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function normalizeContentManifest(manifest) {
  const cleanCategory = manifest.category.trim();
  const cleanTopic = manifest.topic.trim();
  const cleanTitle = manifest.title.trim();
  const cleanTags = [];
  if (Array.isArray(manifest.tags)) {
    const seen = /* @__PURE__ */ new Set();
    for (const rawTag of manifest.tags) {
      if (typeof rawTag === "string") {
        const trimmed = rawTag.trim();
        if (trimmed.length > 0 && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          cleanTags.push(trimmed);
        }
      }
    }
  }
  const cleanRelated = [];
  if (Array.isArray(manifest.related_content)) {
    for (const item of manifest.related_content) {
      if (typeof item === "string" && item.trim().length > 0) {
        cleanRelated.push({ slug: item.trim(), relationship_type: "related" });
      } else if (item && typeof item === "object") {
        const relObj = item;
        cleanRelated.push({
          slug: relObj.slug?.trim() || void 0,
          id: relObj.id?.trim() || void 0,
          relationship_type: relObj.relationship_type?.trim() || "related"
        });
      }
    }
  }
  const cleanSubcategory = manifest.subcategory?.trim() || null;
  const cleanDescription = manifest.description?.trim() || null;
  const cleanExternalUrl = manifest.external_url?.trim() || null;
  const cleanSourceUrl = manifest.source_url?.trim() || null;
  const cleanFileName = manifest.file_name?.trim() || null;
  const cleanFileType = manifest.file_type?.trim().toLowerCase() || null;
  const cleanFileSize = typeof manifest.file_size === "number" && !isNaN(manifest.file_size) ? manifest.file_size : null;
  const cleanFilePath = manifest.file_path?.trim() || null;
  const cleanLanguage = manifest.language?.trim() || "en";
  const cleanVisibility = manifest.visibility || "public";
  const cleanIsFeatured = manifest.is_featured ?? false;
  const cleanPublished = manifest.published ?? false;
  return {
    section: manifest.section,
    // Preserved exactly as user specified
    category: cleanCategory,
    // Preserved without semantic alteration
    topic: cleanTopic,
    // Preserved
    topic_slug: slugify(cleanTopic),
    content_type: manifest.content_type,
    // Preserved exactly as user specified
    title: cleanTitle,
    title_slug: slugify(cleanTitle),
    subcategory: cleanSubcategory,
    description: cleanDescription,
    tags: cleanTags,
    language: cleanLanguage,
    visibility: cleanVisibility,
    is_featured: cleanIsFeatured,
    external_url: cleanExternalUrl,
    source_url: cleanSourceUrl,
    file_name: cleanFileName,
    file_type: cleanFileType,
    file_size: cleanFileSize,
    file_path: cleanFilePath,
    related_content: cleanRelated,
    published: cleanPublished
  };
}

// src/services/contentIngestionService.ts
function generateDeterministicSlug(title) {
  if (!title) return "";
  return title.toLowerCase().trim().replace(/[—–]/g, "-").replace(/[\s_]+/g, "-").replace(/[^\w-]/g, "").replace(/--+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
}
function mapManifestToContentRecord(normalized, slug, resolvedFileUrl) {
  const status = normalized.published ? "published" : "draft";
  const publishedAt = normalized.published ? (/* @__PURE__ */ new Date()).toISOString() : null;
  return {
    title: normalized.title,
    slug,
    description: normalized.description,
    section: normalized.section,
    category: normalized.category,
    subcategory: normalized.subcategory,
    content_type: normalized.content_type,
    body: null,
    // Body content is populated during document/file ingestion
    thumbnail_url: null,
    file_url: resolvedFileUrl !== void 0 ? resolvedFileUrl : normalized.file_path || normalized.file_name,
    external_url: normalized.external_url,
    language: normalized.language,
    status,
    visibility: normalized.visibility,
    is_featured: normalized.is_featured,
    published_at: publishedAt
  };
}
async function ingestContent(rawManifest, options = {}) {
  const warnings = [];
  const errors = [];
  const validation = validateContentManifest(rawManifest);
  if (!validation.valid) {
    return {
      success: false,
      content: null,
      slug: null,
      topic: null,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      fileUploaded: false,
      errors: validation.errors
    };
  }
  let normalizedData = null;
  let fileDataSize = 0;
  let sanitizedFileName = null;
  let detectedExtension = null;
  if (options.fileResource) {
    const rawData = options.fileResource.data;
    if (!rawData) {
      return {
        success: false,
        content: null,
        slug: null,
        title: rawManifest?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: ["Missing file data: Uploaded file contains no binary or base64 data."]
      };
    }
    if (typeof rawData === "string") {
      try {
        const cleanBase64 = rawData.includes(",") ? rawData.split(",")[1] : rawData;
        normalizedData = Buffer.from(cleanBase64, "base64");
        fileDataSize = normalizedData.length;
      } catch {
        return {
          success: false,
          content: null,
          slug: null,
          title: rawManifest?.title || null,
          topic: null,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: false,
          errors: ["Malformed file data: Failed to decode base64 file data."]
        };
      }
    } else if (Buffer.isBuffer(rawData)) {
      normalizedData = rawData;
      fileDataSize = rawData.length;
    } else if (rawData instanceof Uint8Array) {
      normalizedData = rawData;
      fileDataSize = rawData.byteLength;
    } else if (typeof Blob !== "undefined" && rawData instanceof Blob) {
      normalizedData = rawData;
      fileDataSize = rawData.size;
    } else {
      return {
        success: false,
        content: null,
        slug: null,
        title: rawManifest?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: ["Malformed file data: File data must be a Buffer, Uint8Array, Blob, or base64 string."]
      };
    }
    if (fileDataSize === 0) {
      return {
        success: false,
        content: null,
        slug: null,
        title: rawManifest?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: ["Malformed file data: Uploaded file is empty (0 bytes)."]
      };
    }
    const effectiveSize = options.fileResource.fileSize ?? fileDataSize;
    const fileValidation = validateFileMetadata({
      file_name: options.fileResource.fileName,
      file_type: options.fileResource.fileType,
      file_size: effectiveSize,
      file_path: options.fileResource.filePath
    });
    if (!fileValidation.valid) {
      return {
        success: false,
        content: null,
        slug: null,
        title: rawManifest?.title || null,
        topic: null,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: fileValidation.errors
      };
    }
    sanitizedFileName = fileValidation.sanitizedFileName;
    detectedExtension = fileValidation.detectedExtension;
  }
  const normalized = normalizeContentManifest(rawManifest);
  const slug = generateDeterministicSlug(normalized.title);
  if (!slug) {
    return {
      success: false,
      content: null,
      slug: null,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      fileUploaded: false,
      errors: ["Failed to generate a valid URL slug from the title."]
    };
  }
  const client = options.client || getSupabaseClient();
  if (!client) {
    return {
      success: false,
      content: null,
      slug,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      fileUploaded: false,
      errors: [
        "Supabase client is not configured or unavailable. Set environment variables to enable persistence."
      ]
    };
  }
  if (options.dryRun) {
    const dryRunPath = options.fileResource ? options.fileResource.filePath || generateDeterministicStoragePath({
      section: normalized.section,
      category: normalized.category,
      topic: normalized.topic,
      contentType: normalized.content_type,
      fileName: sanitizedFileName || options.fileResource.fileName
    }) : null;
    return {
      success: true,
      content: null,
      slug,
      title: normalized.title,
      topic: normalized.topic,
      tagsCreated: 0,
      tagsAssociated: normalized.tags.length,
      relationshipsCreated: normalized.related_content.length,
      fileUploaded: !!options.fileResource,
      filePath: dryRunPath,
      fileName: options.fileResource ? sanitizedFileName || options.fileResource.fileName : void 0,
      fileType: options.fileResource ? options.fileResource.fileType || (detectedExtension ? `application/${detectedExtension}` : void 0) : void 0,
      fileSize: options.fileResource ? options.fileResource.fileSize ?? fileDataSize : void 0,
      warnings: ["Dry run mode: validation and normalization succeeded without database writes."],
      errors: []
    };
  }
  try {
    const { data: existingItem, error: checkError } = await client.from("content").select("id, slug").eq("slug", slug).maybeSingle();
    if (checkError) {
      return {
        success: false,
        content: null,
        slug,
        title: normalized.title,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: [`Database check failed: ${checkError.message}`]
      };
    }
    if (existingItem) {
      return {
        success: false,
        content: null,
        slug,
        title: normalized.title,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: false,
        errors: [`Duplicate content error: A publication with slug "${slug}" already exists.`]
      };
    }
    let uploadedStoragePath = null;
    let resolvedFileUrl = null;
    if (options.fileResource) {
      const targetStoragePath = options.fileResource.filePath || generateDeterministicStoragePath({
        section: normalized.section,
        category: normalized.category,
        topic: normalized.topic,
        contentType: normalized.content_type,
        fileName: sanitizedFileName || options.fileResource.fileName
      });
      const uploadFn = options.storageService?.uploadFile || uploadFile;
      const uploadResult = await uploadFn(
        {
          path: targetStoragePath,
          data: normalizedData || options.fileResource.data,
          contentType: options.fileResource.fileType || (detectedExtension ? `application/${detectedExtension}` : "application/octet-stream")
        },
        client
      );
      if (!uploadResult.success) {
        return {
          success: false,
          content: null,
          slug,
          title: normalized.title,
          topic: normalized.topic,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: false,
          errors: [
            `File upload failed: ${uploadResult.error || "Unknown storage upload error"}. Content record was not created.`
          ]
        };
      }
      uploadedStoragePath = uploadResult.path;
      resolvedFileUrl = uploadResult.path;
    }
    const contentRecordPayload = mapManifestToContentRecord(normalized, slug, resolvedFileUrl);
    const { data: insertedContent, error: insertError } = await client.from("content").insert(contentRecordPayload).select("*").single();
    if (insertError || !insertedContent) {
      let fileCleanedUp = false;
      if (uploadedStoragePath) {
        try {
          const deleteFn = options.storageService?.deleteFile || deleteFile;
          const deleteRes = await deleteFn({ path: uploadedStoragePath }, client);
          fileCleanedUp = deleteRes.success;
        } catch {
          fileCleanedUp = false;
        }
      }
      const cleanupNote = fileCleanedUp ? " Newly uploaded file was safely cleaned up." : uploadedStoragePath ? " Warning: Automatic cleanup of the uploaded file could not be confirmed." : "";
      const isDuplicateInsert = insertError && (insertError.code === "23505" || insertError.message?.toLowerCase().includes("duplicate") || insertError.message?.toLowerCase().includes("unique constraint"));
      if (isDuplicateInsert) {
        return {
          success: false,
          content: null,
          slug,
          title: normalized.title,
          topic: normalized.topic,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: !!uploadedStoragePath,
          fileCleanedUp,
          errors: [
            `Duplicate content error: A publication with slug "${slug}" already exists.${cleanupNote}`
          ]
        };
      }
      if (insertError && (insertError.code === "42501" || insertError.message.includes("row-level security"))) {
        return {
          success: false,
          content: null,
          slug,
          title: normalized.title,
          topic: normalized.topic,
          tagsCreated: 0,
          tagsAssociated: 0,
          relationshipsCreated: 0,
          fileUploaded: !!uploadedStoragePath,
          fileCleanedUp,
          errors: [
            `Database write denied by Row-Level Security (RLS). Content ingestion requires authenticated or server-side authority.${cleanupNote}`
          ]
        };
      }
      return {
        success: false,
        content: null,
        slug,
        title: normalized.title,
        topic: normalized.topic,
        tagsCreated: 0,
        tagsAssociated: 0,
        relationshipsCreated: 0,
        fileUploaded: !!uploadedStoragePath,
        fileCleanedUp,
        errors: [`Content insertion failed: ${insertError?.message || "Unknown database error"}.${cleanupNote}`]
      };
    }
    const createdContentId = insertedContent.id;
    let tagsCreatedCount = 0;
    let tagsAssociatedCount = 0;
    let relationshipsCreatedCount = 0;
    if (normalized.tags.length > 0) {
      for (const tagName of normalized.tags) {
        try {
          const tagSlug = generateDeterministicSlug(tagName);
          let tagId = null;
          const { data: existingTag } = await client.from("tags").select("id, name").ilike("name", tagName).maybeSingle();
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            const { data: newTag, error: tagCreateError } = await client.from("tags").insert({ name: tagName, slug: tagSlug }).select("id").single();
            if (!tagCreateError && newTag) {
              tagId = newTag.id;
              tagsCreatedCount++;
            }
          }
          if (tagId) {
            const { error: linkError } = await client.from("content_tags").insert({ content_id: createdContentId, tag_id: tagId });
            if (!linkError) {
              tagsAssociatedCount++;
            }
          }
        } catch {
          warnings.push(`Failed to associate tag "${tagName}".`);
        }
      }
    }
    if (normalized.related_content.length > 0) {
      const processedTargetIds = /* @__PURE__ */ new Set();
      for (const rel of normalized.related_content) {
        const identifier = rel.slug || rel.id;
        if (!identifier) {
          warnings.push("Encountered relationship item with missing slug and id.");
          continue;
        }
        if (identifier === slug || identifier === createdContentId) {
          errors.push(`Self-relationship prevented: Content cannot be linked to itself ("${identifier}").`);
          continue;
        }
        try {
          let query = client.from("content").select("id, slug");
          if (rel.id) {
            query = query.eq("id", rel.id);
          } else if (rel.slug) {
            query = query.eq("slug", rel.slug);
          }
          const { data: targetRecord } = await query.maybeSingle();
          if (!targetRecord) {
            warnings.push(
              `Related content "${identifier}" could not be resolved in the database. Skipped to prevent broken relationship.`
            );
            continue;
          }
          const targetId = targetRecord.id;
          if (processedTargetIds.has(targetId)) {
            continue;
          }
          processedTargetIds.add(targetId);
          const { error: relInsertError } = await client.from("content_relationships").insert({
            source_content_id: createdContentId,
            target_content_id: targetId,
            relationship_type: rel.relationship_type || "related"
          });
          if (!relInsertError) {
            relationshipsCreatedCount++;
          }
        } catch {
          warnings.push(`Failed to establish relationship with "${identifier}".`);
        }
      }
    }
    return {
      success: true,
      content: insertedContent,
      slug,
      title: normalized.title,
      topic: normalized.topic,
      tagsCreated: tagsCreatedCount,
      tagsAssociated: tagsAssociatedCount,
      relationshipsCreated: relationshipsCreatedCount,
      fileUploaded: !!uploadedStoragePath,
      filePath: uploadedStoragePath,
      fileName: options.fileResource ? sanitizedFileName || options.fileResource.fileName : void 0,
      fileType: options.fileResource ? options.fileResource.fileType || (detectedExtension ? `application/${detectedExtension}` : void 0) : void 0,
      fileSize: options.fileResource ? options.fileResource.fileSize ?? fileDataSize : void 0,
      warnings: warnings.length > 0 ? warnings : void 0,
      errors: errors.length > 0 ? errors : []
    };
  } catch (unexpectedError) {
    return {
      success: false,
      content: null,
      slug,
      title: rawManifest?.title || null,
      topic: null,
      tagsCreated: 0,
      tagsAssociated: 0,
      relationshipsCreated: 0,
      fileUploaded: false,
      errors: [`Unexpected ingestion error: ${unexpectedError?.message || String(unexpectedError)}`]
    };
  }
}

// src/server/lib/supabaseServer.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var cachedServerClient = null;
function getServerSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    return null;
  }
  if (!cachedServerClient) {
    cachedServerClient = createClient2(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return cachedServerClient;
}

// src/server/controllers/ingestController.ts
async function handleContentIngestion(req, res) {
  const ingReq = req;
  if (ingReq.multipleFilesDetected || Array.isArray(req.body?.files) && req.body.files.length > 1 || Array.isArray(req.body?.file) && req.body.file.length > 1) {
    res.status(400).json({
      success: false,
      error: "Bad Request: Multiple files are not supported in Step 13. Only one file may be uploaded per ingestion request."
    });
    return;
  }
  let rawManifest = req.body;
  let fileResource = ingReq.fileResource || null;
  if (req.body && typeof req.body === "object" && "manifest" in req.body) {
    rawManifest = req.body.manifest;
    if (typeof rawManifest === "string") {
      try {
        rawManifest = JSON.parse(rawManifest);
      } catch {
        res.status(400).json({
          success: false,
          error: 'Bad Request: Field "manifest" contains invalid JSON string.'
        });
        return;
      }
    }
  }
  if (!fileResource && req.body && typeof req.body === "object") {
    if (req.body.file && typeof req.body.file === "object" && !Array.isArray(req.body.file)) {
      const f = req.body.file;
      fileResource = {
        fileName: f.fileName || f.file_name,
        fileType: f.fileType || f.file_type || f.contentType,
        fileSize: f.fileSize || f.file_size,
        data: f.data || f.content,
        filePath: f.filePath || f.file_path
      };
    } else if (req.body.file_data || req.body.file_content) {
      fileResource = {
        fileName: req.body.file_name,
        fileType: req.body.file_type,
        fileSize: req.body.file_size,
        data: req.body.file_data || req.body.file_content,
        filePath: req.body.file_path
      };
    }
  }
  if (rawManifest && typeof rawManifest === "object" && !Array.isArray(rawManifest)) {
    const { file, files, file_data, file_content, ...cleanManifest } = rawManifest;
    rawManifest = cleanManifest;
  }
  if (!rawManifest || typeof rawManifest !== "object" || Array.isArray(rawManifest) || Object.keys(rawManifest).length === 0) {
    res.status(400).json({
      success: false,
      error: "Bad Request: Request body must be a non-empty JSON object containing a ContentManifest."
    });
    return;
  }
  const validation = validateContentManifest(rawManifest);
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      error: "Bad Request: ContentManifest validation failed.",
      validationErrors: validation.errors
    });
    return;
  }
  const serverClient = getServerSupabaseClient();
  const isDryRun = req.query.dryRun === "true";
  if (!serverClient && !isDryRun) {
    res.status(503).json({
      success: false,
      error: "Service Unavailable: Server-side database connection is not configured."
    });
    return;
  }
  try {
    const result = await ingestContent(rawManifest, {
      client: serverClient || void 0,
      fileResource: fileResource || void 0,
      dryRun: isDryRun
    });
    if (!result.success && result.errors.some((e) => e.toLowerCase().includes("duplicate content error") || e.toLowerCase().includes("already exists"))) {
      res.status(409).json({
        success: false,
        error: "Conflict: A publication with this slug already exists.",
        slug: result.slug
      });
      return;
    }
    if (!result.success) {
      const isInputIssue = result.errors.some(
        (e) => e.includes("cannot be empty") || e.includes("Invalid") || e.includes("Unsupported") || e.includes("exceeds the maximum") || e.includes("must not contain") || e.includes("lacks a valid") || e.includes("Malformed file data") || e.includes("Missing file data") || e.includes("Self-relationship")
      );
      res.status(isInputIssue ? 400 : 500).json({
        success: false,
        error: isInputIssue ? "Bad Request: Invalid content manifest or file resource." : "Content ingestion encountered an error.",
        errors: result.errors
      });
      return;
    }
    const responsePayload = {
      success: true,
      contentId: result.content?.id || (isDryRun ? "dry-run-preview-id" : void 0),
      id: result.content?.id || (isDryRun ? "dry-run-preview-id" : void 0),
      slug: result.slug,
      title: result.title || rawManifest.title
    };
    if (result.fileUploaded || result.filePath) {
      responsePayload.fileUploaded = true;
      responsePayload.fileName = result.fileName;
      responsePayload.fileType = result.fileType;
      responsePayload.fileSize = result.fileSize;
      responsePayload.storagePath = result.filePath;
      responsePayload.filePath = result.filePath;
    }
    res.status(201).json(responsePayload);
  } catch (err) {
    console.error("[ingestController] Ingestion error:", err?.message || "Unknown error");
    res.status(500).json({
      success: false,
      error: "Internal Server Error: Failed to complete content ingestion."
    });
  }
}

// api/ingest/content.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed. Only POST requests are permitted for content ingestion."
    });
  }
  if (typeof req.body === "string" && !req.headers?.["content-type"]?.includes("multipart/form-data")) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Bad Request: Request body contains invalid JSON."
      });
    }
  }
  return authenticateIngestionRequest(req, res, () => {
    return parseMultipartIngestion(req, res, () => {
      return handleContentIngestion(req, res);
    });
  });
}
export {
  handler as default
};
