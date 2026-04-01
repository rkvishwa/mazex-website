#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(__dirname, "../.env");
const confirmationEnvPath = resolve(
  __dirname,
  "../functions/send-registration-confirmation-email/.env",
);
const googleSheetsEnvPath = resolve(
  __dirname,
  "../functions/sync-registration-to-google-sheets/.env",
);
const resendContactsEnvPath = resolve(
  __dirname,
  "../functions/sync-registration-contacts-to-resend/.env",
);

const CONFIRMATION_OPTIONAL_KEYS = [
  "APPWRITE_MESSAGING_EMAIL_PROVIDER_ID",
];

const GOOGLE_SHEETS_OPTIONAL_KEYS = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
];

const RESEND_CONTACTS_OPTIONAL_KEYS = [
  "APPWRITE_MESSAGING_EMAIL_PROVIDER_ID",
  "APPWRITE_BUCKET_EMAIL_ASSETS",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_REPLY_TO",
  "RESEND_MARKETING_FROM",
  "RESEND_MARKETING_REPLY_TO",
  "RESEND_SEGMENT_ALL_NAME",
  "RESEND_SEGMENT_COMPETITION_NAME",
  "RESEND_SEGMENT_WORKSHOP_NAME",
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

function writeFunctionEnv(targetPath, envValues) {
  mkdirSync(dirname(targetPath), { recursive: true });

  const envFileContents = Object.entries(envValues)
    .map(([key, value]) => `${key}=${serializeEnvValue(value)}`)
    .join("\n");

  writeFileSync(targetPath, `${envFileContents}\n`, "utf8");
  console.log(`Wrote Appwrite function env: ${targetPath}`);
}

const fileEnv = existsSync(rootEnvPath)
  ? parseEnvFile(readFileSync(rootEnvPath, "utf8"))
  : {};
const rootEnv = { ...fileEnv, ...process.env };

const sharedRegistrationEnv = {
  APPWRITE_DB_ID: rootEnv.APPWRITE_DB_ID?.trim() || "mazex_data",
  APPWRITE_COLLECTION_REGISTRATION_FORMS:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_FORMS?.trim() || "registration_forms",
  APPWRITE_COLLECTION_REGISTRATION_FIELDS:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_FIELDS?.trim() || "registration_fields",
  APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS?.trim() ||
    "registration_submissions",
  APPWRITE_COLLECTION_REGISTRATION_UNIQUE_VALUES:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_UNIQUE_VALUES?.trim() ||
    "registration_unique_values",
  APPWRITE_COLLECTION_REGISTRATION_CONTACTS:
    rootEnv.APPWRITE_COLLECTION_REGISTRATION_CONTACTS?.trim() ||
    "registration_contacts",
  APPWRITE_COLLECTION_GOOGLE_SHEETS_FORM_SYNCS:
    rootEnv.APPWRITE_COLLECTION_GOOGLE_SHEETS_FORM_SYNCS?.trim() ||
    "google_sheets_form_syncs",
  APPWRITE_COLLECTION_GOOGLE_SHEETS_CONNECTIONS:
    rootEnv.APPWRITE_COLLECTION_GOOGLE_SHEETS_CONNECTIONS?.trim() ||
    "google_sheets_connections",
  APPWRITE_BUCKET_REGISTRATION_FILES:
    rootEnv.APPWRITE_BUCKET_REGISTRATION_FILES?.trim() || "registration_files",
};

const confirmationFunctionEnv = {
  ...sharedRegistrationEnv,
  APPWRITE_BUCKET_EMAIL_ASSETS:
    rootEnv.APPWRITE_BUCKET_EMAIL_ASSETS?.trim() || "email_assets",
};

for (const key of CONFIRMATION_OPTIONAL_KEYS) {
  if (!rootEnv[key]) continue;
  confirmationFunctionEnv[key] = rootEnv[key].trim();
}

writeFunctionEnv(confirmationEnvPath, confirmationFunctionEnv);

const googleSheetsFunctionEnv = {
  ...sharedRegistrationEnv,
};

for (const key of GOOGLE_SHEETS_OPTIONAL_KEYS) {
  if (!rootEnv[key]) continue;
  googleSheetsFunctionEnv[key] = rootEnv[key].trim();
}

writeFunctionEnv(googleSheetsEnvPath, googleSheetsFunctionEnv);

const resendContactsFunctionEnv = {
  ...sharedRegistrationEnv,
  APPWRITE_BUCKET_EMAIL_ASSETS:
    rootEnv.APPWRITE_BUCKET_EMAIL_ASSETS?.trim() || "email_assets",
};

for (const key of RESEND_CONTACTS_OPTIONAL_KEYS) {
  if (!rootEnv[key]) continue;
  resendContactsFunctionEnv[key] = rootEnv[key].trim();
}

writeFunctionEnv(resendContactsEnvPath, resendContactsFunctionEnv);
