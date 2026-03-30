#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(__dirname, "../.env");
const functionEnvPath = resolve(
  __dirname,
  "../functions/send-registration-confirmation-email/.env",
);

const REQUIRED_KEYS = [
  "REGISTRATION_CONFIRMATION_EMAIL_SMTP_HOST",
  "REGISTRATION_CONFIRMATION_EMAIL_SMTP_PORT",
  "REGISTRATION_CONFIRMATION_EMAIL_SMTP_SECURE",
  "REGISTRATION_CONFIRMATION_EMAIL_FROM",
];

const OPTIONAL_KEYS = [
  "APPWRITE_DB_ID",
  "APPWRITE_COLLECTION_REGISTRATION_FORMS",
  "APPWRITE_COLLECTION_REGISTRATION_FIELDS",
  "APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS",
  "REGISTRATION_CONFIRMATION_EMAIL_SMTP_USER",
  "REGISTRATION_CONFIRMATION_EMAIL_SMTP_PASS",
  "REGISTRATION_CONFIRMATION_EMAIL_REPLY_TO",
];

function parseEnvFile(source) {
  const env = {};

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function serializeEnvValue(value) {
  if (!value) return "";
  if (/^[A-Za-z0-9_./:@+-]+$/u.test(value)) return value;
  return JSON.stringify(value);
}

const fileEnv = existsSync(rootEnvPath)
  ? parseEnvFile(readFileSync(rootEnvPath, "utf8"))
  : {};
const rootEnv = { ...fileEnv, ...process.env };

const missingKeys = REQUIRED_KEYS.filter((key) => !rootEnv[key]?.trim());
if (missingKeys.length > 0) {
  console.error(
    `Missing required env values for the registration confirmation function: ${missingKeys.join(", ")}`,
  );
  process.exit(1);
}

const functionEnv = {
  APPWRITE_DB_ID: rootEnv.APPWRITE_DB_ID?.trim() || "mazex_data",
  APPWRITE_COLLECTION_REGISTRATION_FORMS:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_FORMS?.trim() ||
    "registration_forms",
  APPWRITE_COLLECTION_REGISTRATION_FIELDS:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_FIELDS?.trim() ||
    "registration_fields",
  APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS?.trim() ||
    "registration_submissions",
};

for (const key of [...REQUIRED_KEYS, ...OPTIONAL_KEYS]) {
  if (!rootEnv[key]) continue;
  functionEnv[key] = rootEnv[key].trim();
}

mkdirSync(dirname(functionEnvPath), { recursive: true });

const envFileContents = Object.entries(functionEnv)
  .map(([key, value]) => `${key}=${serializeEnvValue(value)}`)
  .join("\n");

writeFileSync(functionEnvPath, `${envFileContents}\n`, "utf8");

console.log(`Wrote Appwrite function env: ${functionEnvPath}`);
