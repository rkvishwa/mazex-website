#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, ExecutionMethod, Functions } from "node-appwrite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const rootEnvPath = resolve(rootDir, ".env");
const functionId =
  process.env.APPWRITE_FUNCTION_RESEND_CONTACTS_ID?.trim() ||
  "registration_resend_contacts";
const batchSize = Math.max(
  1,
  Math.min(25, Number.parseInt(process.argv[2] || process.env.RESEND_BACKFILL_BATCH_SIZE || "5", 10) || 5),
);
const maxBatches = Math.max(
  1,
  Number.parseInt(process.argv[3] || process.env.RESEND_BACKFILL_MAX_BATCHES || "20", 10) || 20,
);
const pollIntervalMs = 1500;
const executionTimeoutMs = 120000;
const backfillSummaryLogPrefix = "BACKFILL_SUMMARY ";

function parseEnvFile(filePath) {
  const env = {};

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
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

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResponse(responseBody) {
  const normalized = trim(responseBody);
  if (!normalized) {
    throw new Error("The Resend contacts function returned an empty response.");
  }

  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("The Resend contacts function returned an invalid JSON object.");
    }

    return parsed;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to parse the Resend contacts function response.",
    );
  }
}

function parseResponseOrNull(responseBody) {
  const normalized = trim(responseBody);
  if (!normalized) {
    return null;
  }

  return parseResponse(normalized);
}

function parseBackfillSummaryFromLogs(logs) {
  const lines = trim(logs).split(/\r?\n/u).reverse();

  for (const line of lines) {
    const normalized = trim(line);
    if (!normalized.startsWith(backfillSummaryLogPrefix)) {
      continue;
    }

    return parseResponse(normalized.slice(backfillSummaryLogPrefix.length));
  }

  return null;
}

async function waitForExecutionCompletion(params) {
  const timeoutAt = Date.now() + executionTimeoutMs;

  while (Date.now() < timeoutAt) {
    const execution = await params.functions.getExecution({
      functionId: params.functionId,
      executionId: params.executionId,
    });

    if (["completed", "failed", "canceled"].includes(execution.status)) {
      return execution;
    }

    await delay(pollIntervalMs);
  }

  throw new Error("Timed out while waiting for the Resend contacts backfill execution to finish.");
}

const env = parseEnvFile(rootEnvPath);
const endpoint = env.APPWRITE_ENDPOINT?.trim();
const projectId = env.APPWRITE_PROJECT_ID?.trim();
const apiKey = env.APPWRITE_API_KEY?.trim();

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY.");
  process.exit(1);
}

const functions = new Functions(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
);

let cursorAfter = "";
let totalProcessed = 0;
let totalSynced = 0;
let totalSkipped = 0;
let totalFailed = 0;
let hasMore = false;

for (let index = 0; index < maxBatches; index += 1) {
  const execution = await functions.createExecution({
    functionId,
    async: true,
    method: ExecutionMethod.POST,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "sync-existing-submissions",
      batchSize,
      cursorAfter,
    }),
  });
  const completedExecution = await waitForExecutionCompletion({
    functions,
    functionId,
    executionId: execution.$id,
  });

  const response =
    parseResponseOrNull(completedExecution.responseBody || "") ||
    parseBackfillSummaryFromLogs(completedExecution.logs || "");
  const fallbackMessage =
    trim(response?.message) ||
    trim(completedExecution.errors) ||
    trim(completedExecution.responseBody) ||
    trim(completedExecution.logs) ||
    "The Resend contacts function did not return a usable response.";

  if (
    completedExecution.status !== "completed" ||
    completedExecution.responseStatusCode >= 400 ||
    !response?.ok
  ) {
    throw new Error(fallbackMessage);
  }

  const processedCount = getNumber(response.processedCount);
  const syncedCount = getNumber(response.syncedCount);
  const skippedCount = getNumber(response.skippedCount);
  const failedCount = getNumber(response.failedCount);

  totalProcessed += processedCount;
  totalSynced += syncedCount;
  totalSkipped += skippedCount;
  totalFailed += failedCount;
  hasMore = Boolean(response.hasMore);
  cursorAfter = trim(response.nextCursor);

  console.log(
    `Batch ${index + 1}: processed ${processedCount}, synced ${syncedCount}, skipped ${skippedCount}, failed ${failedCount}.`,
  );

  if (!hasMore || !cursorAfter) {
    break;
  }
}

console.log("");
console.log("Registration Resend backfill complete.");
console.log(`Processed submissions: ${totalProcessed}`);
console.log(`Synced submissions: ${totalSynced}`);
console.log(`Skipped submissions: ${totalSkipped}`);
console.log(`Failed submissions: ${totalFailed}`);
console.log(`More submissions remaining: ${hasMore && Boolean(cursorAfter) ? "yes" : "no"}`);
console.log(`Batch size used: ${batchSize}`);
