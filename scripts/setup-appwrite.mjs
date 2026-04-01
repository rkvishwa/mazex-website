#!/usr/bin/env node
// scripts/setup-appwrite.mjs
// Run: node scripts/setup-appwrite.mjs

import { Client, Databases, Storage } from "node-appwrite";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(resolve(__dirname, "../.env"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const ENDPOINT   = env.APPWRITE_ENDPOINT;
const PROJECT_ID = env.APPWRITE_PROJECT_ID;
const API_KEY    = env.APPWRITE_API_KEY;
const DB_ID      = env.APPWRITE_DB_ID;
const FORMS_COL  = env.APPWRITE_COLLECTION_REGISTRATION_FORMS   || "registration_forms";
const FIELDS_COL = env.APPWRITE_COLLECTION_REGISTRATION_FIELDS  || "registration_fields";
const SUBS_COL   = env.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS || "registration_submissions";
const UNIQUE_VALUES_COL = env.APPWRITE_COLLECTION_REGISTRATION_UNIQUE_VALUES || "registration_unique_values";
const BUCKET_ID  = env.APPWRITE_BUCKET_FORM_BANNERS             || "form_banners";
const FILES_BUCKET_ID = env.APPWRITE_BUCKET_REGISTRATION_FILES  || "registration_files";
const REGISTRATION_FILE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "pdf", "doc", "docx"];

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DB_ID) {
  console.error("❌  Missing required Appwrite env vars"); process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);
const storage = new Storage(client);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safe(fn) {
  try { await fn(); }
  catch (e) {
    if (e?.code === 409) return;   // already exists — fine
    if (e?.code === 400 && String(e?.message).includes("already")) return;
    if (e?.type === "attribute_limit_exceeded") return; // ignore if MariaDB limits hit on existing table
    throw e;
  }
}

async function ensureCollection(id, name) {
  try {
    await db.getCollection(DB_ID, id);
    console.log(`  ✓ exists  ${name}`);
  } catch(e) {
    if (e?.code !== 404) throw e;
    await db.createCollection(DB_ID, id, name, [], false, true);
    console.log(`  + created ${name}`);
  }
}

// Create ALL attributes in parallel, ignoring 409s.
async function createAttrs(colId, attrs) {
  await Promise.all(attrs.map(a => safe(() => {
    if (a.t === "str")  return db.createStringAttribute( DB_ID, colId, a.key, a.size ?? 255, a.req ?? false, a.def ?? null, false);
    if (a.t === "int")  return db.createIntegerAttribute(DB_ID, colId, a.key, a.req ?? false, a.min ?? null, a.max ?? null, a.def ?? null);
    if (a.t === "bool") return db.createBooleanAttribute(DB_ID, colId, a.key, a.req ?? false, a.def ?? false);
  })));
  console.log(`    created/verified ${attrs.length} attributes`);
}

// Poll until all listed attributes are in "available" state (max 60 s).
async function waitAvailable(colId, keys) {
  const deadline = Date.now() + 60_000;
  process.stdout.write("    waiting for attributes to be ready");
  while (Date.now() < deadline) {
    const col = await db.getCollection(DB_ID, colId);
    const ready = new Set(col.attributes.filter(a => a.status === "available").map(a => a.key));
    if (keys.every(k => ready.has(k))) { process.stdout.write(" ✓\n"); return; }
    process.stdout.write(".");
    await sleep(2000);
  }
  process.stdout.write(" ⚠ timed out\n");
}

async function ensureIndex(colId, key, type, attributes) {
  await safe(async () => {
    try { await db.getIndex(DB_ID, colId, key); return; } catch(e) { if (e?.code !== 404) throw e; }
    await db.createIndex(DB_ID, colId, key, type, attributes);
    console.log(`    + index: ${key}`);
  });
}

async function ensureBucket(id, name) {
  try {
    await storage.getBucket(id);
    console.log(`  ✓ exists  bucket ${name}`);
  } catch(e) {
    if (e?.code !== 404) throw e;
    await storage.createBucket(id, name, ['read("any")'], false, true, 5*1024*1024, ["png","jpg","jpeg","webp","avif"], "gzip", true, true);
    console.log(`  + created bucket ${name}`);
  }
}

// ─── Schema definitions ───────────────────────────────────────────────────────

console.log("\n🔧  Appwrite registration schema setup\n");

// 1. registration_forms
console.log("📋  registration_forms");
await ensureCollection(FORMS_COL, "Registration Forms");
const formAttrs = [
  { t:"str",  key:"slug",           size:128,   req:true  },
  { t:"str",  key:"title",          size:255,   req:true  },
  { t:"str",  key:"description",    size:1024              },
  { t:"str",  key:"kind",           size:32,    req:true  },
  { t:"str",  key:"status",         size:32,    req:true  },
  { t:"str",  key:"openAt",         size:64                },
  { t:"str",  key:"closeAt",        size:64                },
  { t:"str",  key:"successMessage", size:4096              },
  { t:"bool", key:"confirmationEmailEnabled",               def:false },
  { t:"str",  key:"confirmationEmailTemplate", size:8192               },
  { t:"str",  key:"confirmationEmailFieldId", size:255                 },
  { t:"str",  key:"confirmationNameFieldId",  size:255                 },
  { t:"int",  key:"teamMinMembers", min:1, max:50, def:1  },
  { t:"int",  key:"teamMaxMembers", min:1, max:50, def:1  },
  { t:"str",  key:"bannerFileId",   size:255               },
  { t:"int",  key:"sortOrder",      min:0, max:2147483647, def:0 },
];
await createAttrs(FORMS_COL, formAttrs);
await waitAvailable(FORMS_COL, formAttrs.map(a => a.key));
await ensureIndex(FORMS_COL, "slug_unique", "unique", ["slug"]);

// 2. registration_fields
console.log("\n📋  registration_fields");
await ensureCollection(FIELDS_COL, "Registration Fields");
const fieldAttrs = [
  { t:"str",  key:"formId",         size:255,  req:true  },
  { t:"str",  key:"scope",          size:32,   req:true  },
  { t:"str",  key:"key",            size:128,  req:true  },
  { t:"str",  key:"label",          size:255,  req:true  },
  { t:"str",  key:"type",           size:32,   req:true  },
  { t:"bool", key:"required",                  def:false },
  { t:"int",  key:"sortOrder",      min:0, max:2147483647, def:0 },
  { t:"str",  key:"optionsJson",    size:8192              },
  { t:"str",  key:"placeholder",    size:512               },
  { t:"str",  key:"helpText",       size:2048              },
  { t:"bool", key:"isUnique",                  def:false },
  { t:"bool", key:"uniqueCaseSensitive",       def:false },
];
await createAttrs(FIELDS_COL, fieldAttrs);
await waitAvailable(FIELDS_COL, fieldAttrs.map(a => a.key));
await ensureIndex(FIELDS_COL, "by_form", "key", ["formId"]);

// 3. registration_submissions
console.log("\n📋  registration_submissions");
await ensureCollection(SUBS_COL, "Registration Submissions");
const subAttrs = [
  { t:"str", key:"formId",            size:255,   req:true },
  { t:"str", key:"teamName",          size:255             },
  { t:"str", key:"answersJson",       size:16384, req:true },
  { t:"str", key:"memberAnswersJson", size:32768           },
  { t:"str", key:"searchText",        size:4096            },
];
await createAttrs(SUBS_COL, subAttrs);
await waitAvailable(SUBS_COL, subAttrs.map(a => a.key));
await ensureIndex(SUBS_COL, "by_form", "key", ["formId"]);

// 4. registration_unique_values
console.log("\n📋  registration_unique_values");
await ensureCollection(UNIQUE_VALUES_COL, "Registration Unique Values");
const uniqueValueAttrs = [
  { t:"str", key:"formId",       size:255, req:true },
  { t:"str", key:"fieldId",      size:255, req:true },
  { t:"str", key:"valueHash",    size:128, req:true },
  { t:"str", key:"valuePreview", size:255           },
  { t:"str", key:"submissionId", size:255           },
];
await createAttrs(UNIQUE_VALUES_COL, uniqueValueAttrs);
await waitAvailable(UNIQUE_VALUES_COL, uniqueValueAttrs.map(a => a.key));
await ensureIndex(UNIQUE_VALUES_COL, "by_form", "key", ["formId"]);
await ensureIndex(UNIQUE_VALUES_COL, "by_field", "key", ["fieldId"]);
await ensureIndex(UNIQUE_VALUES_COL, "unique_field_value", "unique", ["fieldId", "valueHash"]);

// 5. form_banners bucket
console.log("\n🗂️   form_banners bucket");
await ensureBucket(BUCKET_ID, "Form Banners");

// 6. registration_files bucket
console.log("\n🗂️   registration_files bucket");
try {
  await storage.getBucket(FILES_BUCKET_ID);
  console.log(`  ✓ exists  bucket Registration Files`);
} catch(e) {
  if (e?.code !== 404) throw e;
  // Permissions: [] (empty) means only the server (which uses API key) can read/list.
  await storage.createBucket(
    FILES_BUCKET_ID,
    "Registration Files",
    [],
    false,
    true,
    10*1024*1024,
    REGISTRATION_FILE_EXTENSIONS,
    "gzip",
    true,
    true,
  );
  console.log(`  + created bucket Registration Files`);
}

console.log("\n✅  Done — registration schema is ready.\n");
