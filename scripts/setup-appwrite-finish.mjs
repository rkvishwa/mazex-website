#!/usr/bin/env node
// scripts/setup-appwrite-finish.mjs
// Adds missing indexes and the form_banners bucket.

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

const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const db = new Databases(client);
const storage = new Storage(client);
const DB_ID      = env.APPWRITE_DB_ID;
const FIELDS_COL = env.APPWRITE_COLLECTION_REGISTRATION_FIELDS  || "registration_fields";
const SUBS_COL   = env.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS || "registration_submissions";
const UNIQUE_VALUES_COL = env.APPWRITE_COLLECTION_REGISTRATION_UNIQUE_VALUES || "registration_unique_values";
const BUCKET_ID  = env.APPWRITE_BUCKET_FORM_BANNERS || "form_banners";
const FILES_BUCKET_ID = env.APPWRITE_BUCKET_REGISTRATION_FILES || "registration_files";
const REGISTRATION_FILE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "pdf", "doc", "docx"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safe(fn) {
  try { await fn(); }
  catch (e) {
    if (e?.code === 409) return;
    if (e?.code === 400 && String(e?.message).includes("already")) return;
    throw e;
  }
}

async function ensureCollection(id, name) {
  try {
    await db.getCollection(DB_ID, id);
    console.log(`  ✓ collection exists: ${name}`);
  } catch (e) {
    if (e?.code !== 404) throw e;
    await db.createCollection(DB_ID, id, name, [], false, true);
    console.log(`  + created collection: ${name}`);
  }
}

async function createAttrs(colId, attrs) {
  await Promise.all(attrs.map((attr) => safe(() => {
    if (attr.t === "str") return db.createStringAttribute(DB_ID, colId, attr.key, attr.size ?? 255, attr.req ?? false, attr.def ?? null, false);
    if (attr.t === "bool") return db.createBooleanAttribute(DB_ID, colId, attr.key, attr.req ?? false, attr.def ?? false);
  })));
  console.log(`  ✓ verified ${attrs.length} attributes on ${colId}`);
}

async function waitAvailable(colId, keys) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const col = await db.getCollection(DB_ID, colId);
    const ready = new Set(col.attributes.filter((attr) => attr.status === "available").map((attr) => attr.key));
    if (keys.every((key) => ready.has(key))) return;
    await sleep(2000);
  }
  console.log(`  ⚠ attribute readiness timed out for ${colId}`);
}

async function ensureIndex(colId, key, type, attributes) {
  try {
    await db.getIndex(DB_ID, colId, key);
    console.log(`  ✓ index exists: ${key} on ${colId}`);
  } catch(e) {
    if (e?.code !== 404) throw e;
    await db.createIndex(DB_ID, colId, key, type, attributes);
    console.log(`  + created index: ${key} on ${colId}`);
  }
}

async function ensureBucket(id, name) {
  try {
    await storage.getBucket(id);
    console.log(`  ✓ bucket exists: ${name}`);
  } catch(e) {
    if (e?.code !== 404) throw e;
    await storage.createBucket(
      id, name,
      ['read("any")'],
      false, true,
      5 * 1024 * 1024,
      ["png", "jpg", "jpeg", "webp", "avif"],
      "gzip", true, true,
    );
    console.log(`  + created bucket: ${name}`);
  }
}

async function ensureRegistrationFilesBucket(id) {
  try {
    await storage.getBucket(id);
    console.log(`  ✓ bucket exists: Registration Files`);
  } catch(e) {
    if (e?.code !== 404) throw e;
    await storage.createBucket(
      id,
      "Registration Files",
      [],
      false,
      true,
      10 * 1024 * 1024,
      REGISTRATION_FILE_EXTENSIONS,
      "gzip",
      true,
      true,
    );
    console.log(`  + created bucket: Registration Files`);
  }
}

console.log("\n🔧  Finishing Appwrite setup\n");

// Add missing field metadata attributes and indexes
await createAttrs(FIELDS_COL, [
  { t:"str", key:"placeholder", size:512 },
  { t:"str", key:"helpText", size:2048 },
  { t:"bool", key:"isUnique", def:false },
  { t:"bool", key:"uniqueCaseSensitive", def:false },
]);
await waitAvailable(FIELDS_COL, ["placeholder", "helpText", "isUnique", "uniqueCaseSensitive"]);
await ensureIndex(FIELDS_COL, "by_form", "key", ["formId"]);
await ensureIndex(SUBS_COL,   "by_form", "key", ["formId"]);

// Create the unique-value reservation collection if needed
await ensureCollection(UNIQUE_VALUES_COL, "Registration Unique Values");
await createAttrs(UNIQUE_VALUES_COL, [
  { t:"str", key:"formId", size:255, req:true },
  { t:"str", key:"fieldId", size:255, req:true },
  { t:"str", key:"valueHash", size:128, req:true },
  { t:"str", key:"valuePreview", size:255 },
  { t:"str", key:"submissionId", size:255 },
]);
await waitAvailable(UNIQUE_VALUES_COL, ["formId", "fieldId", "valueHash", "valuePreview", "submissionId"]);
await ensureIndex(UNIQUE_VALUES_COL, "by_form", "key", ["formId"]);
await ensureIndex(UNIQUE_VALUES_COL, "by_field", "key", ["fieldId"]);
await ensureIndex(UNIQUE_VALUES_COL, "unique_field_value", "unique", ["fieldId", "valueHash"]);

// Create form_banners bucket
await ensureBucket(BUCKET_ID, "Form Banners");
await ensureRegistrationFilesBucket(FILES_BUCKET_ID);

console.log("\n✅  Done — Appwrite schema is fully ready.\n");
