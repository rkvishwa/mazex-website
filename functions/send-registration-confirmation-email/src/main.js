import { Client, Databases, Query } from "node-appwrite";
import nodemailer from "nodemailer";

const DEFAULT_SUBMISSIONS_COLLECTION_ID = "registration_submissions";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

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

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getRequiredEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required function environment variable: ${key}`);
  }
  return value;
}

function createDatabasesService(req) {
  const key = String(getHeader(req, "x-appwrite-key") || "").trim();
  if (!key) {
    throw new Error("Missing x-appwrite-key header for Appwrite function execution.");
  }

  const client = new Client()
    .setEndpoint(getRequiredEnv("APPWRITE_FUNCTION_API_ENDPOINT"))
    .setProject(getRequiredEnv("APPWRITE_FUNCTION_PROJECT_ID"))
    .setKey(key);

  return new Databases(client);
}

function getTransportOptions() {
  const host = getRequiredEnv("REGISTRATION_CONFIRMATION_EMAIL_SMTP_HOST");
  const port = Number(getRequiredEnv("REGISTRATION_CONFIRMATION_EMAIL_SMTP_PORT"));
  const secureValue =
    process.env.REGISTRATION_CONFIRMATION_EMAIL_SMTP_SECURE?.trim() || "";
  const username = process.env.REGISTRATION_CONFIRMATION_EMAIL_SMTP_USER?.trim() || "";
  const password = process.env.REGISTRATION_CONFIRMATION_EMAIL_SMTP_PASS?.trim() || "";

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      "REGISTRATION_CONFIRMATION_EMAIL_SMTP_PORT must be a positive integer.",
    );
  }

  if ((username && !password) || (!username && password)) {
    throw new Error(
      "SMTP auth requires both REGISTRATION_CONFIRMATION_EMAIL_SMTP_USER and REGISTRATION_CONFIRMATION_EMAIL_SMTP_PASS.",
    );
  }

  return {
    host,
    port,
    secure: secureValue ? isTruthy(secureValue) : port === 465,
    auth: username ? { user: username, pass: password } : undefined,
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

function buildEmail(recipientName, formTitle, customTemplateText, fields, answers, memberAnswers) {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  const formLine = formTitle ? `Form: ${formTitle}` : null;

  const defaultText = [
    "Your MazeX registration was received successfully.",
    formLine,
    "Our team will contact you if any additional steps are required."
  ].filter(Boolean).join("\n");

  const templateText = customTemplateText || defaultText;

  // Build inputs text
  let inputsText = [];
  let inputsHtml = [];

  const submissionFields = fields.filter(f => f.scope === "submission" && f.type !== "page_break");
  const memberFields = fields.filter(f => f.scope === "member" && f.type !== "page_break");

  if (submissionFields.length > 0) {
    inputsText.push("--- Submission Details ---");
    inputsHtml.push(`<h3 style="margin-top: 32px; margin-bottom: 16px; color: #18181b; font-size: 18px; font-weight: 600; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Submission Details</h3>`);
    
    inputsHtml.push(`<table style="width: 100%; border-collapse: collapse;">`);
    for (const field of submissionFields) {
      let val = answers[field.key];
      if (Array.isArray(val)) val = val.join(", ");
      const displayVal = val !== undefined && val !== null && val !== "" ? String(val) : "-";
      inputsText.push(`${field.label}: ${displayVal}`);
      
      inputsHtml.push(`
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; width: 40%; color: #71717a; font-size: 14px; vertical-align: top;">${escapeHtml(field.label)}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; color: #18181b; font-size: 14px; font-weight: 500; vertical-align: top;">${escapeHtml(displayVal)}</td>
        </tr>
      `);
    }
    inputsHtml.push(`</table>`);
  }

  if (memberAnswers && memberAnswers.length > 0 && memberFields.length > 0) {
    inputsText.push("");
    inputsText.push("--- Team Members ---");
    
    inputsHtml.push(`<h3 style="margin-top: 32px; margin-bottom: 16px; color: #18181b; font-size: 18px; font-weight: 600; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Team Members</h3>`);
    
    memberAnswers.forEach((member, index) => {
      inputsText.push(`Member ${index + 1}:`);
      inputsHtml.push(`<div style="margin-bottom: 24px; background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 16px;">`);
      inputsHtml.push(`<h4 style="margin: 0 0 12px 0; color: #52525b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Member ${index + 1}</h4>`);
      inputsHtml.push(`<table style="width: 100%; border-collapse: collapse;">`);
      
      for (const field of memberFields) {
        let val = member[field.key];
        if (Array.isArray(val)) val = val.join(", ");
        const displayVal = val !== undefined && val !== null && val !== "" ? String(val) : "-";
        inputsText.push(`  ${field.label}: ${displayVal}`);
        
        inputsHtml.push(`
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; width: 40%; color: #71717a; font-size: 14px; vertical-align: top;">${escapeHtml(field.label)}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-size: 14px; font-weight: 500; vertical-align: top;">${escapeHtml(displayVal)}</td>
          </tr>
        `);
      }
      inputsHtml.push(`</table></div>`);
    });
  }

  const templateHtml = customTemplateText
    ? customTemplateText.split('\n').map(line => `<p style="margin-top: 0; margin-bottom: 16px; line-height: 1.6; color: #3f3f46;">${escapeHtml(line)}</p>`).join("")
    : `<p style="margin-top: 0; margin-bottom: 16px; line-height: 1.6; color: #3f3f46;">Your MazeX registration was received successfully.</p>
       ${formLine ? `<p style="margin-top: 0; margin-bottom: 16px; line-height: 1.6; color: #3f3f46;"><strong>${escapeHtml(formLine)}</strong></p>` : ""}
       <p style="margin-top: 0; margin-bottom: 16px; line-height: 1.6; color: #3f3f46;">Our team will contact you if any additional steps are required.</p>`;

  const finalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MazeX Registration</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
      <div style="background-color: #18181b; padding: 32px 40px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">MazeX Registration</h1>
      </div>
      <div style="padding: 40px;">
        <p style="margin-top: 0; margin-bottom: 24px; font-size: 16px; color: #18181b; font-weight: 600;">${escapeHtml(greeting)}</p>
        
        <div style="margin-bottom: 32px;">
          ${templateHtml}
        </div>
        
        ${inputsHtml.join("")}
        
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
          <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
            Thank you,<br/>
            <strong>MazeX Team</strong>
          </p>
        </div>
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">This is an automated message from MazeX. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: formTitle
      ? `MazeX registration confirmed: ${formTitle}`
      : "MazeX registration confirmed",
    text: [
      greeting,
      "",
      templateText,
      "",
      ...inputsText,
      "",
      "Thank you,",
      "MazeX Team",
    ].filter(Boolean).join("\n"),
    html: finalHtml,
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

  const answers = parseJson(payload.answersJson, {});
  const recipientEmail = normalizeAnswerValue(answers[emailField.key]);
  if (!recipientEmail) {
    log("Skipping confirmation email because the submission has no configured email value.");
    return res.json({ ok: true, skipped: "missing_recipient_email" });
  }

  if (!EMAIL_PATTERN.test(recipientEmail)) {
    log(`Skipping confirmation email because the address is invalid: ${recipientEmail}`);
    return res.json({ ok: true, skipped: "invalid_recipient_email" });
  }

  const recipientName = normalizeAnswerValue(answers[nameField.key]);
  const formTitle = typeof form.title === "string" ? form.title.trim() : "";
  const customTemplateText = typeof form.confirmationEmailTemplate === "string" ? form.confirmationEmailTemplate.trim() : "";
  const memberAnswers = parseJson(payload.memberAnswersJson, []);
  const sortedFields = [...fieldsResult.documents].sort((a, b) => a.sortOrder - b.sortOrder);

  try {
    const transporter = nodemailer.createTransport(getTransportOptions());
    const email = buildEmail(recipientName, formTitle, customTemplateText, sortedFields, answers, memberAnswers);

    await transporter.sendMail({
      from: getRequiredEnv("REGISTRATION_CONFIRMATION_EMAIL_FROM"),
      to: recipientEmail,
      replyTo:
        process.env.REGISTRATION_CONFIRMATION_EMAIL_REPLY_TO?.trim() || undefined,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    log(`Sent registration confirmation to ${recipientEmail}`);
    return res.json({ ok: true });
  } catch (sendError) {
    const message =
      sendError instanceof Error ? sendError.message : "Unknown email delivery error.";
    error(`Failed to send registration confirmation email: ${message}`);
    throw sendError;
  }
}

export default sendRegistrationConfirmationEmail;
