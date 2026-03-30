#!/usr/bin/env node
// scripts/check-appwrite-collections.mjs
// Inspect existing collections and their attributes

import { Client, Databases } from "node-appwrite";
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
const DB_ID = env.APPWRITE_DB_ID;

const cols = [
  env.APPWRITE_COLLECTION_REGISTRATION_FORMS || "registration_forms",
  env.APPWRITE_COLLECTION_REGISTRATION_FIELDS || "registration_fields",
  env.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS || "registration_submissions",
  env.APPWRITE_COLLECTION_REGISTRATION_UNIQUE_VALUES || "registration_unique_values",
];

for (const colId of cols) {
  try {
    const col = await db.getCollection(DB_ID, colId);
    console.log(`\n=== ${colId} (${col.attributes.length} attrs) ===`);
    for (const a of col.attributes) {
      console.log(`  ${a.status.padEnd(12)} ${a.type.padEnd(10)} ${a.key}`);
    }
    console.log(`  Indexes: ${col.indexes.map(i => i.key).join(", ") || "(none)"}`);
  } catch (e) {
    console.log(`\n=== ${colId}: NOT FOUND (${e.code}) ===`);
  }
}
