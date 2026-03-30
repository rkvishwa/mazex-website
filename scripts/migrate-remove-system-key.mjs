#!/usr/bin/env node
// scripts/migrate-remove-system-key.mjs
// Removes legacy primaryName / primaryEmail columns from registration_submissions.
// Also removes the systemKey attribute from registration_fields (no longer used).

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
const DB = env.APPWRITE_DB_ID;
const SUBS = env.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS || "registration_submissions";
const FLDS = env.APPWRITE_COLLECTION_REGISTRATION_FIELDS || "registration_fields";

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function attrStatus(colId, key) {
  try {
    const attribute = await db.getAttribute(DB, colId, key);
    return attribute.status;
  } catch (error) {
    if (error?.code === 404) return null;
    throw error;
  }
}

async function waitDeleted(colId, key, label) {
  process.stdout.write(`  ⏳ waiting for ${label} to be deleted`);
  for (let index = 0; index < 30; index++) {
    const status = await attrStatus(colId, key);
    if (status === null) {
      process.stdout.write(" ✓\n");
      return;
    }
    process.stdout.write(".");
    await sleep(2000);
  }
  process.stdout.write(" ⚠ timed out\n");
}

async function removeAttr(colId, key, label) {
  const current = await attrStatus(colId, key);
  if (current === null) {
    console.log(`  · ${label} already absent`);
    return;
  }

  console.log(`  🗑  removing ${label}`);
  try {
    await db.deleteAttribute(DB, colId, key);
  } catch (error) {
    if (error?.code !== 404) throw error;
  }

  await waitDeleted(colId, key, label);
}

console.log("\n🔧  Registration schema migration\n");

console.log("📋  registration_submissions");
await removeAttr(SUBS, "primaryName", "primaryName");
await removeAttr(SUBS, "primaryEmail", "primaryEmail");

console.log("\n📋  registration_fields");
await removeAttr(FLDS, "systemKey", "systemKey");

console.log("\n✅  Migration complete.\n");
