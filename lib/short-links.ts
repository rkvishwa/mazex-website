import "server-only";

import {
  AppwriteException,
  Databases,
  ID,
  Models,
  Query,
} from "node-appwrite";
import { unstable_noStore as noStore } from "next/cache";
import {
  AppwriteConfigError,
  createAppwriteAdminClient,
  isAppwriteConfigured,
} from "@/lib/appwrite";
import type {
  ShortLinkStatus,
  ShortLinkSummary,
} from "@/lib/short-link-types";

const DEFAULT_SHORT_LINKS_COLLECTION_ID = "short_links";
const MAX_SHORT_CODE_LENGTH = 64;
const AUTO_SHORT_CODE_LENGTH = 7;
const AUTO_SHORT_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const MAX_GENERATION_ATTEMPTS = 20;
const APP_URL_ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "APP_URL"] as const;

type ShortLinkDoc = Models.Document & {
  shortCode?: string;
  destinationUrl?: string;
  expiresAt?: string | null;
  isActive?: boolean;
  visitCount?: number;
  lastVisitedAt?: string | null;
  createdByAdminUserId?: string;
};

export class ShortLinkValidationError extends Error {
  code:
    | "invalid_url"
    | "recursive_url"
    | "invalid_short_code"
    | "invalid_expiry"
    | "past_expiry";

  constructor(
    code: ShortLinkValidationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "ShortLinkValidationError";
    this.code = code;
  }
}

export class ShortLinkConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShortLinkConflictError";
  }
}

function createDatabasesService() {
  return new Databases(createAppwriteAdminClient());
}

function trim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function trimNullable(value: unknown) {
  const trimmedValue = trim(value);
  return trimmedValue || null;
}

function getShortLinksConfig() {
  const databaseId = process.env.APPWRITE_DB_ID?.trim();
  const collectionId =
    process.env.APPWRITE_COLLECTION_SHORT_LINKS?.trim() ||
    DEFAULT_SHORT_LINKS_COLLECTION_ID;

  if (!databaseId) {
    throw new AppwriteConfigError(
      "Missing required Appwrite environment variable: APPWRITE_DB_ID",
    );
  }

  return {
    databaseId,
    collectionId,
  };
}

function isShortLinksConfigured() {
  try {
    getShortLinksConfig();
    return true;
  } catch {
    return false;
  }
}

function getConfiguredAppOrigins() {
  const origins = new Set<string>();

  for (const envKey of APP_URL_ENV_KEYS) {
    const value = trim(process.env[envKey]);
    if (!value) {
      continue;
    }

    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore invalid app URL config and continue with what we can trust.
    }
  }

  return origins;
}

function isRecursiveShortLinkTarget(url: URL) {
  const configuredOrigins = getConfiguredAppOrigins();
  if (!configuredOrigins.has(url.origin)) {
    return false;
  }

  const pathname = url.pathname.toLowerCase();
  return pathname === "/url" || pathname.startsWith("/url/");
}

export function normalizeShortLinkDestination(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (isRecursiveShortLinkTarget(url)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeShortCodeInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = trimmedValue
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalizedValue || normalizedValue.length > MAX_SHORT_CODE_LENGTH) {
    return null;
  }

  return normalizedValue;
}

function getShortLinkStatusFromValues(
  isActive: boolean,
  expiresAt: string | null,
  now = Date.now(),
): ShortLinkStatus {
  if (!isActive) {
    return "inactive";
  }

  if (!expiresAt) {
    return "active";
  }

  const expiresAtTimestamp = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtTimestamp)) {
    return "inactive";
  }

  return expiresAtTimestamp <= now ? "expired" : "active";
}

export function getShortLinkStatus(
  shortLink: Pick<ShortLinkSummary, "isActive" | "expiresAt">,
  now = Date.now(),
) {
  return getShortLinkStatusFromValues(
    shortLink.isActive,
    shortLink.expiresAt,
    now,
  );
}

function mapShortLinkDoc(doc: ShortLinkDoc): ShortLinkSummary | null {
  const shortCode = trim(doc.shortCode);
  const destinationUrl = trim(doc.destinationUrl);
  const createdByAdminUserId = trim(doc.createdByAdminUserId);

  if (!shortCode || !destinationUrl || !createdByAdminUserId) {
    return null;
  }

  const expiresAt = trimNullable(doc.expiresAt);
  const isActive = doc.isActive !== false;
  const visitCount =
    typeof doc.visitCount === "number" && Number.isFinite(doc.visitCount)
      ? Math.max(0, doc.visitCount)
      : 0;

  return {
    id: doc.$id,
    shortCode,
    destinationUrl,
    expiresAt,
    isActive,
    status: getShortLinkStatusFromValues(isActive, expiresAt),
    visitCount,
    lastVisitedAt: trimNullable(doc.lastVisitedAt),
    createdByAdminUserId,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

function generateRandomShortCode() {
  let value = "";

  for (let index = 0; index < AUTO_SHORT_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(
      Math.random() * AUTO_SHORT_CODE_ALPHABET.length,
    );
    value += AUTO_SHORT_CODE_ALPHABET[randomIndex];
  }

  return value;
}

async function findShortLinkDocumentByCode(shortCode: string) {
  const { collectionId, databaseId } = getShortLinksConfig();
  const result = await createDatabasesService().listDocuments<ShortLinkDoc>(
    databaseId,
    collectionId,
    [Query.equal("shortCode", shortCode), Query.limit(1)],
  );

  return result.documents[0] ?? null;
}

async function getShortLinkDocumentById(linkId: string) {
  const trimmedLinkId = linkId.trim();
  if (!trimmedLinkId) {
    throw new Error("Short link ID is required.");
  }

  const { collectionId, databaseId } = getShortLinksConfig();
  return createDatabasesService().getDocument<ShortLinkDoc>(
    databaseId,
    collectionId,
    trimmedLinkId,
  );
}

async function ensureAvailableShortCode(requestedShortCode: string | null) {
  if (requestedShortCode) {
    if (await findShortLinkDocumentByCode(requestedShortCode)) {
      throw new ShortLinkConflictError(
        "That short name is already in use. Choose a different one.",
      );
    }

    return {
      shortCode: requestedShortCode,
      generated: false,
    };
  }

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = generateRandomShortCode();
    const existingDocument = await findShortLinkDocumentByCode(candidate);

    if (!existingDocument) {
      return {
        shortCode: candidate,
        generated: true,
      };
    }
  }

  throw new Error(
    "Unable to generate a unique short link right now. Please try again.",
  );
}

function normalizeExpiry(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return null;
  }

  const parsedDate = new Date(expiresAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ShortLinkValidationError(
      "invalid_expiry",
      "Enter a valid expiry date and time.",
    );
  }

  if (parsedDate.getTime() <= Date.now()) {
    throw new ShortLinkValidationError(
      "past_expiry",
      "Expiry must be in the future.",
    );
  }

  return parsedDate.toISOString();
}

function normalizeValidatedDestinationUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new ShortLinkValidationError(
      "invalid_url",
      "Enter a destination URL to shorten.",
    );
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new ShortLinkValidationError(
        "invalid_url",
        "Only http and https URLs can be shortened.",
      );
    }

    if (isRecursiveShortLinkTarget(parsedUrl)) {
      throw new ShortLinkValidationError(
        "recursive_url",
        "Short links cannot point to another /url/... link on this site.",
      );
    }

    return parsedUrl.toString();
  } catch (error) {
    if (error instanceof ShortLinkValidationError) {
      throw error;
    }

    throw new ShortLinkValidationError(
      "invalid_url",
      "Enter a valid http or https URL.",
    );
  }
}

export async function listShortLinks(limit = 100) {
  noStore();

  if (!isAppwriteConfigured() || !isShortLinksConfigured()) {
    return [] as ShortLinkSummary[];
  }

  try {
    const { collectionId, databaseId } = getShortLinksConfig();
    const result = await createDatabasesService().listDocuments<ShortLinkDoc>(
      databaseId,
      collectionId,
      [Query.orderDesc("$createdAt"), Query.limit(limit)],
    );

    return result.documents
      .map(mapShortLinkDoc)
      .filter((shortLink): shortLink is ShortLinkSummary => shortLink !== null);
  } catch (error) {
    if (error instanceof AppwriteException) {
      return [];
    }

    return [];
  }
}

export async function getShortLinkByCode(shortCode: string) {
  noStore();

  const normalizedShortCode = normalizeShortCodeInput(shortCode);
  if (
    !normalizedShortCode ||
    !isAppwriteConfigured() ||
    !isShortLinksConfigured()
  ) {
    return null;
  }

  try {
    const document = await findShortLinkDocumentByCode(normalizedShortCode);
    return document ? mapShortLinkDoc(document) : null;
  } catch {
    return null;
  }
}

export async function createShortLink(params: {
  destinationUrl: string;
  requestedShortCode?: string | null;
  expiresAt?: string | null;
  createdByAdminUserId: string;
}) {
  const normalizedDestinationUrl = normalizeValidatedDestinationUrl(
    params.destinationUrl,
  );
  const normalizedRequestedShortCode = params.requestedShortCode
    ? normalizeShortCodeInput(params.requestedShortCode)
    : null;

  if (params.requestedShortCode && !normalizedRequestedShortCode) {
    throw new ShortLinkValidationError(
      "invalid_short_code",
      "Short names can only use letters, numbers, and separators, up to 64 characters.",
    );
  }

  const normalizedExpiresAt = normalizeExpiry(params.expiresAt);
  const { collectionId, databaseId } = getShortLinksConfig();
  const { generated, shortCode } = await ensureAvailableShortCode(
    normalizedRequestedShortCode,
  );

  try {
    const document = await createDatabasesService().createDocument<ShortLinkDoc>(
      databaseId,
      collectionId,
      ID.unique(),
      {
        shortCode,
        destinationUrl: normalizedDestinationUrl,
        expiresAt: normalizedExpiresAt,
        isActive: true,
        visitCount: 0,
        lastVisitedAt: null,
        createdByAdminUserId: params.createdByAdminUserId,
      },
      [],
    );

    const shortLink = mapShortLinkDoc(document);

    if (!shortLink) {
      throw new Error("The short link was created but could not be read back.");
    }

    return {
      shortLink,
      generatedShortCode: generated,
    };
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      throw new ShortLinkConflictError(
        "That short name is already in use. Choose a different one.",
      );
    }

    throw error;
  }
}

export async function setShortLinkActiveState(params: {
  linkId: string;
  isActive: boolean;
}) {
  const { collectionId, databaseId } = getShortLinksConfig();
  const document = await createDatabasesService().updateDocument<ShortLinkDoc>(
    databaseId,
    collectionId,
    params.linkId.trim(),
    {
      isActive: params.isActive,
    },
  );

  const shortLink = mapShortLinkDoc(document);
  if (!shortLink) {
    throw new Error("The short link was updated but could not be read back.");
  }

  return shortLink;
}

export async function deleteShortLink(linkId: string) {
  const existingDocument = await getShortLinkDocumentById(linkId);
  const shortLink = mapShortLinkDoc(existingDocument);

  const { collectionId, databaseId } = getShortLinksConfig();
  await createDatabasesService().deleteDocument(
    databaseId,
    collectionId,
    linkId.trim(),
  );

  return shortLink;
}

export async function trackShortLinkVisit(shortLink: ShortLinkSummary) {
  if (shortLink.status !== "active") {
    return;
  }

  try {
    const { collectionId, databaseId } = getShortLinksConfig();
    await createDatabasesService().updateDocument(
      databaseId,
      collectionId,
      shortLink.id,
      {
        visitCount: shortLink.visitCount + 1,
        lastVisitedAt: new Date().toISOString(),
      },
    );
  } catch {
    // Redirects should still work even if analytics updates fail.
  }
}
