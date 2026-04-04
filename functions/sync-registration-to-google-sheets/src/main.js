import { Client, Databases, Query } from "node-appwrite";

const DEFAULT_SUBMISSIONS_COLLECTION_ID = "registration_submissions";
const DEFAULT_FORM_SYNCS_COLLECTION_ID = "google_sheets_form_syncs";
const DEFAULT_CONNECTIONS_COLLECTION_ID = "google_sheets_connections";
const SHARED_GOOGLE_SHEETS_CONNECTION_DOCUMENT_ID = "shared_google_sheets_connection";
const GOOGLE_SHEETS_API_BASE_URL = "https://sheets.googleapis.com/v4";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const LEGACY_SUBMISSION_ID_COLUMN_KEY = "meta:submission_id";
const METADATA_SHEET_TITLE = "__mazex_sync_metadata";
const METADATA_SHEET_HEADERS = ["Type", "Sheet Title", "Key", "Value", "Updated At"];
const DISPLAY_TIME_ZONE = "Asia/Colombo";
const META_COLUMNS = [
  { key: "meta:submitted_at", label: "Submitted At" },
];

function getHeader(req, key) {
  const headers = req?.headers ?? {};
  return (
    headers[key] ??
    headers[key.toLowerCase()] ??
    headers[key.toUpperCase()] ??
    ""
  );
}

function readPayload(req) {
  if (req?.bodyJson && typeof req.bodyJson === "object") {
    return req.bodyJson;
  }

  if (typeof req?.bodyText === "string" && req.bodyText.trim()) {
    try {
      return JSON.parse(req.bodyText);
    } catch {
      return null;
    }
  }

  return null;
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson(value, fallback) {
  if (!value || typeof value !== "string") return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => trim(item)).filter(Boolean);
}

async function getGoogleSheetsConnectionDocument(
  databases,
  databaseId,
  connectionsCollectionId,
  documentId,
) {
  const normalizedDocumentId = trim(documentId);
  if (!normalizedDocumentId) {
    return null;
  }

  return databases
    .getDocument(databaseId, connectionsCollectionId, normalizedDocumentId)
    .catch((fetchError) => {
      if (fetchError?.code === 404) return null;
      throw fetchError;
    });
}

async function resolveGoogleSheetsConnection(params) {
  const sharedConnection = await getGoogleSheetsConnectionDocument(
    params.databases,
    params.databaseId,
    params.connectionsCollectionId,
    SHARED_GOOGLE_SHEETS_CONNECTION_DOCUMENT_ID,
  );
  if (sharedConnection) {
    return {
      connection: sharedConnection,
      sourceDocumentId: SHARED_GOOGLE_SHEETS_CONNECTION_DOCUMENT_ID,
    };
  }

  const normalizedLegacyDocumentId = trim(params.legacyDocumentId);
  if (
    normalizedLegacyDocumentId &&
    normalizedLegacyDocumentId !== SHARED_GOOGLE_SHEETS_CONNECTION_DOCUMENT_ID
  ) {
    const legacyConnection = await getGoogleSheetsConnectionDocument(
      params.databases,
      params.databaseId,
      params.connectionsCollectionId,
      normalizedLegacyDocumentId,
    );
    if (legacyConnection) {
      return {
        connection: legacyConnection,
        sourceDocumentId: normalizedLegacyDocumentId,
      };
    }
  }

  const recentConnections = await params.databases.listDocuments(
    params.databaseId,
    params.connectionsCollectionId,
    [
      Query.orderDesc("$updatedAt"),
      Query.limit(25),
    ],
  );

  for (const document of recentConnections.documents ?? []) {
    const documentId = trim(document?.$id);
    if (documentId === SHARED_GOOGLE_SHEETS_CONNECTION_DOCUMENT_ID) {
      continue;
    }

    if (!trim(document?.refreshToken) || !trim(document?.spreadsheetId)) {
      continue;
    }

    return {
      connection: document,
      sourceDocumentId: documentId,
    };
  }

  return null;
}

function getRequiredEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required function environment variable: ${key}`);
  }
  return value;
}

function getGoogleOAuthConfigIfPresent() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || "";

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

function createDatabasesService(req) {
  const key = trim(getHeader(req, "x-appwrite-key"));
  if (!key) {
    throw new Error("Missing x-appwrite-key header for Appwrite function execution.");
  }

  const client = new Client()
    .setEndpoint(getRequiredEnv("APPWRITE_FUNCTION_API_ENDPOINT"))
    .setProject(getRequiredEnv("APPWRITE_FUNCTION_PROJECT_ID"))
    .setKey(key);

  return new Databases(client);
}

function extractSubmissionId(payload, eventName) {
  const payloadId = trim(payload?.$id);
  if (payloadId) return payloadId;

  const match = eventName.match(/\.documents\.([^.]+)\.create$/u);
  return trim(match?.[1]);
}

function sanitizeSheetTitle(value) {
  const sanitized = trim(value)
    .replace(/[\\/*?:[\]]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^'+|'+$/gu, "");

  return (sanitized || "Registration Sync").slice(0, 100).trim() || "Registration Sync";
}

function makeLegacyDefaultSheetTitle(formTitle, formSlug) {
  return sanitizeSheetTitle(`${trim(formTitle) || "Registration"} - ${trim(formSlug) || "form"}`);
}

function makeDefaultSheetTitle(formTitle, _formSlug) {
  return sanitizeSheetTitle(trim(formTitle) || "Registration");
}

function getFieldColumnKey(fieldId) {
  return `field:${fieldId}`;
}

function getFieldColumnLabel(field) {
  const label = trim(field.label) || trim(field.key) || field.$id;
  return label;
}

function normalizeVisibleColumnLabel(label) {
  const normalized = trim(label);
  return normalized.startsWith("Submission: ")
    ? normalized.slice("Submission: ".length).trim()
    : normalized;
}

function escapeSheetTitleForRange(title) {
  return `'${String(title).replaceAll("'", "''")}'`;
}

function buildSheetRange(sheetTitle, range) {
  return `${escapeSheetTitleForRange(sheetTitle)}!${range}`;
}

function arraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function columnIndexToLetter(index) {
  let value = index + 1;
  let output = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }

  return output;
}

async function readGoogleResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

function extractGoogleErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;

  const errorContainer =
    "error" in payload && payload.error && typeof payload.error === "object"
      ? payload.error
      : payload;
  const message =
    typeof errorContainer.message === "string"
      ? errorContainer.message.trim()
      : "";
  const description =
    typeof payload.error_description === "string"
      ? payload.error_description.trim()
      : "";
  const error =
    typeof payload.error === "string"
      ? payload.error.trim()
      : "";

  return description || message || error || fallback;
}

class GoogleSheetsApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GoogleSheetsApiError";
    this.status = status;
  }
}

async function refreshGoogleAccessToken(refreshToken) {
  const config = getGoogleOAuthConfigIfPresent();
  if (!config) {
    throw new Error(
      "Google Sheets OAuth client credentials are missing from the function environment.",
    );
  }

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  const payload = await readGoogleResponse(response);

  if (!response.ok) {
    throw new Error(
      extractGoogleErrorMessage(payload, "Unable to refresh the Google Sheets access token."),
    );
  }

  const accessToken = trim(payload?.access_token);
  if (!accessToken) {
    throw new Error("Google did not return an access token for Sheets sync.");
  }

  return accessToken;
}

async function googleSheetsRequest(accessToken, path, init = {}) {
  const response = await fetch(`${GOOGLE_SHEETS_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = await readGoogleResponse(response);

  if (!response.ok) {
    throw new GoogleSheetsApiError(
      extractGoogleErrorMessage(payload, "Google Sheets request failed."),
      response.status,
    );
  }

  return payload;
}

async function batchUpdateSpreadsheet(accessToken, spreadsheetId, requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return null;
  }

  return googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    },
  );
}

async function listSpreadsheetSheetProperties(accessToken, spreadsheetId) {
  const spreadsheet = await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}?fields=sheets.properties(sheetId,title,hidden,gridProperties.frozenRowCount)`,
  );

  return Array.isArray(spreadsheet?.sheets)
    ? spreadsheet.sheets
        .map((sheet) => sheet?.properties ?? null)
        .filter(Boolean)
    : [];
}

async function ensureSheetExists(accessToken, spreadsheetId, sheetTitle, legacySheetTitles = []) {
  const sheetProperties = await listSpreadsheetSheetProperties(
    accessToken,
    spreadsheetId,
  );
  const existingSheet = sheetProperties.find((sheet) => trim(sheet?.title) === sheetTitle);

  if (existingSheet) {
    if ((existingSheet.gridProperties?.frozenRowCount ?? 0) !== 1) {
      await batchUpdateSpreadsheet(accessToken, spreadsheetId, [
        {
          updateSheetProperties: {
            properties: {
              sheetId: existingSheet.sheetId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
      ]);
    }

    return {
      ...existingSheet,
      gridProperties: {
        ...(existingSheet.gridProperties ?? {}),
        frozenRowCount: 1,
      },
    };
  }

  const normalizedLegacySheetTitles = [...new Set(
    legacySheetTitles
      .map((title) => trim(title))
      .filter((title) => title && title !== sheetTitle),
  )];
  const legacySheet = sheetProperties.find((sheet) =>
    normalizedLegacySheetTitles.includes(trim(sheet?.title)),
  );

  if (legacySheet) {
    await batchUpdateSpreadsheet(accessToken, spreadsheetId, [
      {
        updateSheetProperties: {
          properties: {
            sheetId: legacySheet.sheetId,
            title: sheetTitle,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          fields: "title,gridProperties.frozenRowCount",
        },
      },
    ]);

    return {
      ...legacySheet,
      title: sheetTitle,
      gridProperties: {
        ...(legacySheet.gridProperties ?? {}),
        frozenRowCount: 1,
      },
    };
  }

  try {
    const created = await batchUpdateSpreadsheet(accessToken, spreadsheetId, [
      {
        addSheet: {
          properties: {
            title: sheetTitle,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      },
    ]);

    return created?.replies?.[0]?.addSheet?.properties ?? null;
  } catch (error) {
    if (!(error instanceof GoogleSheetsApiError) || error.status !== 400) {
      throw error;
    }
  }

  const retriedSheet = (await listSpreadsheetSheetProperties(
    accessToken,
    spreadsheetId,
  )).find((sheet) => trim(sheet?.title) === sheetTitle);

  if (!retriedSheet) {
    return null;
  }

  if ((retriedSheet.gridProperties?.frozenRowCount ?? 0) !== 1) {
    await batchUpdateSpreadsheet(accessToken, spreadsheetId, [
      {
        updateSheetProperties: {
          properties: {
            sheetId: retriedSheet.sheetId,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          fields: "gridProperties.frozenRowCount",
        },
      },
    ]);
  }

  return {
    ...retriedSheet,
    gridProperties: {
      ...(retriedSheet.gridProperties ?? {}),
      frozenRowCount: 1,
    },
  };
}

async function ensureMetadataSheet(accessToken, spreadsheetId) {
  let metadataSheet = (await listSpreadsheetSheetProperties(
    accessToken,
    spreadsheetId,
  )).find((sheet) => trim(sheet?.title) === METADATA_SHEET_TITLE);

  if (!metadataSheet) {
    const created = await batchUpdateSpreadsheet(accessToken, spreadsheetId, [
      {
        addSheet: {
          properties: {
            title: METADATA_SHEET_TITLE,
            hidden: true,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      },
    ]);

    metadataSheet = created?.replies?.[0]?.addSheet?.properties ?? null;
  }

  if (!metadataSheet) {
    throw new Error("Unable to create the internal Google Sheets metadata sheet.");
  }

  const metadataRequests = [];
  if (!metadataSheet.hidden) {
    metadataRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: metadataSheet.sheetId,
          hidden: true,
        },
        fields: "hidden",
      },
    });
  }
  if ((metadataSheet.gridProperties?.frozenRowCount ?? 0) !== 1) {
    metadataRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: metadataSheet.sheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: "gridProperties.frozenRowCount",
      },
    });
  }

  if (metadataRequests.length > 0) {
    await batchUpdateSpreadsheet(accessToken, spreadsheetId, metadataRequests);
  }

  const headerRange = buildSheetRange(METADATA_SHEET_TITLE, "1:1");
  const rows = await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
      headerRange,
    )}`,
  );
  const headerRow = getRowValues(rows?.values, 0).map((value) => trim(value));

  if (!arraysEqual(headerRow, METADATA_SHEET_HEADERS)) {
    await googleSheetsRequest(
      accessToken,
      `/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: headerRange,
          majorDimension: "ROWS",
          values: [METADATA_SHEET_HEADERS],
        }),
      },
    );
  }

  return {
    ...metadataSheet,
    hidden: true,
    gridProperties: {
      ...(metadataSheet.gridProperties ?? {}),
      frozenRowCount: 1,
    },
  };
}

function getRowValues(values, rowIndex) {
  if (!Array.isArray(values)) return [];
  return Array.isArray(values[rowIndex]) ? [...values[rowIndex]] : [];
}

function isLegacyKeyRow(row) {
  return row.some((value) => {
    const normalized = trim(value);
    return (
      normalized === LEGACY_SUBMISSION_ID_COLUMN_KEY ||
      normalized === "meta:submitted_at" ||
      normalized.startsWith("field:")
    );
  });
}

async function loadSheetMetadata(accessToken, spreadsheetId, sheetTitle) {
  await ensureMetadataSheet(accessToken, spreadsheetId);

  const range = buildSheetRange(METADATA_SHEET_TITLE, "A2:E");
  const response = await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
      range,
    )}`,
  );
  const rows = Array.isArray(response?.values) ? response.values : [];
  const syncedSubmissionIds = new Set();
  let columnKeys = [];
  let columnKeysRowNumber = null;

  rows.forEach((row, index) => {
    const recordType = trim(row?.[0]);
    const recordSheetTitle = trim(row?.[1]);
    const key = trim(row?.[2]);
    const value = typeof row?.[3] === "string" ? row[3] : "";

    if (recordSheetTitle !== sheetTitle) return;

    if (recordType === "columns" && key === "column_keys") {
      columnKeys = normalizeStringArray(parseJson(value, [])).filter(
        (columnKey) => columnKey !== LEGACY_SUBMISSION_ID_COLUMN_KEY,
      );
      columnKeysRowNumber = index + 2;
      return;
    }

    if (recordType === "sync" && key) {
      syncedSubmissionIds.add(key);
    }
  });

  return {
    columnKeys,
    columnKeysRowNumber,
    syncedSubmissionIds,
  };
}

async function upsertSheetColumnMetadata(
  accessToken,
  spreadsheetId,
  sheetTitle,
  columnKeys,
  rowNumber,
) {
  const values = [
    [
      "columns",
      sheetTitle,
      "column_keys",
      JSON.stringify(columnKeys),
      new Date().toISOString(),
    ],
  ];

  if (rowNumber) {
    const range = buildSheetRange(METADATA_SHEET_TITLE, `A${rowNumber}:E${rowNumber}`);
    await googleSheetsRequest(
      accessToken,
      `/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range,
          majorDimension: "ROWS",
          values,
        }),
      },
    );
    return;
  }

  const appendRange = buildSheetRange(METADATA_SHEET_TITLE, "A:E");
  await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(
      appendRange,
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    },
  );
}

async function appendSyncedSubmissionMetadata(
  accessToken,
  spreadsheetId,
  sheetTitle,
  submissionId,
  submittedAt,
) {
  await ensureMetadataSheet(accessToken, spreadsheetId);

  const appendRange = buildSheetRange(METADATA_SHEET_TITLE, "A:E");
  await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(
      appendRange,
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [["sync", sheetTitle, submissionId, submittedAt, new Date().toISOString()]],
      }),
    },
  );
}

async function reorderVisibleSheetColumns(
  accessToken,
  spreadsheetId,
  sheetTitle,
  previousColumnKeys,
  nextColumnKeys,
) {
  if (previousColumnKeys.length === 0 || arraysEqual(previousColumnKeys, nextColumnKeys)) {
    return;
  }

  const previousLastColumnLetter = columnIndexToLetter(previousColumnKeys.length - 1);
  const previousRange = buildSheetRange(sheetTitle, `A:${previousLastColumnLetter}`);
  const response = await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
      previousRange,
    )}`,
  );
  const rows = Array.isArray(response?.values) ? response.values : [];
  if (rows.length === 0) {
    return;
  }

  const previousIndexByKey = new Map(
    previousColumnKeys.map((key, index) => [key, index]),
  );
  const reorderedRows = rows.map((row) =>
    nextColumnKeys.map((key) => {
      const previousIndex = previousIndexByKey.get(key);
      return previousIndex === undefined ? "" : row?.[previousIndex] ?? "";
    }),
  );
  const nextLastColumnLetter = columnIndexToLetter(nextColumnKeys.length - 1);
  const updateRange = buildSheetRange(
    sheetTitle,
    `A1:${nextLastColumnLetter}${reorderedRows.length}`,
  );

  await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range: updateRange,
        majorDimension: "ROWS",
        values: reorderedRows,
      }),
    },
  );
}

async function migrateLegacySheetStructure(
  accessToken,
  spreadsheetId,
  sheetId,
  legacyKeyRow,
) {
  const requests = [];
  const submissionIdColumnIndex = legacyKeyRow.findIndex(
    (value) => trim(value) === LEGACY_SUBMISSION_ID_COLUMN_KEY,
  );

  if (submissionIdColumnIndex >= 0) {
    requests.push({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: submissionIdColumnIndex,
          endIndex: submissionIdColumnIndex + 1,
        },
      },
    });
  }

  requests.push({
    deleteDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: 1,
        endIndex: 2,
      },
    },
  });
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
      fields: "gridProperties.frozenRowCount",
    },
  });

  await batchUpdateSpreadsheet(accessToken, spreadsheetId, requests);

  return legacyKeyRow
    .map((value) => trim(value))
    .filter((value) => value && value !== LEGACY_SUBMISSION_ID_COLUMN_KEY);
}

async function ensureSheetColumns(
  accessToken,
  spreadsheetId,
  sheetTitle,
  selectedFields,
  legacySheetTitles = [],
) {
  const sheet = await ensureSheetExists(
    accessToken,
    spreadsheetId,
    sheetTitle,
    legacySheetTitles,
  );
  if (typeof sheet?.sheetId !== "number") {
    throw new Error(`Unable to resolve the Google Sheets tab for "${sheetTitle}".`);
  }

  const visibleHeaderRange = buildSheetRange(sheetTitle, "1:2");
  const rows = await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
      visibleHeaderRange,
    )}`,
  );
  const headerRow = getRowValues(rows?.values, 0).map((value) => trim(value));
  const secondRow = getRowValues(rows?.values, 1);
  const metadata = await loadSheetMetadata(accessToken, spreadsheetId, sheetTitle);
  const existingLabelByKey = new Map();
  let existingColumnKeys = [...metadata.columnKeys];
  let visibleHeaderRow = [...headerRow];
  let migratedLegacyStructure = false;

  if (isLegacyKeyRow(secondRow)) {
    existingColumnKeys = await migrateLegacySheetStructure(
      accessToken,
      spreadsheetId,
      sheet.sheetId,
      secondRow,
    );
    visibleHeaderRow = headerRow.filter(
      (_, index) => trim(secondRow[index]) !== LEGACY_SUBMISSION_ID_COLUMN_KEY,
    );
    migratedLegacyStructure = true;
  }

  existingColumnKeys.forEach((key, index) => {
    const label = normalizeVisibleColumnLabel(visibleHeaderRow[index]);
    if (label) {
      existingLabelByKey.set(key, label);
    }
  });

  const normalizedExistingColumnKeys = existingColumnKeys.filter(
    (key, index, array) =>
      key &&
      key !== LEGACY_SUBMISSION_ID_COLUMN_KEY &&
      array.indexOf(key) === index,
  );
  const existingFieldColumnKeys = normalizedExistingColumnKeys.filter(
    (key) => key !== "meta:submitted_at",
  );
  const columnKeys = [...existingFieldColumnKeys];

  for (const field of selectedFields) {
    const key = getFieldColumnKey(field.$id);
    if (!columnKeys.includes(key)) {
      columnKeys.push(key);
    }
  }

  if (!columnKeys.includes("meta:submitted_at")) {
    columnKeys.push("meta:submitted_at");
  }

  const activeFieldLabels = new Map(
    selectedFields.map((field) => [getFieldColumnKey(field.$id), getFieldColumnLabel(field)]),
  );
  const columnLabels = columnKeys.map((key) => {
    if (key === "meta:submitted_at") {
      return "Submitted At";
    }

    return activeFieldLabels.get(key) || existingLabelByKey.get(key) || key;
  });

  const headerChanged =
    migratedLegacyStructure || !arraysEqual(visibleHeaderRow, columnLabels);
  const metadataChanged =
    migratedLegacyStructure || !arraysEqual(metadata.columnKeys, columnKeys);

  await reorderVisibleSheetColumns(
    accessToken,
    spreadsheetId,
    sheetTitle,
    normalizedExistingColumnKeys,
    columnKeys,
  );

  if (headerChanged) {
    const updateRange = buildSheetRange(sheetTitle, "1:1");
    await googleSheetsRequest(
      accessToken,
      `/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: updateRange,
          majorDimension: "ROWS",
          values: [columnLabels],
        }),
      },
    );
  }

  if (metadataChanged) {
    await upsertSheetColumnMetadata(
      accessToken,
      spreadsheetId,
      sheetTitle,
      columnKeys,
      metadata.columnKeysRowNumber,
    );
  }

  return {
    columnKeys,
    syncedSubmissionIds: metadata.syncedSubmissionIds,
  };
}

function hasSyncedSubmission(sheetState, submissionId) {
  return sheetState.syncedSubmissionIds.has(submissionId);
}

function formatSimpleValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => trim(item)).filter(Boolean).join(", ");
  }

  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (value instanceof File) return trim(value.name);

  return trim(String(value));
}

function padTwoDigits(value) {
  return String(value).padStart(2, "0");
}

function formatSheetTimestamp(value) {
  const normalized = trim(value);
  if (!normalized) return "";

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hours24 = Number(part("hour"));
  const minutes = part("minute");
  const seconds = part("second");
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${year}-${month}-${day} ${padTwoDigits(hours12)}:${minutes}:${seconds} ${meridiem}`;
}

function getFieldValue(field, answers, memberAnswers) {
  if (field.scope === "submission") {
    return formatSimpleValue(answers[field.key]);
  }

  if (!Array.isArray(memberAnswers) || memberAnswers.length === 0) {
    return "";
  }

  return memberAnswers
    .map((member, index) => {
      const value = formatSimpleValue(member?.[field.key]);
      return value ? `Member ${index + 1}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

async function appendSubmissionRow(params) {
  const {
    accessToken,
    spreadsheetId,
    sheetTitle,
    submittedAt,
    answers,
    memberAnswers,
    fieldsById,
    columnKeys,
  } = params;
  const row = new Array(columnKeys.length).fill("");

  columnKeys.forEach((columnKey, index) => {
    if (columnKey === "meta:submitted_at") {
      row[index] = formatSheetTimestamp(submittedAt);
      return;
    }

    if (!columnKey.startsWith("field:")) return;

    const field = fieldsById.get(columnKey.slice("field:".length));
    if (!field) return;

    row[index] = getFieldValue(field, answers, memberAnswers);
  });

  const lastColumnLetter = columnIndexToLetter(columnKeys.length - 1);
  const range = encodeURIComponent(
    buildSheetRange(sheetTitle, `A:${lastColumnLetter}`),
  );

  await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [row],
      }),
    },
  );
}

async function syncRegistrationToGoogleSheets(context) {
  const { req, res, log, error } = context;

  const eventName = trim(getHeader(req, "x-appwrite-event"));
  const expectedCollectionId =
    process.env.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS?.trim() ||
    DEFAULT_SUBMISSIONS_COLLECTION_ID;

  if (
    eventName &&
    !eventName.includes(`.collections.${expectedCollectionId}.documents.`)
  ) {
    log(`Skipping unrelated event: ${eventName}`);
    return res.json({ ok: true, skipped: "unrelated_event" });
  }

  const payload = readPayload(req);
  if (!payload || typeof payload !== "object") {
    error("Google Sheets sync function received an invalid payload.");
    return res.json({ ok: true, skipped: "invalid_payload" });
  }

  const formId = trim(payload.formId);
  if (!formId) {
    error("Google Sheets sync function received a submission without formId.");
    return res.json({ ok: true, skipped: "missing_form_id" });
  }

  const submissionId = extractSubmissionId(payload, eventName);
  if (!submissionId) {
    error("Google Sheets sync function could not determine the submission ID.");
    return res.json({ ok: true, skipped: "missing_submission_id" });
  }

  const databases = createDatabasesService(req);
  const databaseId = getRequiredEnv("APPWRITE_DB_ID");
  const formsCollectionId = getRequiredEnv("APPWRITE_COLLECTION_REGISTRATION_FORMS");
  const fieldsCollectionId = getRequiredEnv("APPWRITE_COLLECTION_REGISTRATION_FIELDS");
  const formSyncsCollectionId =
    process.env.APPWRITE_COLLECTION_GOOGLE_SHEETS_FORM_SYNCS?.trim() ||
    DEFAULT_FORM_SYNCS_COLLECTION_ID;
  const connectionsCollectionId =
    process.env.APPWRITE_COLLECTION_GOOGLE_SHEETS_CONNECTIONS?.trim() ||
    DEFAULT_CONNECTIONS_COLLECTION_ID;

  const [form, fieldsResult, formSync] = await Promise.all([
    databases.getDocument(databaseId, formsCollectionId, formId),
    databases.listDocuments(databaseId, fieldsCollectionId, [
      Query.equal("formId", formId),
      Query.limit(200),
    ]),
    databases
      .getDocument(databaseId, formSyncsCollectionId, formId)
      .catch((fetchError) => {
        if (fetchError?.code === 404) return null;
        throw fetchError;
      }),
  ]);

  if (!form.googleSheetsSyncEnabled) {
    log(`Skipping Google Sheets sync because it is disabled for form ${formId}.`);
    return res.json({ ok: true, skipped: "sync_disabled" });
  }

  const selectedFieldIds = normalizeStringArray(
    parseJson(formSync?.selectedFieldIdsJson, []),
  );
  if (selectedFieldIds.length === 0) {
    log(`Skipping Google Sheets sync because no fields are selected for form ${formId}.`);
    return res.json({ ok: true, skipped: "no_selected_fields" });
  }

  const googleSheetsAdminUserId = trim(form.googleSheetsAdminUserId);
  const resolvedConnection = await resolveGoogleSheetsConnection({
    databases,
    databaseId,
    connectionsCollectionId,
    legacyDocumentId: googleSheetsAdminUserId,
  });

  if (!resolvedConnection) {
    log(
      `Skipping Google Sheets sync because no shared connection was found${
        googleSheetsAdminUserId ? ` (legacy reference: ${googleSheetsAdminUserId})` : ""
      }.`,
    );
    return res.json({ ok: true, skipped: "missing_connection" });
  }

  const { connection, sourceDocumentId } = resolvedConnection;
  const refreshToken = trim(connection.refreshToken);
  const spreadsheetId = trim(connection.spreadsheetId);
  if (!refreshToken || !spreadsheetId) {
    error(`Google Sheets connection is incomplete for record ${sourceDocumentId}.`);
    return res.json({ ok: true, skipped: "invalid_connection" });
  }

  if (!getGoogleOAuthConfigIfPresent()) {
    error("Google Sheets OAuth credentials are missing from the function environment.");
    return res.json({ ok: true, skipped: "oauth_not_configured" });
  }

  const fields = [...fieldsResult.documents]
    .filter((field) => field.type !== "page_break")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const fieldsById = new Map(fields.map((field) => [field.$id, field]));
  const selectedFields = selectedFieldIds
    .map((fieldId) => fieldsById.get(fieldId))
    .filter((field) => field && field.type !== "file");

  if (selectedFields.length === 0) {
    log(`Skipping Google Sheets sync because the selected fields are no longer available or supported for form ${formId}.`);
    return res.json({ ok: true, skipped: "selected_fields_missing" });
  }

  const accessToken = await refreshGoogleAccessToken(refreshToken);
  const storedSheetTitle = trim(form.googleSheetsSheetTitle);
  const legacyDefaultSheetTitle = makeLegacyDefaultSheetTitle(form.title, form.slug);
  const defaultSheetTitle = makeDefaultSheetTitle(form.title, form.slug);
  const sheetTitle =
    !storedSheetTitle || storedSheetTitle === legacyDefaultSheetTitle
      ? defaultSheetTitle
      : storedSheetTitle;
  const legacySheetTitles = [
    storedSheetTitle,
    legacyDefaultSheetTitle,
  ].filter((title, index, titles) => title && title !== sheetTitle && titles.indexOf(title) === index);
  const answers = parseJson(payload.answersJson, {});
  const memberAnswers = parseJson(payload.memberAnswersJson, []);
  const submittedAt =
    trim(payload.$createdAt) || trim(payload.$updatedAt) || new Date().toISOString();
  const sheetState = await ensureSheetColumns(
    accessToken,
    spreadsheetId,
    sheetTitle,
    selectedFields,
    legacySheetTitles,
  );

  if (hasSyncedSubmission(sheetState, submissionId)) {
    log(`Skipping duplicate Google Sheets sync for submission ${submissionId}.`);
    return res.json({ ok: true, skipped: "already_synced" });
  }

  await appendSubmissionRow({
    accessToken,
    spreadsheetId,
    sheetTitle,
    submissionId,
    submittedAt,
    answers,
    memberAnswers,
    fieldsById,
    columnKeys: sheetState.columnKeys,
  });

  try {
    await appendSyncedSubmissionMetadata(
      accessToken,
      spreadsheetId,
      sheetTitle,
      submissionId,
      submittedAt,
    );
  } catch (metadataError) {
    error(
      `Synced submission ${submissionId} to Google Sheets, but failed to update the internal sync metadata: ${metadataError?.message || metadataError}`,
    );
    return res.json({ ok: true, warning: "metadata_sync_failed" });
  }

  log(`Synced registration submission ${submissionId} to Google Sheets.`);
  return res.json({ ok: true });
}

export default syncRegistrationToGoogleSheets;
