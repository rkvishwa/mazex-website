import "server-only";

import { AppwriteException, ExecutionMethod, Functions } from "node-appwrite";
import { createAppwriteAdminClient } from "@/lib/appwrite";
import type { RegistrationContactSegmentKey } from "@/lib/registration-contact-segments";

const DEFAULT_RESEND_CONTACTS_FUNCTION_ID = "registration_resend_contacts";
const BACKFILL_EXECUTION_POLL_INTERVAL_MS = 1500;
const BACKFILL_EXECUTION_TIMEOUT_MS = 120000;
const BACKFILL_SUMMARY_LOG_PREFIX = "BACKFILL_SUMMARY ";

type ResendContactsExecutionResponse = {
  ok?: boolean;
  message?: string;
};

type ContactBroadcastExecutionResponse = ResendContactsExecutionResponse & {
  broadcastId?: string;
  segmentKey?: RegistrationContactSegmentKey;
  segmentName?: string;
};

type ContactBackfillExecutionResponse = ResendContactsExecutionResponse & {
  processedCount?: number;
  syncedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export class ContactBroadcastConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactBroadcastConfigError";
  }
}

function trim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getContactBroadcastConfig() {
  return {
    functionId:
      process.env.APPWRITE_FUNCTION_RESEND_CONTACTS_ID?.trim() ||
      DEFAULT_RESEND_CONTACTS_FUNCTION_ID,
  };
}

function parseExecutionResponseBody<T extends ResendContactsExecutionResponse>(
  responseBody: string,
): T | null {
  const normalized = trim(responseBody);
  if (!normalized) return null;

  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

function getExecutionErrorMessage(error: unknown) {
  if (error instanceof AppwriteException) {
    return error.message || "Appwrite could not execute the Resend contact function.";
  }

  if (error instanceof ContactBroadcastConfigError) {
    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "Unable to send the marketing broadcast right now.";
}

function getNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBackfillSummaryFromLogs(logs: string) {
  const lines = trim(logs).split(/\r?\n/u).reverse();

  for (const line of lines) {
    const normalized = trim(line);
    if (!normalized.startsWith(BACKFILL_SUMMARY_LOG_PREFIX)) {
      continue;
    }

    const payload = normalized.slice(BACKFILL_SUMMARY_LOG_PREFIX.length);
    const parsed = parseExecutionResponseBody<ContactBackfillExecutionResponse>(payload);
    if (parsed?.ok) {
      return parsed;
    }
  }

  return null;
}

async function executeResendContactsFunction<T extends ResendContactsExecutionResponse>(
  body: Record<string, unknown>,
) {
  const { functionId } = getContactBroadcastConfig();
  const functions = new Functions(createAppwriteAdminClient());
  const execution = await functions.createExecution({
    functionId,
    async: false,
    method: ExecutionMethod.POST,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const response = parseExecutionResponseBody<T>(execution.responseBody);
  const fallbackMessage =
    response?.message ||
    trim(execution.errors) ||
    trim(execution.responseBody) ||
    "The Resend contact function did not return a usable response.";

  if (
    execution.status !== "completed" ||
    execution.responseStatusCode >= 400 ||
    !response?.ok
  ) {
    throw new Error(fallbackMessage);
  }

  return response;
}

async function waitForExecutionCompletion(params: {
  functions: Functions;
  functionId: string;
  executionId: string;
  timeoutMs?: number;
}) {
  const timeoutAt = Date.now() + (params.timeoutMs ?? BACKFILL_EXECUTION_TIMEOUT_MS);

  while (Date.now() < timeoutAt) {
    const execution = await params.functions.getExecution({
      functionId: params.functionId,
      executionId: params.executionId,
    });

    if (["completed", "failed", "canceled"].includes(execution.status)) {
      return execution;
    }

    await delay(BACKFILL_EXECUTION_POLL_INTERVAL_MS);
  }

  throw new Error(
    "Timed out while waiting for the Resend contacts backfill execution to finish.",
  );
}

export async function sendRegistrationContactBroadcast(params: {
  segmentKey: RegistrationContactSegmentKey;
  subject: string;
  content: string;
}) {
  const subject = trim(params.subject);
  const content = trim(params.content);

  if (!subject) {
    throw new Error("Enter an email subject.");
  }

  if (!content) {
    throw new Error("Enter the email content.");
  }

  const response = await executeResendContactsFunction<ContactBroadcastExecutionResponse>({
    action: "send-broadcast",
    segmentKey: params.segmentKey,
    subject,
    content,
  });

  return {
    broadcastId: trim(response.broadcastId),
    segmentKey: (response.segmentKey || params.segmentKey) as RegistrationContactSegmentKey,
    segmentName: trim(response.segmentName) || null,
  };
}

export async function syncExistingRegistrationContacts(params?: {
  batchSize?: number;
  cursorAfter?: string | null;
}) {
  const { functionId } = getContactBroadcastConfig();
  const functions = new Functions(createAppwriteAdminClient());
  const execution = await functions.createExecution({
    functionId,
    async: true,
    method: ExecutionMethod.POST,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "sync-existing-submissions",
      batchSize: params?.batchSize ?? 5,
      cursorAfter: trim(params?.cursorAfter),
    }),
  });
  const completedExecution = await waitForExecutionCompletion({
    functions,
    functionId,
    executionId: execution.$id,
  });
  const response =
    parseExecutionResponseBody<ContactBackfillExecutionResponse>(
      completedExecution.responseBody,
    ) || parseBackfillSummaryFromLogs(completedExecution.logs);
  const fallbackMessage =
    response?.message ||
    trim(completedExecution.errors) ||
    trim(completedExecution.responseBody) ||
    trim(completedExecution.logs) ||
    "The Resend contact function did not return a usable response.";

  if (
    completedExecution.status !== "completed" ||
    completedExecution.responseStatusCode >= 400 ||
    !response?.ok
  ) {
    throw new Error(fallbackMessage);
  }

  return {
    processedCount: getNumericValue(response.processedCount),
    syncedCount: getNumericValue(response.syncedCount),
    skippedCount: getNumericValue(response.skippedCount),
    failedCount: getNumericValue(response.failedCount),
    nextCursor: trim(response.nextCursor) || null,
    hasMore: Boolean(response.hasMore),
  };
}

export { getExecutionErrorMessage };
