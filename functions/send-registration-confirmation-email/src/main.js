import { createHash } from "node:crypto";
import {
  Client,
  Databases,
  ID,
  Messaging,
  Query,
  Users,
} from "node-appwrite";

const DEFAULT_SUBMISSIONS_COLLECTION_ID = "registration_submissions";
const DEFAULT_EMAIL_ASSETS_BUCKET_ID = "email_assets";
const DEFAULT_CONTACTS_COLLECTION_ID = "registration_contacts";
const PRIMARY_EMAIL_TARGET_ID = "primary_email";
const CONTACT_ID_PREFIX = "contact_";
const CONTACT_HASH_LENGTH = 28;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const FILE_FIELD_LABEL = "file";

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

function normalizeAnswerValue(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function getRequiredEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required function environment variable: ${key}`);
  }
  return value;
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

function createMessagingService(req) {
  return new Messaging(createClient(req));
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
      mazexLogo: "",
      mazexLogoWhite: "",
      knurdzPoweredBy: "",
      knurdzPoweredByLight: "",
    };
  }

  const baseUrl = `${endpoint}/storage/buckets/${bucketId}/files`;
  const projectParam = `project=${encodeURIComponent(projectId)}`;

  return {
    mazexLogo: `${baseUrl}/mazex-logo-white/view?${projectParam}`,
    mazexLogoWhite: `${baseUrl}/mazex-logo-white/view?${projectParam}`,
    knurdzPoweredBy: `${baseUrl}/69cd674d002c1c6adb7d/view?${projectParam}`,
    knurdzPoweredByLight: `${baseUrl}/69cd674d002c1c6adb7d/view?${projectParam}`,
  };
}

function escapeHtml(value) {
  return value
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

function getStoredFileId(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || "";
  }

  if (!value || typeof value !== "object") return "";

  for (const key of ["fileId", "$id", "id"]) {
    if (typeof value[key] === "string" && value[key].trim()) {
      return value[key].trim();
    }
  }

  return "";
}

function getStoredFileName(value) {
  if (!value || typeof value !== "object") return "";

  for (const key of ["fileName", "name", "originalName"]) {
    if (typeof value[key] === "string" && value[key].trim()) {
      return value[key].trim();
    }
  }

  return "";
}

function hasUploadedFileValue(value) {
  return Boolean(getStoredFileName(value) || getStoredFileId(value));
}

function formatAnswerValueForEmail(field, value) {
  if (field.type === "file") {
    return hasUploadedFileValue(value) ? FILE_FIELD_LABEL : "-";
  }

  if (Array.isArray(value)) {
    const normalizedValues = value
      .map((item) => normalizeAnswerValue(item))
      .filter(Boolean);
    return normalizedValues.length > 0 ? normalizedValues.join(", ") : "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  const normalized = normalizeAnswerValue(value);
  return normalized || "-";
}

function formatAnswerHtmlForEmail(field, value) {
  const displayVal = formatAnswerValueForEmail(field, value);
  if (field.type === "file" && displayVal !== "-") {
    return `<span style="display: inline-block; padding: 3px 8px; border-radius: 999px; background-color: #f4f4f5; border: 1px solid #e4e4e7; color: #3f3f46; font-size: 12px; font-weight: 600; line-height: 1.4;">${FILE_FIELD_LABEL}</span>`;
  }

  return escapeHtml(displayVal);
}

function buildEmail(
  recipientName,
  formTitle,
  customTemplateText,
  fields,
  answers,
  memberAnswers,
) {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  const formLine = formTitle ? `Form: ${formTitle}` : null;
  const assets = getEmailAssetUrls();

  const defaultText = [
    "Your MazeX registration was received successfully.",
    formLine,
  ]
    .filter(Boolean)
    .join("\n");

  const templateText = customTemplateText || defaultText;

  const inputsText = [];
  const inputsHtml = [];

  const submissionFields = fields.filter(
    (field) => field.scope === "submission" && field.type !== "page_break",
  );
  const memberFields = fields.filter(
    (field) => field.scope === "member" && field.type !== "page_break",
  );

  if (submissionFields.length > 0) {
    inputsText.push("--- Submission Details ---");
    inputsHtml.push(
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
        <tr>
          <td class="border-color" style="padding-bottom: 16px; border-bottom: 1px solid #e4e4e7;">
            <h3 class="text-dark" style="margin: 0; font-size: 18px; font-weight: 600; color: #18181b;">Submission Details</h3>
          </td>
        </tr>
      </table>`,
    );

    inputsHtml.push(`<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="responsive-table" style="border-collapse: collapse;">`);
    for (const field of submissionFields) {
      const displayVal = formatAnswerValueForEmail(field, answers[field.key]);
      const displayHtml = formatAnswerHtmlForEmail(field, answers[field.key]);
      inputsText.push(`${field.label}: ${displayVal}`);

      inputsHtml.push(`
        <tr>
          <td class="text-muted data-label border-color" style="padding: 12px 8px 12px 0; width: 40%; font-size: 14px; vertical-align: top; color: #71717a; border-bottom: 1px solid #e4e4e7;">${escapeHtml(field.label)}</td>
          <td class="text-dark border-color" style="padding: 12px 0; font-size: 14px; font-weight: 500; vertical-align: top; color: #18181b; border-bottom: 1px solid #e4e4e7;">${displayHtml}</td>
        </tr>
      `);
    }
    inputsHtml.push(`</table>`);
  }

  if (memberAnswers && memberAnswers.length > 0 && memberFields.length > 0) {
    inputsText.push("");
    inputsText.push("--- Team Members ---");

    inputsHtml.push(
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
        <tr>
          <td class="border-color" style="padding-bottom: 16px; border-bottom: 1px solid #e4e4e7;">
            <h3 class="text-dark" style="margin: 0; font-size: 18px; font-weight: 600; color: #18181b;">Team Members</h3>
          </td>
        </tr>
      </table>`,
    );

    memberAnswers.forEach((member, index) => {
      inputsText.push(`Member ${index + 1}:`);
      inputsHtml.push(
        `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="sub-box member-box" style="margin: 16px 0; border-radius: 8px; background-color: #fafafa; border: 1px solid #f4f4f5;">
          <tr>
            <td style="padding: 16px;">
              <h4 class="text-muted" style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a;">Member ${index + 1}</h4>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="responsive-table" style="border-collapse: collapse;">`,
      );

      for (const field of memberFields) {
        const displayVal = formatAnswerValueForEmail(field, member[field.key]);
        const displayHtml = formatAnswerHtmlForEmail(field, member[field.key]);
        inputsText.push(`  ${field.label}: ${displayVal}`);

        inputsHtml.push(`
                <tr>
                  <td class="text-muted data-label border-color" style="padding: 8px 8px 8px 0; width: 40%; font-size: 14px; vertical-align: top; color: #71717a; border-bottom: 1px solid #e4e4e7;">${escapeHtml(field.label)}</td>
                  <td class="text-dark border-color" style="padding: 8px 0; font-size: 14px; font-weight: 500; vertical-align: top; color: #18181b; border-bottom: 1px solid #e4e4e7;">${displayHtml}</td>
                </tr>
        `);
      }
      inputsHtml.push(`
              </table>
            </td>
          </tr>
        </table>`);
    });
  }

  const templateParagraphStyles =
    "margin: 0 0 16px; line-height: 1.7; font-size: 15px; color: #3f3f46;";

  const templateHtml = customTemplateText
    ? customTemplateText
        .split("\n")
        .filter((line, index, lines) => line.trim() || index < lines.length - 1)
        .map((line) =>
          line.trim()
            ? `<p style="${templateParagraphStyles}">${escapeHtml(line)}</p>`
            : `<div style="height: 8px; line-height: 8px; font-size: 8px;">&nbsp;</div>`,
        )
        .join("")
    : `<p style="${templateParagraphStyles}">Your MazeX registration was received successfully.</p>
       ${formLine ? `<p style="${templateParagraphStyles}"><strong>${escapeHtml(formLine)}</strong></p>` : ""}
       <p style="${templateParagraphStyles}">Our team will contact you if any additional steps are required.</p>`;

  const finalHtml = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>MazeX Registration</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; }
    
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: 0 auto !important; }
      .email-wrapper { padding: 12px !important; }
      .content-cell { padding: 28px 20px !important; }
      .responsive-table { width: 100% !important; }
      .data-label { width: 35% !important; }
      .member-box { padding: 12px !important; }
      .header-logo { max-width: 110px !important; }
    }
    
    @media (prefers-color-scheme: dark) {
      body, .body-bg { background-color: #0a0a0f !important; }
      .email-container { background-color: #13131a !important; border-color: #1e1e2e !important; }
      .header-bg { background-color: #000102 !important; }
      .content-cell { background-color: #13131a !important; }
      .text-dark, h3, h4, p, td, strong { color: #f1f5f9 !important; }
      .text-muted { color: #94a3b8 !important; }
      .border-color { border-color: #1e1e2e !important; }
      .sub-box { background-color: #1e1e2e !important; border-color: #27272a !important; }
      .knurdz-card { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
    }

    [data-ogsc] .text-dark, [data-ogsc] h3, [data-ogsc] h4, [data-ogsc] p, [data-ogsc] td { color: #f1f5f9 !important; }
    [data-ogsc] .text-muted { color: #94a3b8 !important; }
    [data-ogsc] .body-bg { background-color: #0a0a0f !important; }
    [data-ogsc] .email-container { background-color: #13131a !important; }
    [data-ogsc] .sub-box { background-color: #1e1e2e !important; }
    [data-ogsc] .knurdz-card { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
  </style>
</head>
<body class="body-bg" style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your MazeX registration has been confirmed &zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="body-bg" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" valign="top" class="email-wrapper" style="padding: 48px 20px 40px; text-align: center;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" class="email-container" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; text-align: left;">
          
          <!-- Header -->
          <tr>
            <td class="header-bg" style="padding: 36px 40px; text-align: center; background-color: #000102;">
              <img src="${assets.mazexLogoWhite}" alt="MazeX" width="200" style="display: inline-block; height: auto; max-height: 64px; width: auto; max-width: 200px;" />
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 40px 44px 36px;">
              
              <p class="text-dark" style="margin: 0 0 24px; font-size: 16px; font-weight: 600; color: #0f172a;">${escapeHtml(greeting)}</p>
              
              <div style="margin-bottom: 32px;">
                ${templateHtml}
              </div>
              
              ${inputsHtml.join("")}
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 40px;">
                <tr>
                  <td class="border-color" style="padding-top: 24px; border-top: 1px solid #e2e8f0;">
                    <p class="text-muted" style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                      Thank you,<br/>
                      <strong class="text-dark" style="color: #0f172a;">MazeX Team</strong>
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
              <div class="knurdz-card" style="display: inline-block; background-color: #ffffff; overflow:hidden; border-radius: 4px; border: 1px solid #e2e8f0; opacity: 0.85;">
                <img src="${assets.knurdzPoweredByLight}" alt="Powered by Knurdz" height="42" style="display: block; height: 42px; width: auto;" />
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automated message from MazeX. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: formTitle
      ? `MazeX registration confirmed: ${formTitle}`
      : "MazeX registration confirmed",
    html: finalHtml,
    text: [
      greeting,
      "",
      templateText,
      "",
      ...inputsText,
      "",
      "Thank you,",
      "MazeX Team",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function lookupUserByEmail(req, email) {
  const result = await createUsersService(req).list({
    queries: [Query.equal("email", email), Query.limit(1)],
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

async function resolveRegistrationTarget(req, params) {
  const normalizedEmail = normalizeEmailAddress(params.email);
  const existingContact = await getExistingContactDocument(req, normalizedEmail);
  const user = await ensureContactUser(req, {
    email: normalizedEmail,
    name: params.name,
    existingUserId: trim(existingContact?.userId),
  });
  const target = await ensureContactTarget(req, {
    userId: user.$id,
    email: normalizedEmail,
    name: params.name,
    existingTargetId: trim(existingContact?.targetId),
  });

  return {
    email: normalizedEmail,
    targetId: target.$id,
  };
}

async function sendRegistrationConfirmationEmail(context) {
  const { req, res, log, error } = context;

  const eventName = String(getHeader(req, "x-appwrite-event") || "");
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
    error("Registration confirmation function received an invalid payload.");
    return res.json({ ok: true, skipped: "invalid_payload" });
  }

  const formId = typeof payload.formId === "string" ? payload.formId.trim() : "";
  if (!formId) {
    error("Registration confirmation function received a submission without formId.");
    return res.json({ ok: true, skipped: "missing_form_id" });
  }

  const databases = createDatabasesService(req);
  const messaging = createMessagingService(req);
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

  if (!form.confirmationEmailEnabled) {
    log(`Skipping confirmation email because it is disabled for form ${formId}.`);
    return res.json({ ok: true, skipped: "email_disabled" });
  }

  const emailField = fieldsResult.documents.find(
    (field) =>
      field.$id === form.confirmationEmailFieldId &&
      field.scope === "submission" &&
      field.type === "email",
  );
  const nameField = fieldsResult.documents.find(
    (field) =>
      field.$id === form.confirmationNameFieldId &&
      field.scope === "submission" &&
      field.type === "text",
  );

  if (!emailField || !nameField) {
    error(`Confirmation email settings are invalid for form ${formId}.`);
    return res.json({ ok: true, skipped: "invalid_form_settings" });
  }

  const parsedAnswers = parseJson(payload.answersJson, {});
  const answers =
    parsedAnswers && typeof parsedAnswers === "object" && !Array.isArray(parsedAnswers)
      ? parsedAnswers
      : {};
  const recipientEmail = normalizeEmailAddress(answers[emailField.key]);
  if (!recipientEmail) {
    log("Skipping confirmation email because the submission has no configured email value.");
    return res.json({ ok: true, skipped: "missing_recipient_email" });
  }

  if (!EMAIL_PATTERN.test(recipientEmail)) {
    log(`Skipping confirmation email because the address is invalid: ${recipientEmail}`);
    return res.json({ ok: true, skipped: "invalid_recipient_email" });
  }

  const recipientName = trimNullable(answers[nameField.key]);
  const formTitle = trim(form.title);
  const customTemplateText = trim(form.confirmationEmailTemplate);
  const parsedMemberAnswers = parseJson(payload.memberAnswersJson, []);
  const memberAnswers = Array.isArray(parsedMemberAnswers) ? parsedMemberAnswers : [];
  const sortedFields = [...fieldsResult.documents].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const contact = await resolveRegistrationTarget(req, {
    email: recipientEmail,
    name: recipientName,
  });
  const email = buildEmail(
    recipientName,
    formTitle,
    customTemplateText,
    sortedFields,
    answers,
    memberAnswers,
  );

  try {
    await messaging.createEmail({
      messageId: ID.unique(),
      subject: email.subject,
      content: email.html,
      targets: [contact.targetId],
      html: true,
    });

    log(`Queued registration confirmation to ${contact.email}`);
    return res.json({ ok: true });
  } catch (sendError) {
    const message =
      sendError instanceof Error ? sendError.message : "Unknown Appwrite Messaging error.";
    error(`Failed to queue registration confirmation email: ${message}`);
    throw sendError;
  }
}

export default sendRegistrationConfirmationEmail;
