import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, Databases, Storage, ID, Query, Models } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { unstable_noStore as noStore } from "next/cache";
import {
  COLOMBO_OFFSET,
  DISPLAY_TIME_ZONE,
  formatDateDisplay,
  getStoredDateFromIso,
  normalizeDateFilterInput,
  parseDisplayDateInput,
} from "@/lib/date-format";
import {
  AppwriteConfigError,
  createAppwriteAdminClient,
  isAppwriteConfigured,
} from "@/lib/appwrite";
import {
  findCommonUserFieldInForm,
  normalizeCommonUserFieldValue,
} from "@/lib/registration-common-fields";
import type {
  FieldDefinition,
  FieldOption,
  FieldScope,
  FieldType,
  FormAvailability,
  FormCard,
  FormDefinition,
  FormWithFields,
  RegistrationFormKind,
  RegistrationFormStatus,
  RegistrationOverview,
  RegistrationOverviewItem,
  SubmissionAnswerValue,
  SubmissionDetail,
  SubmissionFilters,
  SubmissionPage,
  SubmissionPayload,
} from "@/lib/registration-types";
import {
  fieldTypeSupportsCaseSensitiveUnique,
  fieldTypeSupportsPlaceholder,
  fieldTypeSupportsUnique,
  REGISTRATION_FIELD_SCOPES,
  REGISTRATION_FIELD_TYPES,
  REGISTRATION_FORM_KINDS,
  REGISTRATION_FORM_STATUSES,
  type RegistrationOverviewAnalytics,
  type RegistrationOverviewCategoryBreakdownPoint,
  type RegistrationOverviewFormBreakdownPoint,
  type RegistrationOverviewTrendPoint,
  type RegistrationOverviewWeekdayPoint,
} from "@/lib/registration-types";

// ─── Document row types ──────────────────────────────────────────────────────

type FormDoc = Models.Document & {
  slug?: string;
  title?: string;
  description?: string | null;
  kind?: string;
  status?: string;
  openAt?: string | null;
  closeAt?: string | null;
  successMessage?: string | null;
  confirmationEmailEnabled?: boolean;
  confirmationEmailTemplate?: string | null;
  confirmationEmailFieldId?: string | null;
  confirmationNameFieldId?: string | null;
  googleSheetsSyncEnabled?: boolean;
  googleSheetsAdminUserId?: string | null;
  googleSheetsSheetTitle?: string | null;
  teamMinMembers?: number;
  teamMaxMembers?: number;
  bannerFileId?: string | null;
  sortOrder?: number;
};

type FormGoogleSheetsSyncDoc = Models.Document & {
  formId?: string;
  selectedFieldIdsJson?: string | null;
};

type FieldDoc = Models.Document & {
  formId?: string;
  scope?: string;
  key?: string;
  label?: string;
  type?: string;
  required?: boolean;
  sortOrder?: number;
  optionsJson?: string | null;
  placeholder?: string | null;
  helpText?: string | null;
  isUnique?: boolean;
  uniqueCaseSensitive?: boolean;
};

type SubmissionDoc = Models.Document & {
  formId?: string;
  teamName?: string | null;
  answersJson?: string;
  memberAnswersJson?: string | null;
  searchText?: string | null;
};

type UniqueValueDoc = Models.Document & {
  formId?: string;
  fieldId?: string;
  valueHash?: string;
  valuePreview?: string | null;
  submissionId?: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SUCCESS_MESSAGE =
  "Registration received successfully. We will contact you with the next steps.";
const PAGE_SIZE_DEFAULT = 20;
const MAX_ROW_PAGE_SIZE = 100;
const UNIQUE_VALUE_PREVIEW_LIMIT = 255;
const ANALYTICS_TREND_DAYS = 14;
const ANALYTICS_WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

// ─── Config helpers ──────────────────────────────────────────────────────────

function getRegistrationsConfig() {
  const databaseId = process.env.APPWRITE_DB_ID?.trim();
  const formsCollectionId = process.env.APPWRITE_COLLECTION_REGISTRATION_FORMS?.trim();
  const fieldsCollectionId = process.env.APPWRITE_COLLECTION_REGISTRATION_FIELDS?.trim();
  const submissionsCollectionId = process.env.APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS?.trim();
  const uniqueValuesCollectionId =
    process.env.APPWRITE_COLLECTION_REGISTRATION_UNIQUE_VALUES?.trim() ||
    "registration_unique_values";
  const googleSheetsFormSyncsCollectionId =
    process.env.APPWRITE_COLLECTION_GOOGLE_SHEETS_FORM_SYNCS?.trim() ||
    "google_sheets_form_syncs";
  const bannersBucketId = process.env.APPWRITE_BUCKET_FORM_BANNERS?.trim();
  const filesBucketId =
    process.env.APPWRITE_BUCKET_REGISTRATION_FILES?.trim() || "registration_files";

  const missing = [
    !databaseId && "APPWRITE_DB_ID",
    !formsCollectionId && "APPWRITE_COLLECTION_REGISTRATION_FORMS",
    !fieldsCollectionId && "APPWRITE_COLLECTION_REGISTRATION_FIELDS",
    !submissionsCollectionId && "APPWRITE_COLLECTION_REGISTRATION_SUBMISSIONS",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new AppwriteConfigError(
      `Missing Appwrite registration env vars: ${missing.join(", ")}`,
    );
  }

  return {
    databaseId: databaseId!,
    formsCollectionId: formsCollectionId!,
    fieldsCollectionId: fieldsCollectionId!,
    submissionsCollectionId: submissionsCollectionId!,
    uniqueValuesCollectionId,
    googleSheetsFormSyncsCollectionId,
    bannersBucketId: bannersBucketId ?? "form_banners",
    filesBucketId,
  };
}

export function isRegistrationsConfigured() {
  try {
    getRegistrationsConfig();
    return isAppwriteConfigured();
  } catch {
    return false;
  }
}

function createDatabasesService() {
  return new Databases(createAppwriteAdminClient());
}

function createStorageService() {
  return new Storage(createAppwriteAdminClient());
}

export class UniqueFieldConflictError extends Error {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super("One or more fields must be unique.");
    this.name = "UniqueFieldConflictError";
    this.fieldErrors = fieldErrors;
  }
}

export class FormSubmissionNotAllowedError extends Error {
  formId: string | null;

  constructor(message: string, formId: string | null = null) {
    super(message);
    this.name = "FormSubmissionNotAllowedError";
    this.formId = formId;
  }
}

// ─── Type guards ─────────────────────────────────────────────────────────────

function isRegistrationFormKind(v: unknown): v is RegistrationFormKind {
  return typeof v === "string" && REGISTRATION_FORM_KINDS.includes(v as RegistrationFormKind);
}

function isRegistrationFormStatus(v: unknown): v is RegistrationFormStatus {
  return (
    typeof v === "string" &&
    REGISTRATION_FORM_STATUSES.includes(v as RegistrationFormStatus)
  );
}

function isFieldScope(v: unknown): v is FieldScope {
  return typeof v === "string" && REGISTRATION_FIELD_SCOPES.includes(v as FieldScope);
}

function isFieldType(v: unknown): v is FieldType {
  return typeof v === "string" && REGISTRATION_FIELD_TYPES.includes(v as FieldType);
}

// ─── String helpers ───────────────────────────────────────────────────────────

function trim(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function trimNullable(v: unknown) {
  const s = trim(v);
  return s || null;
}

function parseJson<T>(v: string | null | undefined, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => trim(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeUniqueComparableValue(
  field: Pick<FieldDefinition, "type" | "isUnique" | "uniqueCaseSensitive" | "label">,
  value: SubmissionAnswerValue,
) {
  if (!field.isUnique || !fieldTypeSupportsUnique(field.type)) return null;
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) || value instanceof File || typeof value === "boolean") return null;

  const raw = typeof value === "number" ? String(value) : String(value).trim();
  if (!raw) return null;

  return field.uniqueCaseSensitive ? raw : raw.toLocaleLowerCase("en-US");
}

function hashUniqueComparableValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildUniqueFieldErrorMessage(
  field: Pick<FieldDefinition, "label" | "uniqueCaseSensitive">,
) {
  return field.uniqueCaseSensitive
    ? `${field.label} must be unique. This exact value has already been used.`
    : `${field.label} must be unique. A matching value already exists.`;
}

async function listAllDocumentsByQueries<T extends Models.Document>(
  collectionId: string,
  baseQueries: string[],
  pageSize = 100,
) {
  const { databaseId } = getRegistrationsConfig();
  const db = createDatabasesService();
  const documents: T[] = [];
  let offset = 0;

  while (true) {
    const page = await db.listDocuments<T>(databaseId, collectionId, [
      ...baseQueries,
      Query.limit(pageSize),
      Query.offset(offset),
    ]);

    documents.push(...page.documents);
    if (page.documents.length < pageSize) break;
    offset += page.documents.length;
  }

  return documents;
}

// ─── Option / Validation normalizers ─────────────────────────────────────────

function normalizeFieldOptions(raw: unknown): FieldOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { value?: unknown }).value === "string"
      ) {
        const label = ((item as { label: string }).label).trim();
        const value = ((item as { value: string }).value).trim();
        if (label && value) return { label, value };
      }
      return null;
    })
    .filter((x): x is FieldOption => x !== null);
}

// ─── Document mappers ─────────────────────────────────────────────────────────

function mapFormDoc(doc: FormDoc): FormDefinition | null {
  const slug = trim(doc.slug);
  const title = trim(doc.title);
  if (!slug || !title || !isRegistrationFormKind(doc.kind)) return null;

  return {
    id: doc.$id,
    slug,
    title,
    description: trimNullable(doc.description),
    kind: doc.kind,
    status: isRegistrationFormStatus(doc.status) ? doc.status : "draft",
    openAt: trimNullable(doc.openAt),
    closeAt: trimNullable(doc.closeAt),
    successMessage: trimNullable(doc.successMessage),
    confirmationEmailEnabled: Boolean(doc.confirmationEmailEnabled),
    confirmationEmailTemplate: doc.confirmationEmailTemplate || null,
    confirmationEmailFieldId: trimNullable(doc.confirmationEmailFieldId),
    confirmationNameFieldId: trimNullable(doc.confirmationNameFieldId),
    googleSheetsSyncEnabled: Boolean(doc.googleSheetsSyncEnabled),
    googleSheetsSelectedFieldIds: [],
    googleSheetsAdminUserId: trimNullable(doc.googleSheetsAdminUserId),
    googleSheetsSheetTitle: trimNullable(doc.googleSheetsSheetTitle),
    teamMinMembers:
      typeof doc.teamMinMembers === "number" && Number.isFinite(doc.teamMinMembers)
        ? doc.teamMinMembers
        : 1,
    teamMaxMembers:
      typeof doc.teamMaxMembers === "number" && Number.isFinite(doc.teamMaxMembers)
        ? doc.teamMaxMembers
        : 1,
    bannerFileId: trimNullable(doc.bannerFileId),
    sortOrder:
      typeof doc.sortOrder === "number" && Number.isFinite(doc.sortOrder)
        ? doc.sortOrder
        : 0,
  };
}

function mapFieldDoc(doc: FieldDoc): FieldDefinition | null {
  const formId = trim(doc.formId);
  const key = trim(doc.key);
  const label = trim(doc.label);
  if (!formId || !key || !label || !isFieldScope(doc.scope) || !isFieldType(doc.type))
    return null;

  return {
    id: doc.$id,
    formId,
    scope: doc.scope,
    key,
    label,
    type: doc.type,
    required: Boolean(doc.required),
    sortOrder:
      typeof doc.sortOrder === "number" && Number.isFinite(doc.sortOrder)
        ? doc.sortOrder
        : 0,
    options: normalizeFieldOptions(parseJson(doc.optionsJson, [])),
    placeholder: fieldTypeSupportsPlaceholder(doc.type)
      ? trimNullable(doc.placeholder)
      : null,
    helpText: doc.type === "page_break" ? null : trimNullable(doc.helpText),
    isUnique:
      fieldTypeSupportsUnique(doc.type) && doc.type !== "page_break"
        ? Boolean(doc.isUnique)
        : false,
    uniqueCaseSensitive:
      fieldTypeSupportsUnique(doc.type) &&
      fieldTypeSupportsCaseSensitiveUnique(doc.type) &&
      Boolean(doc.isUnique) &&
      Boolean(doc.uniqueCaseSensitive),
  };
}

function mapSubmissionDoc(
  doc: SubmissionDoc,
  formsById: Map<string, FormDefinition | FormWithFields>,
): SubmissionDetail | null {
  const formId = trim(doc.formId);
  if (!formId) return null;

  const form = formsById.get(formId);
  const answers = parseJson<Record<string, SubmissionAnswerValue>>(doc.answersJson, {});

  let displayTitle = "Submission";
  let displaySubtitle: string | null = null;

  const readAnswerText = (value: SubmissionAnswerValue | undefined) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed || null;
  };

  const joinContactValues = (...values: Array<string | null>) => {
    const parts = values.filter((value): value is string => Boolean(value));
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  if (form && "fields" in form) {
    const textFields = form.fields.filter(
      (field) =>
        field.scope === "submission" &&
        (field.type === "text" ||
          field.type === "textarea" ||
          field.type === "email" ||
          field.type === "tel"),
    );
    const nameField =
      textFields.find((field) => field.label.toLowerCase().includes("name")) ??
      textFields.find((field) => field.type === "text") ??
      textFields.find((field) => field.type === "textarea") ??
      textFields[0];
    const emailField = textFields.find((field) => field.type === "email") ?? null;
    const phoneField = textFields.find((field) => field.type === "tel") ?? null;

    const titleValue = nameField ? readAnswerText(answers[nameField.key]) : null;
    const emailValue = emailField ? readAnswerText(answers[emailField.key]) : null;
    const phoneValue = phoneField ? readAnswerText(answers[phoneField.key]) : null;

    if (titleValue) {
      displayTitle = titleValue;
    }

    displaySubtitle = joinContactValues(emailValue, phoneValue);
  }

  // Fallback if no specific fields matched, but we have answers
  if (displayTitle === "Submission" && Object.keys(answers).length > 0) {
    const values = Object.values(answers).filter(
      (value): value is string => typeof value === "string" && value.trim() !== "",
    );
    if (values.length > 0) {
      displayTitle = String(values[0]).trim();
    }
    if (values.length > 1 && !displaySubtitle) {
      displaySubtitle = String(values[1]).trim();
    }
  }

  return {
    id: doc.$id,
    formId,
    formSlug: form?.slug ?? null,
    formTitle: form?.title ?? null,
    createdAt: doc.$createdAt,
    displayTitle,
    displaySubtitle,
    teamName: trimNullable(doc.teamName),
    answers,
    memberAnswers: parseJson<Record<string, SubmissionAnswerValue>[]>(
      doc.memberAnswersJson,
      [],
    ),
  };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function sortForms(forms: FormDefinition[]) {
  return [...forms].sort((a, b) => {
    const aLower = a.title.toLowerCase();
    const bLower = b.title.toLowerCase();
    const aIsComp = aLower.includes("registration") && aLower.includes("competition");
    const bIsComp = bLower.includes("registration") && bLower.includes("competition");

    if (aIsComp && !bIsComp) return -1;
    if (!aIsComp && bIsComp) return 1;

    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title);
  });
}

function sortFields(fields: FieldDefinition[]) {
  return [...fields].sort((a, b) => {
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label);
  });
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export function getFormAvailability(form: FormDefinition): FormAvailability {
  const now = new Date();
  const openAt = form.openAt ? new Date(form.openAt) : null;
  const closeAt = form.closeAt ? new Date(form.closeAt) : null;

  if (form.status === "closed") {
    return {
      state: "closed",
      label: "Closed",
      description: closeAt ? `Closed on ${formatDateDisplay(form.closeAt!)}` : null,
      isAcceptingSubmissions: false,
    };
  }

  if (openAt && now < openAt) {
    return {
      state: "upcoming",
      label: "Opens soon",
      description: `Opens ${formatDateDisplay(form.openAt!)}`,
      isAcceptingSubmissions: false,
    };
  }

  if (form.status === "draft") {
    return {
      state: "upcoming",
      label: "Coming soon",
      description: closeAt ? `Closes ${formatDateDisplay(form.closeAt!)}` : null,
      isAcceptingSubmissions: false,
    };
  }

  if (closeAt && now > closeAt) {
    return {
      state: "closed",
      label: "Closed",
      description: `Closed on ${formatDateDisplay(form.closeAt!)}`,
      isAcceptingSubmissions: false,
    };
  }

  return {
    state: "open",
    label: "Open now",
    description: closeAt ? `Closes ${formatDateDisplay(form.closeAt!)}` : null,
    isAcceptingSubmissions: true,
  };
}

// ─── Banner URL ───────────────────────────────────────────────────────────────

export function getFormBannerUrl(bannerFileId: string): string {
  const endpoint = process.env.APPWRITE_ENDPOINT?.trim().replace(/\/+$/, "") ?? "";
  const projectId = process.env.APPWRITE_PROJECT_ID?.trim() ?? "";
  const bucketId = process.env.APPWRITE_BUCKET_FORM_BANNERS?.trim() ?? "form_banners";
  return `${endpoint}/storage/buckets/${bucketId}/files/${bannerFileId}/view?project=${projectId}`;
}

// ─── Form list ────────────────────────────────────────────────────────────────

type ListRegistrationFormsOptions = {
  skipSiteEventAutoSync?: boolean;
};

async function syncSiteEventDateTransitionsBeforeRead() {
  try {
    const { syncSiteEventDateTransitionsIfNeeded } = await import("@/lib/site-events");
    await syncSiteEventDateTransitionsIfNeeded();
  } catch {
    // Form reads should still work even if the event auto-sync write fails.
  }
}

export async function listRegistrationForms(
  options: ListRegistrationFormsOptions = {},
): Promise<FormDefinition[]> {
  noStore();
  if (!isAppwriteConfigured() || !isRegistrationsConfigured()) return [];

  try {
    if (!options.skipSiteEventAutoSync) {
      await syncSiteEventDateTransitionsBeforeRead();
    }

    const { databaseId, formsCollectionId } = getRegistrationsConfig();
    const result = await createDatabasesService().listDocuments<FormDoc>(
      databaseId,
      formsCollectionId,
      [Query.limit(100)],
    );
    const forms = sortForms(
      result.documents.map(mapFormDoc).filter((f): f is FormDefinition => f !== null),
    );
    const selectedFieldIdsByFormId = mapGoogleSheetsSelectedFieldIdsByFormId(
      await listGoogleSheetsFormSyncDocsByQueries([]),
    );

    return forms.map((form) => ({
      ...form,
      googleSheetsSelectedFieldIds:
        selectedFieldIdsByFormId.get(form.id) ?? form.googleSheetsSelectedFieldIds,
    }));
  } catch {
    return [];
  }
}

export async function listRegistrationFormCards(): Promise<FormCard[]> {
  const forms = await listRegistrationForms();
  return forms.map((form) => ({ ...form, availability: getFormAvailability(form) }));
}

// ─── Get single form ──────────────────────────────────────────────────────────

export async function getRegistrationFormBySlug(
  slug: string,
): Promise<FormWithFields | null> {
  noStore();
  const s = slug.trim();
  if (!s || !isAppwriteConfigured() || !isRegistrationsConfigured()) return null;

  try {
    await syncSiteEventDateTransitionsBeforeRead();

    const { databaseId, formsCollectionId, fieldsCollectionId } = getRegistrationsConfig();
    const db = createDatabasesService();

    const formResult = await db.listDocuments<FormDoc>(databaseId, formsCollectionId, [
      Query.equal("slug", s),
      Query.limit(1),
    ]);

    const formDoc = formResult.documents[0];
    if (!formDoc) return null;

    const form = mapFormDoc(formDoc);
    if (!form) return null;

    const fieldsResult = await db.listDocuments<FieldDoc>(
      databaseId,
      fieldsCollectionId,
      [Query.equal("formId", form.id), Query.limit(200)],
    );

    const fields = sortFields(
      fieldsResult.documents
        .map(mapFieldDoc)
        .filter((f): f is FieldDefinition => f !== null),
    );

    return {
      ...form,
      fields,
      googleSheetsSelectedFieldIds: await getGoogleSheetsSelectedFieldIdsForForm(form.id),
    };
  } catch {
    return null;
  }
}

export async function getRegistrationFormById(
  formId: string,
): Promise<FormWithFields | null> {
  noStore();
  if (!formId.trim() || !isAppwriteConfigured() || !isRegistrationsConfigured())
    return null;

  try {
    await syncSiteEventDateTransitionsBeforeRead();

    const { databaseId, formsCollectionId, fieldsCollectionId } = getRegistrationsConfig();
    const db = createDatabasesService();

    const [formDoc, fieldsResult, googleSheetsSelectedFieldIds] = await Promise.all([
      db.getDocument<FormDoc>(databaseId, formsCollectionId, formId),
      db.listDocuments<FieldDoc>(databaseId, fieldsCollectionId, [
        Query.equal("formId", formId),
        Query.limit(200),
      ]),
      getGoogleSheetsSelectedFieldIdsForForm(formId),
    ]);

    const form = mapFormDoc(formDoc);
    if (!form) return null;

    const fields = sortFields(
      fieldsResult.documents
        .map(mapFieldDoc)
        .filter((f): f is FieldDefinition => f !== null),
    );

    return { ...form, fields, googleSheetsSelectedFieldIds };
  } catch {
    return null;
  }
}

// ─── Create / Delete form ─────────────────────────────────────────────────────

export async function createRegistrationForm(params: {
  slug: string;
  title: string;
  description: string | null;
  kind: RegistrationFormKind;
  sortOrder: number;
}) {
  const { databaseId, formsCollectionId } = getRegistrationsConfig();
  return createDatabasesService().createDocument<FormDoc>(
    databaseId,
    formsCollectionId,
    ID.unique(),
    {
      slug: params.slug,
      title: params.title,
      description: params.description,
      kind: params.kind,
      status: "draft",
      openAt: null,
      closeAt: null,
      successMessage:
        "Registration received successfully. We will contact you with the next steps.",
      confirmationEmailEnabled: false,
      confirmationEmailTemplate: null,
      confirmationEmailFieldId: null,
      confirmationNameFieldId: null,
      googleSheetsSyncEnabled: false,
      googleSheetsAdminUserId: null,
      googleSheetsSheetTitle: null,
      teamMinMembers: 1,
      teamMaxMembers: 1,
      bannerFileId: null,
      sortOrder: params.sortOrder,
    },
  );
}

async function deleteUniqueValueReservationDocuments(documentIds: string[]) {
  if (documentIds.length === 0) return;

  const { databaseId, uniqueValuesCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();

  await Promise.all(
    documentIds.map(async (documentId) => {
      try {
        await db.deleteDocument(databaseId, uniqueValuesCollectionId, documentId);
      } catch (error) {
        if (!(error instanceof AppwriteException) || error.code !== 404) {
          throw error;
        }
      }
    }),
  );
}

async function deleteUniqueValueReservationsByFieldIds(fieldIds: string[]) {
  if (fieldIds.length === 0) return;

  const { uniqueValuesCollectionId } = getRegistrationsConfig();

  try {
    const docs = (
      await Promise.all(
        fieldIds.map((fieldId) =>
          listAllDocumentsByQueries<UniqueValueDoc>(uniqueValuesCollectionId, [
            Query.equal("fieldId", fieldId),
          ]),
        ),
      )
    ).flat();

    await deleteUniqueValueReservationDocuments(docs.map((doc) => doc.$id));
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) {
      throw error;
    }
  }
}

async function deleteUniqueValueReservationsByFormId(formId: string) {
  const { uniqueValuesCollectionId } = getRegistrationsConfig();

  try {
    const docs = await listAllDocumentsByQueries<UniqueValueDoc>(
      uniqueValuesCollectionId,
      [Query.equal("formId", formId)],
    );
    await deleteUniqueValueReservationDocuments(docs.map((doc) => doc.$id));
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) {
      throw error;
    }
  }
}

async function listGoogleSheetsFormSyncDocsByQueries(baseQueries: string[]) {
  const { googleSheetsFormSyncsCollectionId } = getRegistrationsConfig();

  try {
    return await listAllDocumentsByQueries<FormGoogleSheetsSyncDoc>(
      googleSheetsFormSyncsCollectionId,
      baseQueries,
    );
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      return [];
    }

    throw error;
  }
}

function mapGoogleSheetsSelectedFieldIdsByFormId(
  docs: FormGoogleSheetsSyncDoc[],
) {
  const selectedFieldIdsByFormId = new Map<string, string[]>();

  for (const doc of docs) {
    const formId = trim(doc.formId);
    if (!formId) continue;

    selectedFieldIdsByFormId.set(
      formId,
      normalizeStringArray(parseJson(doc.selectedFieldIdsJson, [])),
    );
  }

  return selectedFieldIdsByFormId;
}

async function getGoogleSheetsSelectedFieldIdsForForm(formId: string) {
  if (!trim(formId)) return [];

  const docs = await listGoogleSheetsFormSyncDocsByQueries([
    Query.equal("formId", formId),
  ]);

  return mapGoogleSheetsSelectedFieldIdsByFormId(docs).get(formId) ?? [];
}

async function upsertGoogleSheetsFormSync(
  formId: string,
  selectedFieldIds: string[],
) {
  const normalizedFormId = trim(formId);
  if (!normalizedFormId) return;

  const {
    databaseId,
    googleSheetsFormSyncsCollectionId,
  } = getRegistrationsConfig();
  const db = createDatabasesService();
  const data = {
    formId: normalizedFormId,
    selectedFieldIdsJson: JSON.stringify(selectedFieldIds),
  };

  try {
    await db.updateDocument(
      databaseId,
      googleSheetsFormSyncsCollectionId,
      normalizedFormId,
      data,
    );
    return;
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) {
      throw error;
    }
  }

  await db.createDocument(
    databaseId,
    googleSheetsFormSyncsCollectionId,
    normalizedFormId,
    data,
  );
}

async function deleteGoogleSheetsFormSync(formId: string) {
  const normalizedFormId = trim(formId);
  if (!normalizedFormId) return;

  const {
    databaseId,
    googleSheetsFormSyncsCollectionId,
  } = getRegistrationsConfig();
  const db = createDatabasesService();

  try {
    await db.deleteDocument(
      databaseId,
      googleSheetsFormSyncsCollectionId,
      normalizedFormId,
    );
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) {
      throw error;
    }
  }
}

export async function releaseUniqueValueReservations(documentIds: string[]) {
  await deleteUniqueValueReservationDocuments(documentIds);
}

export async function attachUniqueValueReservationsToSubmission(
  documentIds: string[],
  submissionId: string,
) {
  if (documentIds.length === 0 || !submissionId.trim()) return;

  const { databaseId, uniqueValuesCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();

  await Promise.all(
    documentIds.map((documentId) =>
      db
        .updateDocument(databaseId, uniqueValuesCollectionId, documentId, {
          submissionId,
        })
        .catch(() => {}),
    ),
  );
}

export async function uploadRegistrationFile(file: File): Promise<string> {
  const { filesBucketId } = getRegistrationsConfig();
  const storage = createStorageService();
  const buffer = Buffer.from(await file.arrayBuffer());
  const inputFile = InputFile.fromBuffer(buffer, file.name);
  const uploaded = await storage.createFile(filesBucketId, ID.unique(), inputFile);
  return uploaded.$id;
}

export async function deleteRegistrationFiles(fileIds: string[]) {
  if (fileIds.length === 0) return;

  const { filesBucketId } = getRegistrationsConfig();
  const storage = createStorageService();

  await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        await storage.deleteFile(filesBucketId, fileId);
      } catch (error) {
        if (!(error instanceof AppwriteException) || error.code !== 404) {
          throw error;
        }
      }
    }),
  );
}

export async function deleteRegistrationForm(formId: string) {
  const { databaseId, formsCollectionId, fieldsCollectionId, submissionsCollectionId } =
    getRegistrationsConfig();
  const db = createDatabasesService();

  // Delete all fields for this form
  const fieldsResult = await db.listDocuments<FieldDoc>(databaseId, fieldsCollectionId, [
    Query.equal("formId", formId),
    Query.limit(200),
  ]);
  await Promise.all(
    fieldsResult.documents.map((doc) =>
      db.deleteDocument(databaseId, fieldsCollectionId, doc.$id),
    ),
  );

  // Delete all submissions for this form
  const subsResult = await db.listDocuments<SubmissionDoc>(
    databaseId,
    submissionsCollectionId,
    [Query.equal("formId", formId), Query.limit(100)],
  );
  await Promise.all(
    subsResult.documents.map((doc) =>
      db.deleteDocument(databaseId, submissionsCollectionId, doc.$id),
    ),
  );

  await deleteUniqueValueReservationsByFormId(formId);
  await deleteGoogleSheetsFormSync(formId);

  // Delete the form
  return db.deleteDocument(databaseId, formsCollectionId, formId);
}

// ─── Update form settings ─────────────────────────────────────────────────────

export async function updateRegistrationFormSettings(params: {
  formId: string;
  slug: string;
  title: string;
  description: string | null;
  kind: RegistrationFormKind;
  status: RegistrationFormStatus;
  openAt: string | null;
  closeAt: string | null;
  successMessage: string | null;
  confirmationEmailEnabled: boolean;
  confirmationEmailTemplate?: string | null;
  confirmationEmailFieldId: string | null;
  confirmationNameFieldId: string | null;
  googleSheetsSyncEnabled: boolean;
  googleSheetsSelectedFieldIds: string[];
  googleSheetsAdminUserId: string | null;
  googleSheetsSheetTitle: string | null;
  teamMinMembers: number;
  teamMaxMembers: number;
}) {
  const { databaseId, formsCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();
  const updatedForm = await db.updateDocument<FormDoc>(
    databaseId,
    formsCollectionId,
    params.formId,
    {
      slug: params.slug,
      title: params.title,
      description: params.description,
      kind: params.kind,
      status: params.status,
      openAt: params.openAt,
      closeAt: params.closeAt,
      successMessage: params.successMessage ?? DEFAULT_SUCCESS_MESSAGE,
      confirmationEmailEnabled: params.confirmationEmailEnabled,
      confirmationEmailTemplate: params.confirmationEmailTemplate || null,
      confirmationEmailFieldId: params.confirmationEmailFieldId,
      confirmationNameFieldId: params.confirmationNameFieldId,
      googleSheetsSyncEnabled: params.googleSheetsSyncEnabled,
      googleSheetsAdminUserId: params.googleSheetsAdminUserId,
      googleSheetsSheetTitle: params.googleSheetsSheetTitle,
      teamMinMembers: params.teamMinMembers,
      teamMaxMembers: params.teamMaxMembers,
    },
  );

  await upsertGoogleSheetsFormSync(
    params.formId,
    params.googleSheetsSelectedFieldIds,
  );

  return updatedForm;
}

// ─── Banner management ────────────────────────────────────────────────────────

export async function uploadFormBanner(
  formId: string,
  file: File,
): Promise<string> {
  const { databaseId, formsCollectionId, bannersBucketId } = getRegistrationsConfig();
  const storage = createStorageService();
  const db = createDatabasesService();

  // Get current form to delete old banner if it exists
  const formDoc = await db.getDocument<FormDoc>(databaseId, formsCollectionId, formId);
  if (formDoc.bannerFileId) {
    try {
      await storage.deleteFile(bannersBucketId, formDoc.bannerFileId);
    } catch {
      // Ignore — file may already be deleted
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const inputFile = InputFile.fromBuffer(buffer, file.name);
  const uploaded = await storage.createFile(bannersBucketId, ID.unique(), inputFile);

  await db.updateDocument(databaseId, formsCollectionId, formId, {
    bannerFileId: uploaded.$id,
  });

  return uploaded.$id;
}

export async function deleteFormBanner(formId: string): Promise<void> {
  const { databaseId, formsCollectionId, bannersBucketId } = getRegistrationsConfig();
  const db = createDatabasesService();
  const storage = createStorageService();

  const formDoc = await db.getDocument<FormDoc>(databaseId, formsCollectionId, formId);
  if (formDoc.bannerFileId) {
    try {
      await storage.deleteFile(bannersBucketId, formDoc.bannerFileId);
    } catch {
      // Ignore
    }
    await db.updateDocument(databaseId, formsCollectionId, formId, {
      bannerFileId: null,
    });
  }
}

// ─── Fields ───────────────────────────────────────────────────────────────────

export async function createRegistrationField(params: {
  formId: string;
  scope: FieldScope;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  sortOrder: number;
  options: FieldOption[];
  placeholder: string | null;
  helpText: string | null;
  isUnique: boolean;
  uniqueCaseSensitive: boolean;
}) {
  const { databaseId, fieldsCollectionId } = getRegistrationsConfig();
  return createDatabasesService().createDocument<FieldDoc>(
    databaseId,
    fieldsCollectionId,
    ID.unique(),
    {
      formId: params.formId,
      scope: params.scope,
      key: params.key,
      label: params.label,
      type: params.type,
      required: params.required,
      sortOrder: params.sortOrder,
      optionsJson: JSON.stringify(params.options),
      placeholder: params.placeholder,
      helpText: params.helpText,
      isUnique: params.isUnique,
      uniqueCaseSensitive: params.uniqueCaseSensitive,
    },
  );
}

export async function updateRegistrationField(params: {
  fieldId: string;
  formId: string;
  scope: FieldScope;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  sortOrder: number;
  options: FieldOption[];
  placeholder: string | null;
  helpText: string | null;
  isUnique: boolean;
  uniqueCaseSensitive: boolean;
}) {
  const { databaseId, fieldsCollectionId } = getRegistrationsConfig();
  return createDatabasesService().updateDocument<FieldDoc>(
    databaseId,
    fieldsCollectionId,
    params.fieldId,
    {
      formId: params.formId,
      scope: params.scope,
      key: params.key,
      label: params.label,
      type: params.type,
      required: params.required,
      sortOrder: params.sortOrder,
      optionsJson: JSON.stringify(params.options),
      placeholder: params.placeholder,
      helpText: params.helpText,
      isUnique: params.isUnique,
      uniqueCaseSensitive: params.uniqueCaseSensitive,
    },
  );
}

export async function deleteRegistrationField(fieldId: string) {
  const { databaseId, fieldsCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();
  await deleteUniqueValueReservationsByFieldIds([fieldId]);
  return db.deleteDocument(databaseId, fieldsCollectionId, fieldId);
}

export async function updateRegistrationFieldOrders(updates: { id: string; sortOrder: number }[]) {
  const { databaseId, fieldsCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();
  return Promise.all(
    updates.map((update) =>
      db.updateDocument(databaseId, fieldsCollectionId, update.id, {
        sortOrder: update.sortOrder,
      })
    )
  );
}

export async function bulkSaveRegistrationFields(params: {
  formId: string;
  creates: {
    scope: FieldScope;
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    sortOrder: number;
    options: FieldOption[];
    placeholder: string | null;
    helpText: string | null;
    isUnique: boolean;
    uniqueCaseSensitive: boolean;
  }[];
  updates: {
    fieldId: string;
    scope: FieldScope;
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    sortOrder: number;
    options: FieldOption[];
    placeholder: string | null;
    helpText: string | null;
    isUnique: boolean;
    uniqueCaseSensitive: boolean;
  }[];
  deletes: string[];
}) {
  const { databaseId, fieldsCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();

  const createPromises = params.creates.map((c) =>
    db.createDocument<FieldDoc>(databaseId, fieldsCollectionId, ID.unique(), {
      formId: params.formId,
      scope: c.scope,
      key: c.key,
      label: c.label,
      type: c.type,
      required: c.required,
      sortOrder: c.sortOrder,
      optionsJson: JSON.stringify(c.options),
      placeholder: c.placeholder,
      helpText: c.helpText,
      isUnique: c.isUnique,
      uniqueCaseSensitive: c.uniqueCaseSensitive,
    })
  );

  const updatePromises = params.updates.map((u) =>
    db.updateDocument<FieldDoc>(databaseId, fieldsCollectionId, u.fieldId, {
      formId: params.formId, // Technically shouldn't change, but good for completeness
      scope: u.scope,
      key: u.key,
      label: u.label,
      type: u.type,
      required: u.required,
      sortOrder: u.sortOrder,
      optionsJson: JSON.stringify(u.options),
      placeholder: u.placeholder,
      helpText: u.helpText,
      isUnique: u.isUnique,
      uniqueCaseSensitive: u.uniqueCaseSensitive,
    })
  );

  const deletePromises = params.deletes.map((id) =>
    db.deleteDocument(databaseId, fieldsCollectionId, id)
  );

  await deleteUniqueValueReservationsByFieldIds(params.deletes);
  await Promise.all([...createPromises, ...updatePromises, ...deletePromises]);
}

// ─── Submissions ──────────────────────────────────────────────────────────────

function buildSearchText(payload: SubmissionPayload) {
  const parts: string[] = [
    payload.teamName ?? "",
  ];
  const values = [
    ...Object.values(payload.answers),
    ...payload.memberAnswers.flatMap((m) => Object.values(m)),
  ];
  for (const v of values) {
    if (typeof v === "string" || typeof v === "number") parts.push(String(v));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

export async function reserveUniqueFieldValues(params: {
  formId: string;
  entries: Array<{
    field: FieldDefinition;
    value: SubmissionAnswerValue;
    errorKey: string;
  }>;
}) {
  const normalizedEntries = params.entries
    .map((entry) => {
      const comparableValue = normalizeUniqueComparableValue(entry.field, entry.value);
      if (!comparableValue) return null;

      const rawPreview =
        typeof entry.value === "number"
          ? String(entry.value)
          : String(entry.value).trim();

      return {
        ...entry,
        comparableValue,
        valueHash: hashUniqueComparableValue(comparableValue),
        valuePreview: rawPreview.slice(0, UNIQUE_VALUE_PREVIEW_LIMIT),
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        field: FieldDefinition;
        value: SubmissionAnswerValue;
        errorKey: string;
        comparableValue: string;
        valueHash: string;
        valuePreview: string;
      } => entry !== null,
    );

  const fieldErrors: Record<string, string> = {};
  const seenByFieldValue = new Map<string, string>();

  for (const entry of normalizedEntries) {
    const dedupeKey = `${entry.field.id}:${entry.valueHash}`;
    const firstErrorKey = seenByFieldValue.get(dedupeKey);
    if (!firstErrorKey) {
      seenByFieldValue.set(dedupeKey, entry.errorKey);
      continue;
    }

    const message = `${entry.field.label} must be unique. Duplicate values are not allowed in the same submission.`;
    fieldErrors[firstErrorKey] ??= message;
    fieldErrors[entry.errorKey] = message;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new UniqueFieldConflictError(fieldErrors);
  }

  if (normalizedEntries.length === 0) return [];

  const { databaseId, uniqueValuesCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();
  const reservedIds: string[] = [];

  for (const entry of normalizedEntries) {
    try {
      const doc = await db.createDocument<UniqueValueDoc>(
        databaseId,
        uniqueValuesCollectionId,
        ID.unique(),
        {
          formId: params.formId,
          fieldId: entry.field.id,
          valueHash: entry.valueHash,
          valuePreview: entry.valuePreview,
          submissionId: null,
        },
      );

      reservedIds.push(doc.$id);
    } catch (error) {
      await releaseUniqueValueReservations(reservedIds);

      if (error instanceof AppwriteException) {
        if (error.code === 409) {
          throw new UniqueFieldConflictError({
            [entry.errorKey]: buildUniqueFieldErrorMessage(entry.field),
          });
        }

        if (error.code === 404) {
          throw new AppwriteConfigError(
            "Unique field validation is not configured yet. Run the Appwrite schema setup to create the registration unique-values collection.",
          );
        }
      }

      throw error;
    }
  }

  return reservedIds;
}

async function assertFormAcceptingSubmissions(formId: string) {
  const normalizedFormId = formId.trim();
  if (!normalizedFormId) {
    throw new FormSubmissionNotAllowedError(
      "This registration form is not accepting submissions right now.",
    );
  }

  await syncSiteEventDateTransitionsBeforeRead();

  const { databaseId, formsCollectionId } = getRegistrationsConfig();
  let formDoc: FormDoc;

  try {
    formDoc = await createDatabasesService().getDocument<FormDoc>(
      databaseId,
      formsCollectionId,
      normalizedFormId,
    );
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      throw new FormSubmissionNotAllowedError(
        "This registration form was not found.",
        normalizedFormId,
      );
    }

    throw error;
  }

  const form = mapFormDoc(formDoc);
  if (!form) {
    throw new FormSubmissionNotAllowedError(
      "This registration form is not accepting submissions right now.",
      normalizedFormId,
    );
  }

  const availability = getFormAvailability(form);
  if (!availability.isAcceptingSubmissions) {
    throw new FormSubmissionNotAllowedError(
      availability.description
        ? `This form is not accepting submissions. ${availability.description}`
        : "This form is not accepting submissions right now.",
      form.id,
    );
  }
}

export async function createRegistrationSubmission(payload: SubmissionPayload) {
  await assertFormAcceptingSubmissions(payload.formId);

  const { databaseId, submissionsCollectionId } = getRegistrationsConfig();
  return createDatabasesService().createDocument<SubmissionDoc>(
    databaseId,
    submissionsCollectionId,
    ID.unique(),
    {
      formId: payload.formId,
      teamName: payload.teamName,
      answersJson: JSON.stringify(payload.answers),
      memberAnswersJson: JSON.stringify(payload.memberAnswers),
      searchText: buildSearchText(payload),
    },
  );
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
    return fallback;
  return value;
}

function normalizePageSize(value: number | "all" | undefined, fallback: number) {
  if (value === "all") return "all";
  return normalizePositiveInteger(value, fallback);
}

function normalizeDateFilter(value: string | null | undefined, endOfDay = false) {
  return normalizeDateFilterInput(value, endOfDay);
}

function normalizeCommonFormIds(value: string[] | null | undefined) {
  return Array.from(
    new Set(
      (value ?? [])
        .map((item) => trim(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function extractSubmissionIdentity(
  submission: SubmissionDetail,
  form: FormWithFields | null | undefined,
  commonFieldKey?: string | null,
) {
  if (!form) return null;

  const normalizedCommonFieldKey = trim(commonFieldKey);
  if (normalizedCommonFieldKey) {
    const explicitField = findCommonUserFieldInForm(form, normalizedCommonFieldKey);
    if (!explicitField) return null;

    const normalized = normalizeCommonUserFieldValue(
      explicitField,
      submission.answers[explicitField.key],
    );
    if (!normalized) return null;

    return {
      key: `field:${normalizedCommonFieldKey}:${normalized}`,
      value: normalized,
    };
  }

  for (const fallbackKey of ["email", "phone"]) {
    const fallbackField = findCommonUserFieldInForm(form, fallbackKey);
    if (!fallbackField) continue;

    const normalized = normalizeCommonUserFieldValue(
      fallbackField,
      submission.answers[fallbackField.key],
    );
    if (normalized) {
      return {
        key: `field:${fallbackKey}:${normalized}`,
        value: normalized,
      };
    }
  }

  return null;
}

async function getFormsByIdMap() {
  const { databaseId, formsCollectionId, fieldsCollectionId } = getRegistrationsConfig();
  const db = createDatabasesService();
  
  const [formsResult, fieldsResult, googleSheetsFormSyncDocs] = await Promise.all([
    db.listDocuments<FormDoc>(databaseId, formsCollectionId, [Query.limit(100)]),
    db.listDocuments<FieldDoc>(databaseId, fieldsCollectionId, [Query.limit(500)]),
    listGoogleSheetsFormSyncDocsByQueries([]),
  ]);
  
  const forms = sortForms(formsResult.documents.map(mapFormDoc).filter((f): f is FormDefinition => f !== null));
  const fields = sortFields(fieldsResult.documents.map(mapFieldDoc).filter((f): f is FieldDefinition => f !== null));
  const selectedFieldIdsByFormId = mapGoogleSheetsSelectedFieldIdsByFormId(
    googleSheetsFormSyncDocs,
  );
  
  const map = new Map<string, FormWithFields>();
  for (const form of forms) {
    map.set(form.id, {
      ...form,
      fields: fields.filter(f => f.formId === form.id),
      googleSheetsSelectedFieldIds:
        selectedFieldIdsByFormId.get(form.id) ?? form.googleSheetsSelectedFieldIds,
    });
  }
  return map;
}

function filterSubmissionsBySearch(
  submissions: SubmissionDetail[],
  filters: Pick<SubmissionFilters, "searchField" | "searchQuery">,
) {
  const query = filters.searchQuery?.trim();
  if (!query) return submissions;

  const queryLower = query.toLowerCase();
  const scope = filters.searchField?.trim();

  return submissions.filter((sub) => {
    if (!scope || scope === "all") {
      const rawValues = [
        sub.displayTitle,
        sub.displaySubtitle,
        sub.teamName,
        sub.formTitle,
        ...Object.values(sub.answers),
        ...sub.memberAnswers.flatMap((member) => Object.values(member)),
        ...(sub.commonMatches?.flatMap((match) => [match.formTitle, match.formSlug]) ?? []),
      ];

      return rawValues.some(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).toLowerCase().includes(queryLower),
      );
    }

    if (scope === "teamName") {
      return sub.teamName?.toLowerCase().includes(queryLower);
    }

    const value = sub.answers[scope];
    if (
      value !== undefined &&
      value !== null &&
      String(value).toLowerCase().includes(queryLower)
    ) {
      return true;
    }

    return sub.memberAnswers.some(
      (member) =>
        member[scope] !== undefined &&
        member[scope] !== null &&
        String(member[scope]).toLowerCase().includes(queryLower),
    );
  });
}

function paginateSubmissions(
  submissions: SubmissionDetail[],
  page: number,
  pageSize: number | "all",
) {
  if (pageSize === "all") return submissions;

  const start = (page - 1) * pageSize;
  return submissions.slice(start, start + pageSize);
}

async function listCommonRegistrationSubmissions(
  filters: SubmissionFilters,
  formsById: Map<string, FormWithFields>,
  page: number,
  pageSize: number | "all",
): Promise<SubmissionPage> {
  const { submissionsCollectionId } = getRegistrationsConfig();
  const commonFormIds = normalizeCommonFormIds(filters.commonFormIds);
  const commonFieldKey = trim(filters.commonFieldKey);

  if (commonFormIds.length === 0) {
    return {
      submissions: [],
      total: 0,
      page,
      pageSize,
    };
  }

  const dateQueries: string[] = [];
  const from = normalizeDateFilter(filters.from, false);
  const to = normalizeDateFilter(filters.to, true);

  if (from) dateQueries.push(Query.greaterThanEqual("$createdAt", from));
  if (to) dateQueries.push(Query.lessThanEqual("$createdAt", to));

  const identityMapsByFormId = new Map<
    string,
    Map<string, SubmissionDetail[]>
  >();

  await Promise.all(
    commonFormIds.map(async (formId) => {
      const form = formsById.get(formId);
      if (!form) {
        identityMapsByFormId.set(formId, new Map());
        return;
      }

      const documents = await listAllDocumentsByQueries<SubmissionDoc>(
        submissionsCollectionId,
        [Query.equal("formId", formId), Query.orderDesc("$createdAt"), ...dateQueries],
      );

      const identityMap = new Map<string, SubmissionDetail[]>();

      for (const submission of documents
        .map((doc) => mapSubmissionDoc(doc, formsById))
        .filter((item): item is SubmissionDetail => item !== null)) {
        const identity = extractSubmissionIdentity(submission, form, commonFieldKey);
        if (!identity) continue;

        const existing = identityMap.get(identity.key);
        if (existing) {
          existing.push(submission);
        } else {
          identityMap.set(identity.key, [submission]);
        }
      }

      identityMapsByFormId.set(formId, identityMap);
    }),
  );

  const primaryIdentityMap = identityMapsByFormId.get(commonFormIds[0]) ?? new Map();
  const commonKeys = Array.from(primaryIdentityMap.keys()).filter((identityKey) =>
    commonFormIds.every((formId) => identityMapsByFormId.get(formId)?.has(identityKey)),
  );

  let submissions = commonKeys
    .map<SubmissionDetail | null>((identityKey) => {
      const matchedSubmissions = commonFormIds
        .map((formId) => identityMapsByFormId.get(formId)?.get(identityKey)?.[0] ?? null)
        .filter((item): item is SubmissionDetail => item !== null);

      if (matchedSubmissions.length !== commonFormIds.length) {
        return null;
      }

      const representative = [...matchedSubmissions].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )[0];

      return {
        ...representative,
        commonMatches: matchedSubmissions.map((match) => ({
          formId: match.formId,
          formSlug: match.formSlug,
          formTitle: match.formTitle,
          submissionId: match.id,
          createdAt: match.createdAt,
        })),
      };
    })
    .filter((item): item is SubmissionDetail => item !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  submissions = filterSubmissionsBySearch(submissions, filters);
  const total = submissions.length;

  return {
    submissions: paginateSubmissions(submissions, page, pageSize),
    total,
    page,
    pageSize,
  };
}

export async function listRegistrationSubmissions(
  filters: SubmissionFilters,
): Promise<SubmissionPage> {
  noStore();
  if (!isAppwriteConfigured() || !isRegistrationsConfigured()) {
    return {
      submissions: [],
      total: 0,
      page: normalizePositiveInteger(filters.page, 1),
      pageSize: normalizePageSize(filters.pageSize, PAGE_SIZE_DEFAULT),
    };
  }

  try {
    const { databaseId, submissionsCollectionId } = getRegistrationsConfig();
    const pageSize = normalizePageSize(filters.pageSize, PAGE_SIZE_DEFAULT);
    const page = normalizePositiveInteger(filters.page, 1);
    const commonFormIds = normalizeCommonFormIds(filters.commonFormIds);
    const isSearchActive = Boolean(filters.searchQuery?.trim());

    const formsById = await getFormsByIdMap();

    if (commonFormIds.length > 0) {
      return listCommonRegistrationSubmissions(
        {
          ...filters,
          commonFormIds,
        },
        formsById,
        page,
        pageSize,
      );
    }
    
    // If search active or page size is all, we fetch a large batch to filter/paginate in memory
    const fetchLimit = (isSearchActive || pageSize === "all") ? 5000 : (pageSize as number);

    const queries: string[] = [Query.orderDesc("$createdAt")];

    if (filters.formId) queries.push(Query.equal("formId", filters.formId));

    const from = normalizeDateFilter(filters.from, false);
    const to = normalizeDateFilter(filters.to, true);
    if (from) queries.push(Query.greaterThanEqual("$createdAt", from));
    if (to) queries.push(Query.lessThanEqual("$createdAt", to));

    queries.push(Query.limit(fetchLimit));
    
    if (!isSearchActive && pageSize !== "all") {
      queries.push(Query.offset((page - 1) * (pageSize as number)));
    }

    const result = await createDatabasesService().listDocuments<SubmissionDoc>(
      databaseId,
      submissionsCollectionId,
      queries,
    );

    let submissions = result.documents
      .map((doc) => mapSubmissionDoc(doc, formsById))
      .filter((s): s is SubmissionDetail => s !== null);

    if (isSearchActive) {
      submissions = filterSubmissionsBySearch(submissions, filters);
    }

    const total = isSearchActive ? submissions.length : result.total;

    if (isSearchActive || pageSize === "all") {
      submissions = paginateSubmissions(submissions, page, pageSize);
    }

    return {
      submissions,
      total,
      page,
      pageSize,
    };
  } catch {
    return {
      submissions: [],
      total: 0,
      page: normalizePositiveInteger(filters.page, 1),
      pageSize: normalizePageSize(filters.pageSize, PAGE_SIZE_DEFAULT),
    };
  }
}

export async function listAllRegistrationSubmissionDetails(
  filters: SubmissionFilters,
): Promise<SubmissionDetail[]> {
  noStore();
  if (!isAppwriteConfigured() || !isRegistrationsConfigured()) return [];

  try {
    const { databaseId, submissionsCollectionId } = getRegistrationsConfig();
    const queries: string[] = [Query.orderDesc("$createdAt"), Query.limit(MAX_ROW_PAGE_SIZE)];
    if (filters.formId) queries.push(Query.equal("formId", filters.formId));

    const [result, formsById] = await Promise.all([
      createDatabasesService().listDocuments<SubmissionDoc>(
        databaseId,
        submissionsCollectionId,
        queries,
      ),
      getFormsByIdMap(),
    ]);

    return result.documents
      .map((doc) => mapSubmissionDoc(doc, formsById))
      .filter((s): s is SubmissionDetail => s !== null);
  } catch {
    return [];
  }
}

export async function getRegistrationSubmissionById(
  submissionId: string,
): Promise<SubmissionDetail | null> {
  noStore();
  if (!submissionId.trim() || !isAppwriteConfigured() || !isRegistrationsConfigured())
    return null;

  try {
    const { databaseId, submissionsCollectionId } = getRegistrationsConfig();
    const [doc, formsById] = await Promise.all([
      createDatabasesService().getDocument<SubmissionDoc>(
        databaseId,
        submissionsCollectionId,
        submissionId,
      ),
      getFormsByIdMap(),
    ]);
    return mapSubmissionDoc(doc, formsById);
  } catch {
    return null;
  }
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function shiftDisplayDate(dateKey: string, deltaDays: number) {
  const anchor = new Date(`${dateKey}T12:00:00${COLOMBO_OFFSET}`);
  anchor.setUTCDate(anchor.getUTCDate() + deltaDays);
  return getStoredDateFromIso(anchor);
}

function formatAnalyticsDateLabel(dateKey: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: DISPLAY_TIME_ZONE,
    }).format(new Date(`${dateKey}T12:00:00${COLOMBO_OFFSET}`));
  } catch {
    return dateKey;
  }
}

function getAnalyticsWeekdayLabel(value: string | Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: DISPLAY_TIME_ZONE,
    }).format(new Date(value));
  } catch {
    return "Mon";
  }
}

function createTrendSeed(days: number) {
  const todayKey = getStoredDateFromIso(new Date());
  if (!todayKey) return [];

  return Array.from({ length: days }, (_, index) =>
    shiftDisplayDate(todayKey, index - (days - 1)),
  )
    .filter((value): value is string => Boolean(value))
    .map<RegistrationOverviewTrendPoint>((date) => ({
      date,
      label: formatAnalyticsDateLabel(date),
      total: 0,
      competitions: 0,
      workshops: 0,
    }));
}

function buildRegistrationOverviewAnalytics(
  items: RegistrationOverviewItem[],
  submissionDocs: SubmissionDoc[],
): RegistrationOverviewAnalytics {
  const trend = createTrendSeed(ANALYTICS_TREND_DAYS);
  const trendByDate = new Map(trend.map((point) => [point.date, point] as const));
  const formsById = new Map(items.map((item) => [item.form.id, item.form] as const));
  const formBreakdown = [...items]
    .map<RegistrationOverviewFormBreakdownPoint>((item) => ({
      formId: item.form.id,
      label: item.form.title,
      kind: item.form.kind,
      availabilityState: item.availability.state,
      submissions: item.submissionCount,
    }))
    .sort((a, b) => b.submissions - a.submissions || a.label.localeCompare(b.label));

  const kindCounts = new Map<RegistrationFormKind, number>([
    ["competition", 0],
    ["workshop", 0],
  ]);
  for (const item of formBreakdown) {
    kindCounts.set(item.kind, (kindCounts.get(item.kind) ?? 0) + item.submissions);
  }

  const weekdayCounts = new Map<string, number>(
    ANALYTICS_WEEKDAY_LABELS.map((label) => [label, 0] as const),
  );

  for (const doc of submissionDocs) {
    const form = formsById.get(trim(doc.formId));
    if (!form) continue;

    const dateKey = getStoredDateFromIso(doc.$createdAt);
    const trendPoint = dateKey ? trendByDate.get(dateKey) : null;
    if (trendPoint) {
      trendPoint.total += 1;
      if (form.kind === "competition") {
        trendPoint.competitions += 1;
      } else {
        trendPoint.workshops += 1;
      }
    }

    const weekday = getAnalyticsWeekdayLabel(doc.$createdAt);
    if (weekdayCounts.has(weekday)) {
      weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
    }
  }

  const kindBreakdown: RegistrationOverviewCategoryBreakdownPoint[] = [
    {
      key: "competition",
      label: "Competition",
      value: kindCounts.get("competition") ?? 0,
    },
    {
      key: "workshop",
      label: "Workshop",
      value: kindCounts.get("workshop") ?? 0,
    },
  ];

  const weekdayBreakdown: RegistrationOverviewWeekdayPoint[] =
    ANALYTICS_WEEKDAY_LABELS.map((weekday) => ({
      weekday,
      submissions: weekdayCounts.get(weekday) ?? 0,
    }));

  const last7DaysSubmissions = trend
    .slice(-7)
    .reduce((total, point) => total + point.total, 0);
  const previous7DaysSubmissions = trend
    .slice(-14, -7)
    .reduce((total, point) => total + point.total, 0);
  const peakDay =
    trend.reduce<RegistrationOverviewTrendPoint | null>((best, point) => {
      if (!best || point.total > best.total) return point;
      return best;
    }, null) ?? null;
  const busiestWeekday =
    weekdayBreakdown.reduce<RegistrationOverviewWeekdayPoint | null>((best, point) => {
      if (!best || point.submissions > best.submissions) return point;
      return best;
    }, null) ?? null;
  const topForm = formBreakdown[0] ?? null;

  return {
    trend,
    formBreakdown,
    kindBreakdown,
    weekdayBreakdown,
    summary: {
      last7DaysSubmissions,
      previous7DaysSubmissions,
      averageSubmissionsPerForm: items.length > 0
        ? Number((submissionDocs.length / items.length).toFixed(1))
        : 0,
      topFormTitle: topForm && topForm.submissions > 0 ? topForm.label : null,
      topFormCount: topForm?.submissions ?? 0,
      peakDayLabel: peakDay && peakDay.total > 0 ? peakDay.label : null,
      peakDayCount: peakDay?.total ?? 0,
      busiestWeekday:
        busiestWeekday && busiestWeekday.submissions > 0
          ? busiestWeekday.weekday
          : null,
      busiestWeekdayCount: busiestWeekday?.submissions ?? 0,
    },
  };
}

export async function getRegistrationOverview(): Promise<RegistrationOverview> {
  noStore();
  const [forms, recentPage] = await Promise.all([
    listRegistrationForms(),
    listRegistrationSubmissions({ page: 1, pageSize: 6 }),
  ]);

  if (!isAppwriteConfigured() || !isRegistrationsConfigured()) {
    const items = forms.map<RegistrationOverviewItem>((form) => ({
      form,
      availability: getFormAvailability(form),
      submissionCount: 0,
    }));

    return {
      forms: items,
      totalSubmissions: 0,
      recentSubmissions: recentPage.submissions,
      analytics: buildRegistrationOverviewAnalytics(items, []),
    };
  }

  try {
    const { submissionsCollectionId } = getRegistrationsConfig();
    const submissionDocs = await listAllDocumentsByQueries<SubmissionDoc>(
      submissionsCollectionId,
      [Query.orderDesc("$createdAt")],
    );
    const countsByFormId = new Map<string, number>();

    for (const doc of submissionDocs) {
      const formId = trim(doc.formId);
      if (!formId) continue;
      countsByFormId.set(formId, (countsByFormId.get(formId) ?? 0) + 1);
    }

    const items = forms.map<RegistrationOverviewItem>((form) => ({
      form,
      availability: getFormAvailability(form),
      submissionCount: countsByFormId.get(form.id) ?? 0,
    }));

    return {
      forms: items,
      totalSubmissions: items.reduce((t, i) => t + i.submissionCount, 0),
      recentSubmissions: recentPage.submissions,
      analytics: buildRegistrationOverviewAnalytics(items, submissionDocs),
    };
  } catch {
    const items = forms.map((form) => ({
      form,
      availability: getFormAvailability(form),
      submissionCount: 0,
    }));

    return {
      forms: items,
      totalSubmissions: 0,
      recentSubmissions: recentPage.submissions,
      analytics: buildRegistrationOverviewAnalytics(items, []),
    };
  }
}

// ─── Validation / Utilities ───────────────────────────────────────────────────



export function isChoiceField(t: FieldType) {
  return t === "select" || t === "radio" || t === "checkbox";
}

export function isTextLikeField(t: FieldType) {
  return t === "text" || t === "textarea" || t === "email" || t === "tel" || t === "time";
}

export function parseOptionsFromText(value: string): FieldOption[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map<FieldOption>((line) => {
      const [rawLabel, rawValue] = line.includes("|")
        ? line.split("|", 2)
        : [line, line];
      return { label: rawLabel.trim(), value: rawValue.trim() };
    })
    .filter((o) => o.label && o.value);
}

export function formatOptionsForTextarea(options: FieldOption[]) {
  return options.map((o) => `${o.label}|${o.value}`).join("\n");
}

export function getFieldLabelMap(fields: FieldDefinition[]) {
  return new Map(fields.map((f) => [f.key, f.label] as const));
}

export function coerceFieldValue(
  field: FieldDefinition,
  rawValue: FormDataEntryValue | FormDataEntryValue[] | null,
): SubmissionAnswerValue {
  if (field.type === "page_break") return null;
  if (field.type === "checkbox") {
    if (Array.isArray(rawValue)) return rawValue.map(String);
    return rawValue ? [String(rawValue)] : [];
  }
  
  if (Array.isArray(rawValue)) rawValue = rawValue[0] ?? null;

  if (field.type === "file") {
    if (rawValue instanceof File && rawValue.size > 0) return rawValue;
    return null;
  }

  if (typeof rawValue !== "string") return null;
  const value = rawValue.trim();
  if (!value) return null;
  if (field.type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (field.type === "date") {
    const stored = parseDisplayDateInput(value);
    if (!stored) return value;
    const [year, month, day] = stored.split("-");
    return `${year}/${month}/${day}`;
  }
  return value;
}

export function validateFieldValue(
  field: FieldDefinition,
  value: SubmissionAnswerValue,
) {
  if (field.type === "page_break") return null;
  if (field.type === "checkbox") {
    if (field.required && (!Array.isArray(value) || value.length === 0))
      return `Please select at least one option for ${field.label}.`;
    return null;
  }

  if (field.type === "file") {
    if (field.required && !(value instanceof File))
      return `${field.label} is required. Please upload a file.`;
    if (value instanceof File) {
      if (value.size > 10 * 1024 * 1024) {
        return `${field.label} must be less than 10MB.`;
      }
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];
      if (!allowedTypes.includes(value.type)) {
        return `${field.label} format is not supported. Please upload a PDF, Word document, or image.`;
      }
    }
    return null;
  }

  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return field.required ? `${field.label} is required.` : null;
  }

  if (field.type === "number") {
    if (typeof value !== "number" || Number.isNaN(value))
      return `${field.label} must be a valid number.`;
    return null;
  }

  if (typeof value !== "string") return `${field.label} has an invalid value.`;

  if (field.type === "date" && !parseDisplayDateInput(value)) {
    return `${field.label} must use the yyyy/mm/dd format.`;
  }

  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return `${field.label} must be a valid email address.`;

  if (field.type === "tel" && !/^[+()\-\s0-9.]{7,24}$/.test(value))
    return `${field.label} must be a valid phone number.`;

  if (isChoiceField(field.type)) {
    const allowed = new Set(field.options.map((o) => o.value));
    if (!allowed.has(value)) return `${field.label} has an invalid option.`;
  }

  return null;
}

export function getDefaultSuccessMessage(form: FormDefinition) {
  return form.successMessage || DEFAULT_SUCCESS_MESSAGE;
}
