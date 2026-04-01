import { createHash } from "node:crypto";
import {
  Client,
  Databases,
  Query,
  Users,
} from "node-appwrite";

const DEFAULT_SUBMISSIONS_COLLECTION_ID = "registration_submissions";
const DEFAULT_CONTACTS_COLLECTION_ID = "registration_contacts";
const DEFAULT_EMAIL_ASSETS_BUCKET_ID = "email_assets";
const PRIMARY_EMAIL_TARGET_ID = "primary_email";
const CONTACT_ID_PREFIX = "contact_";
const CONTACT_HASH_LENGTH = 28;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const RESEND_API_BASE_URL = "https://api.resend.com";
const SEGMENT_DEFINITIONS = {
  all: {
    key: "all",
    name: "MazeX All Registered Users",
  },
  competition: {
    key: "competition",
    name: "MazeX Competition Registrants",
  },
  workshop: {
    key: "workshop",
    name: "MazeX Workshop Registrants",
  },
};

class ResendRequestError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "ResendRequestError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

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

function parseJson(value, fallback) {
  if (!value || typeof value !== "string") return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function trimNullable(value) {
  const normalized = trim(value);
  return normalized || null;
}

function normalizeEmailAddress(value) {
  return trim(value).toLowerCase();
}

function normalizeRegistrationKind(value) {
  const normalized = trim(value).toLowerCase();
  if (normalized === "competition" || normalized === "workshop") {
    return normalized;
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

function getOptionalEnv(key) {
  return process.env[key]?.trim() || "";
}

function createClient(req) {
  const key = String(getHeader(req, "x-appwrite-key") || "").trim();
  if (!key) {
    throw new Error("Missing x-appwrite-key header for Appwrite function execution.");
  }

  return new Client()
    .setEndpoint(getRequiredEnv("APPWRITE_FUNCTION_API_ENDPOINT"))
    .setProject(getRequiredEnv("APPWRITE_FUNCTION_PROJECT_ID"))
    .setKey(key);
}

function createDatabasesService(req) {
  return new Databases(createClient(req));
}

function createUsersService(req) {
  return new Users(createClient(req));
}

function getContactsCollectionId() {
  return (
    process.env.APPWRITE_COLLECTION_REGISTRATION_CONTACTS?.trim() ||
    DEFAULT_CONTACTS_COLLECTION_ID
  );
}

function getEmailProviderId() {
  return process.env.APPWRITE_MESSAGING_EMAIL_PROVIDER_ID?.trim() || "";
}

function getResendApiKey() {
  return getRequiredEnv("RESEND_API_KEY");
}

function hasResendApiKey() {
  return Boolean(getOptionalEnv("RESEND_API_KEY"));
}

function getResendMarketingFrom() {
  return (
    process.env.RESEND_MARKETING_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    ""
  );
}

function getResendMarketingReplyTo() {
  return (
    process.env.RESEND_MARKETING_REPLY_TO?.trim() ||
    process.env.RESEND_REPLY_TO?.trim() ||
    ""
  );
}

function getSegmentName(segmentKey) {
  const envOverrides = {
    all: getOptionalEnv("RESEND_SEGMENT_ALL_NAME"),
    competition: getOptionalEnv("RESEND_SEGMENT_COMPETITION_NAME"),
    workshop: getOptionalEnv("RESEND_SEGMENT_WORKSHOP_NAME"),
  };

  return envOverrides[segmentKey] || SEGMENT_DEFINITIONS[segmentKey].name;
}

function getEmailAssetUrls() {
  const endpoint = (
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const projectId = (
    process.env.APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    ""
  ).trim();
  const bucketId =
    process.env.APPWRITE_BUCKET_EMAIL_ASSETS?.trim() ||
    DEFAULT_EMAIL_ASSETS_BUCKET_ID;

  if (!endpoint || !projectId) {
    return {
      mazexLogoWhite: "",
      knurdzPoweredByLight: "",
    };
  }

  const baseUrl = `${endpoint}/storage/buckets/${bucketId}/files`;
  const projectParam = `project=${encodeURIComponent(projectId)}`;

  return {
    mazexLogoWhite: `${baseUrl}/mazex-logo-white/view?${projectParam}`,
    knurdzPoweredByLight: `${baseUrl}/knurdz-poweredby-light/view?${projectParam}`,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildScopedId(prefix, email) {
  const hash = createHash("sha256").update(email).digest("hex");
  return `${prefix}${hash.slice(0, CONTACT_HASH_LENGTH)}`;
}

function getContactDocumentId(email) {
  return buildScopedId(CONTACT_ID_PREFIX, email);
}

function getContactUserId(email) {
  return buildScopedId(CONTACT_ID_PREFIX, email);
}

function resolveNameProperty(name) {
  const normalized = trimNullable(name);
  if (!normalized) return null;

  return { name: normalized };
}

function getBroadcastSegmentKey(value) {
  const normalized = trim(value).toLowerCase();
  if (normalized === "competition" || normalized === "workshop") {
    return normalized;
  }

  return "all";
}

async function resendRequest(path, params = {}) {
  const method = params.method || "GET";
  const response = await fetch(`${RESEND_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();
  const data = text ? parseJson(text, null) : null;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      text ||
      `Resend API request failed with status ${response.status}.`;

    throw new ResendRequestError(message, response.status, data);
  }

  return data;
}

async function listResendSegments() {
  const response = await resendRequest("/segments");
  return Array.isArray(response?.data) ? response.data : [];
}

async function createResendSegment(name) {
  try {
    return await resendRequest("/segments", {
      method: "POST",
      body: { name },
    });
  } catch (error) {
    if (
      error instanceof ResendRequestError &&
      error.statusCode === 409
    ) {
      return null;
    }

    throw error;
  }
}

async function ensureResendSegments() {
  const existingSegments = await listResendSegments();
  const byName = new Map(
    existingSegments
      .map((segment) => [trim(segment?.name), segment])
      .filter(([name]) => Boolean(name)),
  );

  for (const segmentKey of Object.keys(SEGMENT_DEFINITIONS)) {
    const segmentName = getSegmentName(segmentKey);
    if (byName.has(segmentName)) {
      continue;
    }

    await createResendSegment(segmentName);
  }

  const finalSegments = await listResendSegments();
  const finalByName = new Map(
    finalSegments
      .map((segment) => [trim(segment?.name), segment])
      .filter(([name]) => Boolean(name)),
  );

  const resolved = {};

  for (const segmentKey of Object.keys(SEGMENT_DEFINITIONS)) {
    const segment = finalByName.get(getSegmentName(segmentKey));
    if (!segment?.id) {
      throw new Error(`Unable to resolve the Resend segment for ${segmentKey}.`);
    }

    resolved[segmentKey] = segment;
  }

  return resolved;
}

async function getResendContactByEmail(email) {
  try {
    return await resendRequest(`/contacts/${encodeURIComponent(email)}`);
  } catch (error) {
    if (error instanceof ResendRequestError && error.statusCode === 404) {
      return null;
    }

    throw error;
  }
}

async function createResendContact(params) {
  const body = {
    email: params.email,
    segments: params.segmentIds.map((segmentId) => ({ id: segmentId })),
  };

  if (params.properties) {
    body.properties = params.properties;
  }

  return resendRequest("/contacts", {
    method: "POST",
    body,
  });
}

async function updateResendContact(params) {
  const body = {};

  if (params.properties) {
    body.properties = params.properties;
  }

  return resendRequest(`/contacts/${encodeURIComponent(params.email)}`, {
    method: "PATCH",
    body,
  });
}

async function addResendContactToSegment(email, segmentId) {
  try {
    await resendRequest(
      `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
      {
        method: "POST",
      },
    );
  } catch (error) {
    if (
      error instanceof ResendRequestError &&
      error.statusCode === 409
    ) {
      return;
    }

    throw error;
  }
}

async function removeResendContactFromSegment(email, segmentId) {
  try {
    await resendRequest(
      `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
      {
        method: "DELETE",
      },
    );
  } catch (error) {
    if (
      error instanceof ResendRequestError &&
      error.statusCode === 404
    ) {
      return;
    }

    throw error;
  }
}

async function syncResendContact(params) {
  const segments = await ensureResendSegments();
  const desiredSegmentIds = [segments.all.id];

  if (params.registeredForCompetition) {
    desiredSegmentIds.push(segments.competition.id);
  }

  if (params.registeredForWorkshop) {
    desiredSegmentIds.push(segments.workshop.id);
  }

  const uniqueSegmentIds = [...new Set(desiredSegmentIds.filter(Boolean))];
  const properties = resolveNameProperty(params.name);
  let contact = await getResendContactByEmail(params.email);

  if (!contact) {
    try {
      contact = await createResendContact({
        email: params.email,
        segmentIds: uniqueSegmentIds,
        properties,
      });
    } catch (error) {
      if (
        error instanceof ResendRequestError &&
        error.statusCode === 409
      ) {
        contact = await getResendContactByEmail(params.email);
      } else {
        throw error;
      }
    }
  }

  if (!contact) {
    throw new Error(`Unable to create or retrieve the Resend contact for ${params.email}.`);
  }

  if (properties) {
    await updateResendContact({
      email: params.email,
      properties,
    });
  }

  for (const segmentId of uniqueSegmentIds) {
    await addResendContactToSegment(params.email, segmentId);
  }

  if (
    !params.registeredForCompetition &&
    params.previousRegisteredForCompetition
  ) {
    await removeResendContactFromSegment(params.email, segments.competition.id);
  }

  if (
    !params.registeredForWorkshop &&
    params.previousRegisteredForWorkshop
  ) {
    await removeResendContactFromSegment(params.email, segments.workshop.id);
  }

  return trim(contact.id) || null;
}

function buildMarketingBroadcastText(content) {
  const body = trim(content);
  return `${body}\n\nThank you,\nMazeX Team\n\nYou are receiving this because you registered for MazeX.\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`;
}

function buildMarketingBroadcastHtml(content) {
  const assets = getEmailAssetUrls();
  const blocks = trim(content)
    .split(/\n\s*\n/gu)
    .map((block) =>
      block
        .split(/\n/gu)
        .map((line) => escapeHtml(line))
        .join("<br />"),
    )
    .filter(Boolean);

  const paragraphs =
    blocks.length > 0
      ? blocks
          .map(
            (block) =>
              `<p style="margin: 0 0 18px; line-height: 1.75; font-size: 15px; color: #3f3f46;">${block}</p>`,
          )
          .join("")
      : `<p style="margin: 0; line-height: 1.75; font-size: 15px; color: #3f3f46;"></p>`;

  const logoMarkup = assets.mazexLogoWhite
    ? `<img src="${assets.mazexLogoWhite}" alt="MazeX" width="200" style="display: inline-block; height: auto; max-height: 64px; width: auto; max-width: 200px;" />`
    : `<div style="font-size: 28px; font-weight: 700; letter-spacing: 0.08em; color: #ffffff;">MazeX</div>`;
  const poweredByMarkup = assets.knurdzPoweredByLight
    ? `<img src="${assets.knurdzPoweredByLight}" alt="Powered by Knurdz" height="34" style="display: block; height: 34px; width: auto;" />`
    : `<span style="font-size: 12px; font-weight: 600; color: #64748b;">Powered by Knurdz</span>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>MazeX</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-wrapper { padding: 12px !important; }
      .content-cell { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" valign="top" class="email-wrapper" style="padding: 48px 20px 40px; text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" class="email-container" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; text-align: left;">
          <tr>
            <td style="padding: 36px 40px; text-align: center; background-color: #000102;">
              ${logoMarkup}
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding: 40px 44px 36px;">
              <div style="margin-bottom: 36px;">
                ${paragraphs}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-top: 24px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                      Thank you,<br />
                      <strong style="color: inherit;">MazeX Team</strong>
                    </p>
                    <p style="margin: 18px 0 0; font-size: 12px; line-height: 1.7; color: #64748b;">
                      You are receiving this because you registered for MazeX.
                      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #0f766e; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="width: 100%; max-width: 600px; margin: 0 auto;">
          <tr>
            <td style="padding: 24px 0 8px; text-align: center;">
              <div style="display: inline-block; background-color: #ffffff; padding: 10px 20px; border-radius: 12px; border: 1px solid #e2e8f0; opacity: 0.85;">
                ${poweredByMarkup}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function createResendBroadcast(params) {
  const from = getResendMarketingFrom();
  if (!from) {
    throw new Error(
      "Missing required function environment variable: RESEND_MARKETING_FROM or RESEND_FROM",
    );
  }

  const replyTo = getResendMarketingReplyTo();
  const body = {
    from,
    subject: params.subject,
    html: buildMarketingBroadcastHtml(params.content),
    text: buildMarketingBroadcastText(params.content),
    send: true,
    segmentId: params.segmentId,
    segment_id: params.segmentId,
  };

  if (replyTo) {
    body.replyTo = replyTo;
    body.reply_to = replyTo;
  }

  return resendRequest("/broadcasts", {
    method: "POST",
    body,
  });
}

async function lookupUserByEmail(req, email) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) return null;

  const result = await createUsersService(req).list({
    queries: [Query.equal("email", normalizedEmail), Query.limit(1)],
  });

  return result.users?.[0] ?? null;
}

async function ensureContactUser(req, params) {
  const normalizedEmail = normalizeEmailAddress(params.email);
  const users = createUsersService(req);
  const candidateUserIds = [...new Set([
    trim(params.existingUserId),
    getContactUserId(normalizedEmail),
  ].filter(Boolean))];

  let user = null;

  for (const userId of candidateUserIds) {
    try {
      user = await users.get({ userId });
      break;
    } catch (error) {
      if (!(error instanceof Error) || error.code !== 404) {
        throw error;
      }
    }
  }

  if (!user) {
    try {
      user = await users.create({
        userId: getContactUserId(normalizedEmail),
        email: normalizedEmail,
        name: params.name || undefined,
      });
    } catch (error) {
      if (!(error instanceof Error) || error.code !== 409) {
        throw error;
      }

      user = await lookupUserByEmail(req, normalizedEmail);
      if (!user) {
        throw error;
      }
    }
  }

  if (!user) {
    throw new Error(`Unable to create or find a messaging user for ${normalizedEmail}.`);
  }

  if (normalizeEmailAddress(user.email) !== normalizedEmail) {
    user = await users.updateEmail({
      userId: user.$id,
      email: normalizedEmail,
    });
  }

  if (params.name && trim(user.name) !== params.name) {
    user = await users.updateName({
      userId: user.$id,
      name: params.name,
    });
  }

  return user;
}

async function ensureContactTarget(req, params) {
  const normalizedEmail = normalizeEmailAddress(params.email);
  const providerId = getEmailProviderId();
  const users = createUsersService(req);
  const targets = await users.listTargets({
    userId: params.userId,
    queries: [Query.limit(100)],
  });
  const emailTargets = (targets.targets ?? []).filter(
    (target) => target.providerType === "email",
  );
  const fallbackTargetName = params.name || normalizedEmail;

  const existingTarget =
    emailTargets.find((target) => target.$id === trim(params.existingTargetId)) ||
    emailTargets.find(
      (target) => normalizeEmailAddress(target.identifier) === normalizedEmail,
    ) ||
    emailTargets[0] ||
    null;

  if (!existingTarget) {
    try {
      return await users.createTarget({
        userId: params.userId,
        targetId: trim(params.existingTargetId) || PRIMARY_EMAIL_TARGET_ID,
        providerType: "email",
        identifier: normalizedEmail,
        providerId: providerId || undefined,
        name: fallbackTargetName,
      });
    } catch (error) {
      if (!(error instanceof Error) || error.code !== 409) {
        throw error;
      }

      const refreshedTargets = await users.listTargets({
        userId: params.userId,
        queries: [Query.limit(100)],
      });
      const resolvedTarget = (refreshedTargets.targets ?? []).find(
        (target) => target.providerType === "email",
      );

      if (!resolvedTarget) {
        throw error;
      }

      return resolvedTarget;
    }
  }

  const needsIdentifierUpdate =
    normalizeEmailAddress(existingTarget.identifier) !== normalizedEmail;
  const needsNameUpdate = trim(existingTarget.name) !== fallbackTargetName;
  const needsProviderUpdate =
    Boolean(providerId) && trim(existingTarget.providerId) !== providerId;

  if (!needsIdentifierUpdate && !needsNameUpdate && !needsProviderUpdate) {
    return existingTarget;
  }

  return users.updateTarget({
    userId: params.userId,
    targetId: existingTarget.$id,
    identifier: normalizedEmail,
    providerId: providerId || undefined,
    name: fallbackTargetName,
  });
}

async function getExistingContactDocument(req, email) {
  const databases = createDatabasesService(req);
  const databaseId = getRequiredEnv("APPWRITE_DB_ID");
  const collectionId = getContactsCollectionId();

  try {
    return await databases.getDocument(
      databaseId,
      collectionId,
      getContactDocumentId(email),
    );
  } catch (error) {
    if (!(error instanceof Error) || error.code !== 404) {
      throw error;
    }

    return null;
  }
}

async function upsertContactDocument(req, params) {
  const databases = createDatabasesService(req);
  const databaseId = getRequiredEnv("APPWRITE_DB_ID");
  const collectionId = getContactsCollectionId();
  const documentId = getContactDocumentId(params.email);
  const data = {
    email: params.email,
    name: params.name,
    userId: params.userId,
    targetId: params.targetId,
    resendContactId: params.resendContactId,
    registeredForCompetition: params.registeredForCompetition,
    registeredForWorkshop: params.registeredForWorkshop,
    lastFormId: params.lastFormId,
    lastFormTitle: params.lastFormTitle,
    lastSubmissionId: params.lastSubmissionId,
    lastSubmittedAt: params.lastSubmittedAt,
  };

  try {
    return await databases.updateDocument(databaseId, collectionId, documentId, data);
  } catch (error) {
    if (!(error instanceof Error) || error.code !== 404) {
      throw error;
    }
  }

  try {
    return await databases.createDocument(databaseId, collectionId, documentId, data);
  } catch (error) {
    if (!(error instanceof Error) || error.code !== 409) {
      throw error;
    }
  }

  return databases.updateDocument(databaseId, collectionId, documentId, data);
}

function pickSubmissionEmailField(form, fields) {
  const submissionFields = fields.filter(
    (field) => field.scope === "submission" && field.type !== "page_break",
  );

  return (
    submissionFields.find(
      (field) =>
        field.$id === form.confirmationEmailFieldId &&
        field.type === "email",
    ) ||
    submissionFields.find((field) => field.type === "email") ||
    null
  );
}

function pickSubmissionNameField(form, fields) {
  const submissionFields = fields.filter(
    (field) => field.scope === "submission" && field.type !== "page_break",
  );

  return (
    submissionFields.find(
      (field) =>
        field.$id === form.confirmationNameFieldId &&
        (field.type === "text" || field.type === "textarea"),
    ) ||
    submissionFields.find(
      (field) =>
        (field.type === "text" || field.type === "textarea") &&
        /name/iu.test(`${trim(field.label)} ${trim(field.key)}`),
    ) ||
    submissionFields.find(
      (field) => field.type === "text" || field.type === "textarea",
    ) ||
    null
  );
}

async function syncSubmissionContact(context) {
  const { req, res, log } = context;
  const payload = readPayload(req);
  if (!payload || typeof payload !== "object") {
    log("Resend contacts function received an invalid submission payload.");
    return res.json({ ok: true, skipped: "invalid_payload" });
  }

  const formId = trim(payload.formId);
  if (!formId) {
    log("Resend contacts function received a submission without formId.");
    return res.json({ ok: true, skipped: "missing_form_id" });
  }

  const databases = createDatabasesService(req);
  const databaseId = getRequiredEnv("APPWRITE_DB_ID");
  const formsCollectionId = getRequiredEnv("APPWRITE_COLLECTION_REGISTRATION_FORMS");
  const fieldsCollectionId = getRequiredEnv("APPWRITE_COLLECTION_REGISTRATION_FIELDS");

  const [form, fieldsResult] = await Promise.all([
    databases.getDocument(databaseId, formsCollectionId, formId),
    databases.listDocuments(databaseId, fieldsCollectionId, [
      Query.equal("formId", formId),
      Query.limit(200),
    ]),
  ]);

  const registrationKind = normalizeRegistrationKind(form.kind);
  if (!registrationKind) {
    log(`Skipping contact sync because form ${formId} has an unsupported kind.`);
    return res.json({ ok: true, skipped: "unsupported_form_kind" });
  }

  const parsedAnswers = parseJson(payload.answersJson, {});
  const answers =
    parsedAnswers && typeof parsedAnswers === "object" && !Array.isArray(parsedAnswers)
      ? parsedAnswers
      : {};
  const emailField = pickSubmissionEmailField(form, fieldsResult.documents);
  if (!emailField) {
    log(`Skipping contact sync because form ${formId} has no submission email field.`);
    return res.json({ ok: true, skipped: "missing_email_field" });
  }

  const recipientEmail = normalizeEmailAddress(answers[emailField.key]);
  if (!recipientEmail || !EMAIL_PATTERN.test(recipientEmail)) {
    log(`Skipping contact sync because the submission email is invalid: ${recipientEmail}`);
    return res.json({ ok: true, skipped: "invalid_recipient_email" });
  }

  const nameField = pickSubmissionNameField(form, fieldsResult.documents);
  const recipientName = nameField ? trimNullable(answers[nameField.key]) : null;
  const existingContact = await getExistingContactDocument(req, recipientEmail);
  const registeredForCompetition =
    Boolean(existingContact?.registeredForCompetition) ||
    registrationKind === "competition";
  const registeredForWorkshop =
    Boolean(existingContact?.registeredForWorkshop) ||
    registrationKind === "workshop";
  const user = await ensureContactUser(req, {
    email: recipientEmail,
    name: recipientName,
    existingUserId: trim(existingContact?.userId),
  });
  const target = await ensureContactTarget(req, {
    userId: user.$id,
    email: recipientEmail,
    name: recipientName,
    existingTargetId: trim(existingContact?.targetId),
  });

  await upsertContactDocument(req, {
    email: recipientEmail,
    name: recipientName || trimNullable(existingContact?.name) || trimNullable(user.name),
    userId: user.$id,
    targetId: target.$id,
    resendContactId: trimNullable(existingContact?.resendContactId),
    registeredForCompetition,
    registeredForWorkshop,
    lastFormId: formId,
    lastFormTitle: trimNullable(form.title),
    lastSubmissionId: trim(payload.$id),
    lastSubmittedAt: trim(payload.$createdAt),
  });

  if (!hasResendApiKey()) {
    log(
      `Skipping Resend sync for ${recipientEmail} because RESEND_API_KEY is not configured.`,
    );
    return res.json({ ok: true, skipped: "missing_resend_api_key" });
  }

  const resendContactId = await syncResendContact({
    email: recipientEmail,
    name: recipientName,
    registeredForCompetition,
    registeredForWorkshop,
    previousRegisteredForCompetition: Boolean(existingContact?.registeredForCompetition),
    previousRegisteredForWorkshop: Boolean(existingContact?.registeredForWorkshop),
  });

  await upsertContactDocument(req, {
    email: recipientEmail,
    name: recipientName || trimNullable(existingContact?.name) || trimNullable(user.name),
    userId: user.$id,
    targetId: target.$id,
    resendContactId,
    registeredForCompetition,
    registeredForWorkshop,
    lastFormId: formId,
    lastFormTitle: trimNullable(form.title),
    lastSubmissionId: trim(payload.$id),
    lastSubmittedAt: trim(payload.$createdAt),
  });

  log(`Synced ${recipientEmail} to Resend for the ${registrationKind} segment(s).`);
  return res.json({ ok: true, resendContactId });
}

async function sendBroadcastToSegment(context) {
  const { req, res } = context;
  const payload = readPayload(req);
  if (!payload || typeof payload !== "object") {
    throw new Error("The broadcast request payload is invalid.");
  }

  const segmentKey = getBroadcastSegmentKey(payload.segmentKey);
  const subject = trim(payload.subject);
  const content = trim(payload.content);

  if (!subject) {
    throw new Error("Enter an email subject.");
  }

  if (!content) {
    throw new Error("Enter the email content.");
  }

  const segments = await ensureResendSegments();
  const segment = segments[segmentKey];
  const broadcast = await createResendBroadcast({
    segmentId: trim(segment.id),
    subject,
    content,
  });

  return res.json({
    ok: true,
    broadcastId: trim(broadcast?.id),
    segmentKey,
    segmentName: getSegmentName(segmentKey),
  });
}

export default async function syncRegistrationContactsToResend(context) {
  const { req, res, log, error } = context;
  const eventName = String(getHeader(req, "x-appwrite-event") || "");
  const expectedCollectionId =
    process.env.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS?.trim() ||
    DEFAULT_SUBMISSIONS_COLLECTION_ID;

  try {
    if (
      eventName &&
      eventName.includes(`.collections.${expectedCollectionId}.documents.`)
    ) {
      return await syncSubmissionContact(context);
    }

    const payload = readPayload(req);
    if (payload?.action === "send-broadcast") {
      return await sendBroadcastToSegment(context);
    }

    if (eventName) {
      log(`Skipping unrelated event: ${eventName}`);
      return res.json({ ok: true, skipped: "unrelated_event" });
    }

    return res.json({ ok: true, skipped: "no_action" });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Unknown function error.";
    error(message);
    throw caughtError;
  }
}
