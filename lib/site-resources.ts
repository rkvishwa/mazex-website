import "server-only";

import { AppwriteException, Databases, Models } from "node-appwrite";
import {
  AppwriteConfigError,
  createAppwriteAdminClient,
  isAppwriteConfigured,
} from "@/lib/appwrite";

export const DELEGATE_BOOKLET_RESOURCE_KEY = "delegate_booklet";
export const DEFAULT_DELEGATE_BOOKLET_PATH =
  "/downloads/Delegate_booklet_dummy.pdf";
export const SPONSOR_OPENINGS_RESOURCE_KEY = "sponsor_openings_enabled";
export const DEFAULT_SPONSOR_OPENINGS_ENABLED = true;
export const GOOGLE_SHEETS_TRANSFER_ON_RECONNECT_RESOURCE_KEY =
  "gsheets_transfer_reconnect";
export const DEFAULT_GOOGLE_SHEETS_TRANSFER_ON_RECONNECT_ENABLED = true;

type SiteResourceDocument = Models.DefaultDocument & {
  key?: string;
  value?: string;
};

function createDatabasesService() {
  return new Databases(createAppwriteAdminClient());
}

function getSiteResourcesConfig() {
  const databaseId = process.env.APPWRITE_DB_ID?.trim();
  const collectionId = process.env.APPWRITE_COLLECTION_RESOURCES?.trim();

  const missingVariables = [
    !databaseId && "APPWRITE_DB_ID",
    !collectionId && "APPWRITE_COLLECTION_RESOURCES",
  ].filter(Boolean) as string[];

  if (missingVariables.length > 0) {
    throw new AppwriteConfigError(
      `Missing required Appwrite resource environment variables: ${missingVariables.join(", ")}`,
    );
  }

  return {
    databaseId: databaseId!,
    collectionId: collectionId!,
  };
}

function isSiteResourcesConfigured() {
  try {
    getSiteResourcesConfig();
    return true;
  } catch {
    return false;
  }
}

export function normalizeSiteResourceLink(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function parseSiteResourceBoolean(value: string | null, fallback: boolean) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  if (["true", "1", "yes", "on", "enabled"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "off", "disabled"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

export async function getSiteResourceValue(key: string) {
  if (!isAppwriteConfigured() || !isSiteResourcesConfigured()) {
    return null;
  }

  try {
    const { collectionId, databaseId } = getSiteResourcesConfig();
    const document = await createDatabasesService().getDocument<SiteResourceDocument>({
      databaseId,
      collectionId,
      documentId: key,
    });

    return typeof document.value === "string" ? document.value : null;
  } catch (error) {
    if (error instanceof AppwriteException) {
      return null;
    }

    return null;
  }
}

export async function upsertSiteResourceValue(key: string, value: string) {
  const { collectionId, databaseId } = getSiteResourcesConfig();

  return createDatabasesService().upsertDocument({
    databaseId,
    collectionId,
    documentId: key,
    data: {
      key,
      value,
    },
  });
}

export async function getSponsorOpeningsEnabled() {
  const storedValue = await getSiteResourceValue(SPONSOR_OPENINGS_RESOURCE_KEY);

  return parseSiteResourceBoolean(
    storedValue,
    DEFAULT_SPONSOR_OPENINGS_ENABLED,
  );
}

export async function setSponsorOpeningsEnabled(enabled: boolean) {
  return upsertSiteResourceValue(
    SPONSOR_OPENINGS_RESOURCE_KEY,
    enabled ? "true" : "false",
  );
}

export async function getGoogleSheetsTransferOnReconnectEnabled() {
  const storedValue = await getSiteResourceValue(
    GOOGLE_SHEETS_TRANSFER_ON_RECONNECT_RESOURCE_KEY,
  );

  return parseSiteResourceBoolean(
    storedValue,
    DEFAULT_GOOGLE_SHEETS_TRANSFER_ON_RECONNECT_ENABLED,
  );
}

export async function setGoogleSheetsTransferOnReconnectEnabled(enabled: boolean) {
  return upsertSiteResourceValue(
    GOOGLE_SHEETS_TRANSFER_ON_RECONNECT_RESOURCE_KEY,
    enabled ? "true" : "false",
  );
}

export async function getConfiguredDelegateBookletHref() {
  const storedValue = await getSiteResourceValue(DELEGATE_BOOKLET_RESOURCE_KEY);
  return normalizeSiteResourceLink(storedValue ?? "");
}

export async function getDelegateBookletHref() {
  return (
    (await getConfiguredDelegateBookletHref()) ?? DEFAULT_DELEGATE_BOOKLET_PATH
  );
}
