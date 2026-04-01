"use server";

import { AppwriteException } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { AppwriteConfigError } from "@/lib/appwrite";
import { parseDisplayDateBoundaryInput } from "@/lib/date-format";
import {
  getAutoManagedSiteEventEnabled,
  getSiteEventDatesFromFormWindow,
  getSiteEventConfigs,
  upsertSiteEventConfig,
} from "@/lib/site-events";
import {
  createRegistrationField,
  createRegistrationForm,
  deleteFormBanner,
  deleteRegistrationField,
  deleteRegistrationForm,
  getRegistrationFormById,
  isChoiceField,
  isTextLikeField,
  listRegistrationForms,
  parseOptionsFromText,
  updateRegistrationField,
  bulkSaveRegistrationFields,
  updateRegistrationFieldOrders,
  updateRegistrationFormSettings,
  uploadFormBanner,
} from "@/lib/registrations";
import type {
  FieldDefinition,
  FieldOption,
  FieldScope,
  FieldType,
  RegistrationFormKind,
  RegistrationFormStatus,
} from "@/lib/registration-types";
import {
  COMPETITION_SITE_EVENT,
  type CompetitionEventConfig,
  type WorkshopEventConfig,
  WORKSHOP_SITE_EVENTS,
} from "@/lib/site-event-types";
import {
  fieldTypeSupportsCaseSensitiveUnique,
  fieldTypeSupportsPlaceholder,
  fieldTypeSupportsUnique,
  MAX_REGISTRATION_FORMS,
  REGISTRATION_FIELD_SCOPES,
  REGISTRATION_FIELD_TYPES,
  REGISTRATION_FORM_KINDS,
  REGISTRATION_FORM_STATUSES,
  RESERVED_SLUGS,
} from "@/lib/registration-types";

// ─── State type ───────────────────────────────────────────────────────────────

export type RegistrationAdminActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
};

const initialState: RegistrationAdminActionState = {
  status: "idle",
  message: null,
  toastKey: 0,
};

function buildState(
  status: RegistrationAdminActionState["status"],
  message: string | null,
): RegistrationAdminActionState {
  return { status, message, toastKey: Date.now() };
}

// ─── Type guards ──────────────────────────────────────────────────────────────

function isFieldScope(v: unknown): v is FieldScope {
  return (
    typeof v === "string" && REGISTRATION_FIELD_SCOPES.includes(v as FieldScope)
  );
}

function isFieldType(v: unknown): v is FieldType {
  return (
    typeof v === "string" && REGISTRATION_FIELD_TYPES.includes(v as FieldType)
  );
}

function isStatus(v: unknown): v is RegistrationFormStatus {
  return (
    typeof v === "string" &&
    REGISTRATION_FORM_STATUSES.includes(v as RegistrationFormStatus)
  );
}

function isFormKind(v: unknown): v is RegistrationFormKind {
  return (
    typeof v === "string" &&
    REGISTRATION_FORM_KINDS.includes(v as RegistrationFormKind)
  );
}


// ─── FormData helpers ─────────────────────────────────────────────────────────

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? value : null;
}

function readUnknownString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readUnknownOptionalString(value: unknown) {
  const normalized = readUnknownString(value);
  return normalized || null;
}

function readUnknownBoolean(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function parseInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function parseOptionalNumber(formData: FormData, key: string) {
  const raw = readString(formData, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function normalizeFieldOptionsInput(raw: unknown): FieldOption[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((option) => {
      if (
        typeof option === "object" &&
        option !== null &&
        typeof (option as { label?: unknown }).label === "string" &&
        typeof (option as { value?: unknown }).value === "string"
      ) {
        const label = (option as { label: string }).label.trim();
        const value = (option as { value: string }).value.trim();
        if (label && value) return { label, value };
      }

      return null;
    })
    .filter((option): option is FieldOption => option !== null);
}

function parseFieldSortOrder(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") return parseInteger(value.trim(), Number.NaN);
  return Number.NaN;
}

function normalizeFieldDefinitionInput(input: {
  formId: unknown;
  scope: unknown;
  type: unknown;
  key: unknown;
  label: unknown;
  sortOrder: unknown;
  options: unknown;
  required: unknown;
  placeholder?: unknown;
  helpText?: unknown;
  isUnique?: unknown;
  uniqueCaseSensitive?: unknown;
}) {
  const formId = readUnknownString(input.formId);
  const scopeValue = readUnknownString(input.scope);
  const typeValue = readUnknownString(input.type);
  const rawKey = readUnknownString(input.key).toLowerCase();
  const label = readUnknownString(input.label);

  if (!formId) throw new Error("Unable to determine which form to update.");
  if (!isFieldScope(scopeValue)) throw new Error("Choose a valid field scope.");
  if (!isFieldType(typeValue)) throw new Error("Choose a valid field type.");
  if (!label) throw new Error("Enter a field label.");

  const key = rawKey.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    throw new Error(
      "Field key must start with a letter and use only lowercase letters, numbers, or underscores.",
    );
  }

  const sortOrder = parseFieldSortOrder(input.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sort order must be a whole number ≥ 0.");
  }

  const options =
    typeof input.options === "string"
      ? parseOptionsFromText(input.options)
      : normalizeFieldOptionsInput(input.options);

  if (isChoiceField(typeValue) && options.length === 0) {
    throw new Error("Add at least one option for choice fields.");
  }

  const requestedUnique = readUnknownBoolean(input.isUnique);
  if (requestedUnique && !fieldTypeSupportsUnique(typeValue)) {
    throw new Error("Unique validation is only supported for single-value text, choice, date, time, and number fields.");
  }

  const required = typeValue === "page_break" ? false : readUnknownBoolean(input.required);
  const scope = typeValue === "page_break" ? "submission" : scopeValue;
  const placeholder = fieldTypeSupportsPlaceholder(typeValue)
    ? readUnknownOptionalString(input.placeholder)
    : null;
  const helpText = typeValue === "page_break" ? null : readUnknownOptionalString(input.helpText);
  const isUnique = typeValue === "page_break" ? false : requestedUnique;
  const uniqueCaseSensitive =
    isUnique && fieldTypeSupportsCaseSensitiveUnique(typeValue)
      ? readUnknownBoolean(input.uniqueCaseSensitive)
      : false;

  return {
    formId,
    scope,
    key,
    label,
    type: typeValue,
    required,
    sortOrder,
    options: isChoiceField(typeValue) ? options : [],
    placeholder,
    helpText,
    isUnique,
    uniqueCaseSensitive,
  };
}

function parseOptionalDate(value: string, endOfDay = false) {
  if (!value) return null;
  return parseDisplayDateBoundaryInput(value, endOfDay);
}

function isConfirmationEmailFieldCandidate(
  field: Pick<FieldDefinition, "scope" | "type">,
) {
  return field.scope === "submission" && field.type === "email";
}

function isConfirmationNameFieldCandidate(
  field: Pick<FieldDefinition, "scope" | "type">,
) {
  return field.scope === "submission" && field.type === "text";
}

function validateConfirmationEmailSettings(params: {
  enabled: boolean;
  emailFieldId: string | null;
  nameFieldId: string | null;
  fields: Array<Pick<FieldDefinition, "id" | "scope" | "type">>;
}) {
  if (!params.enabled) {
    return {
      confirmationEmailFieldId: null,
      confirmationNameFieldId: null,
    };
  }

  if (!params.emailFieldId) {
    throw new Error("Choose the submission email field used for confirmation emails.");
  }

  if (!params.nameFieldId) {
    throw new Error("Choose the submission short answer field used for the recipient name.");
  }

  const emailField = params.fields.find((field) => field.id === params.emailFieldId);
  if (!emailField || !isConfirmationEmailFieldCandidate(emailField)) {
    throw new Error("Confirmation emails can only use a submission email field.");
  }

  const nameField = params.fields.find((field) => field.id === params.nameFieldId);
  if (!nameField || !isConfirmationNameFieldCandidate(nameField)) {
    throw new Error("Confirmation email names can only use a submission short answer field.");
  }

  return {
    confirmationEmailFieldId: emailField.id,
    confirmationNameFieldId: nameField.id,
  };
}

// ─── Slug validation ──────────────────────────────────────────────────────────

function validateSlug(slug: string): string | null {
  if (!slug) return "Enter a slug.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    return "Slug must be lowercase letters, numbers, and hyphens only (e.g. competition-2026).";
  if (RESERVED_SLUGS.has(slug))
    return `"${slug}" is a reserved path and cannot be used as a slug.`;
  return null;
}

// ─── Guard: require admin session ─────────────────────────────────────────────

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Your admin session has expired. Sign in again.");
  return admin;
}

// ─── Revalidation ─────────────────────────────────────────────────────────────

function revalidateAll(slug?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/form-builder");
  revalidatePath("/admin/registrations");
  if (slug) revalidatePath(`/${slug}`);
}

type SiteEventConfigs = Awaited<ReturnType<typeof getSiteEventConfigs>>;

type LinkedSiteEvent =
  | {
      key: typeof COMPETITION_SITE_EVENT.key;
      title: string;
      kind: "competition";
      config: CompetitionEventConfig;
    }
  | {
      key: (typeof WORKSHOP_SITE_EVENTS)[number]["key"];
      title: string;
      kind: "workshop";
      config: WorkshopEventConfig;
    };

function findLinkedSiteEvent(
  configs: SiteEventConfigs,
  formId: string,
): LinkedSiteEvent | null {
  const competitionConfig = configs[COMPETITION_SITE_EVENT.key] as CompetitionEventConfig;
  if (competitionConfig.formId === formId) {
    return {
      key: COMPETITION_SITE_EVENT.key,
      title: COMPETITION_SITE_EVENT.title,
      kind: "competition",
      config: competitionConfig,
    };
  }

  for (const event of WORKSHOP_SITE_EVENTS) {
    const config = configs[event.key] as WorkshopEventConfig;
    if (config.formId === formId) {
      return {
        key: event.key,
        title: event.title,
        kind: "workshop",
        config,
      };
    }
  }

  return null;
}

async function syncLinkedEventFromForm(params: {
  linkedEvent: LinkedSiteEvent | null;
  status: RegistrationFormStatus;
  openAt: string | null;
  closeAt: string | null;
}) {
  const { linkedEvent } = params;
  if (!linkedEvent) return false;

  const { openDate, closeDate } = getSiteEventDatesFromFormWindow({
    openAt: params.openAt,
    closeAt: params.closeAt,
  });
  const enabled = getAutoManagedSiteEventEnabled({
    enabled: params.status === "open",
    openDate,
    closeDate,
  });

  if (
    linkedEvent.config.enabled === enabled &&
    linkedEvent.config.openDate === openDate &&
    linkedEvent.config.closeDate === closeDate
  ) {
    return true;
  }

  await upsertSiteEventConfig(linkedEvent.key, {
    ...linkedEvent.config,
    enabled,
    openDate,
    closeDate,
  });

  return true;
}

// ─── Error handler ────────────────────────────────────────────────────────────

function handleError(error: unknown): RegistrationAdminActionState {
  if (error instanceof AppwriteException) {
    if (error.code === 404)
      return buildState(
        "error",
        "Collection not found. Run 'appwrite push collections' to set up the database.",
      );
    if ([401, 403].includes(error.code ?? 0))
      return buildState(
        "error",
        "The Appwrite API key needs databases.read and databases.write scopes.",
      );
    if (error.code === 409)
      return buildState(
        "error",
        "A form with this slug already exists. Choose a different slug.",
      );
    return buildState("error", error.message || "An Appwrite error occurred.");
  }
  if (error instanceof AppwriteConfigError) return buildState("error", error.message);
  return buildState(
    "error",
    error instanceof Error ? error.message : "An unexpected error occurred.",
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

export async function createRegistrationFormAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  let redirectTo: string | null = null;

  try {
    await requireAdmin();

    const slug = readString(formData, "slug");
    const slugError = validateSlug(slug);
    if (slugError) throw new Error(slugError);

    const title = readString(formData, "title");
    if (!title) throw new Error("Enter a form title.");

    const kindValue = readString(formData, "kind");
    if (!isFormKind(kindValue)) throw new Error("Choose a valid form kind.");

    const existingForms = await listRegistrationForms();
    if (existingForms.length >= MAX_REGISTRATION_FORMS)
      throw new Error(
        `You can only create up to ${MAX_REGISTRATION_FORMS} registration forms.`,
      );

    const sortOrder = existingForms.length;
    await createRegistrationForm({
      slug,
      title,
      description: readOptionalString(formData, "description"),
      kind: kindValue,
      sortOrder,
    });

    revalidateAll(slug);
    redirectTo = `/admin/form-builder?form=${encodeURIComponent(slug)}`;
  } catch (error) {
    return handleError(error);
  }

  if (!redirectTo) {
    return buildState("error", "Unable to open the newly created form.");
  }

  redirect(redirectTo);
}

// ─── Delete form ──────────────────────────────────────────────────────────────

export async function deleteRegistrationFormAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();
    const formId = readString(formData, "formId");
    if (!formId) throw new Error("Unable to identify the form.");

    const form = await getRegistrationFormById(formId);
    if (!form) throw new Error("Form not found.");

    const siteEventConfigs = await getSiteEventConfigs();
    const linkedEvent = findLinkedSiteEvent(siteEventConfigs, form.id);
    if (linkedEvent) {
      throw new Error(
        `"${form.title}" is linked to ${linkedEvent.title}. Unlink it from Events before deleting this form.`,
      );
    }

    await deleteRegistrationForm(formId);
    revalidateAll(form.slug);
    return buildState("success", `Form "${form.title}" deleted.`);
  } catch (error) {
    return handleError(error);
  }
}

// ─── Update form settings ─────────────────────────────────────────────────────

export async function updateRegistrationFormSettingsAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();

    const formId = readString(formData, "formId");
    if (!formId) throw new Error("Unable to determine which form to update.");

    const form = await getRegistrationFormById(formId);
    if (!form) throw new Error("Form not found.");

    const siteEventConfigs = await getSiteEventConfigs();
    const linkedEvent = findLinkedSiteEvent(siteEventConfigs, form.id);

    const slug = readString(formData, "slug");
    const slugError = validateSlug(slug);
    if (slugError) throw new Error(slugError);

    const title = readString(formData, "title");
    if (!title) throw new Error("Enter a form title.");

    const statusValue = readString(formData, "status");
    if (!isStatus(statusValue)) throw new Error("Choose a valid form status.");

    const openAt = parseOptionalDate(readString(formData, "openAt"));
    const closeAt = parseOptionalDate(readString(formData, "closeAt"), true);
    const openAtRaw = readString(formData, "openAt");
    const closeAtRaw = readString(formData, "closeAt");

    if (openAtRaw && !openAt)
      throw new Error("Enter a valid open date in yyyy/mm/dd format.");
    if (closeAtRaw && !closeAt)
      throw new Error("Enter a valid close date in yyyy/mm/dd format.");
    if (openAt && closeAt && new Date(openAt) > new Date(closeAt))
      throw new Error("Open date must be before close date.");
    if (statusValue === "draft" && linkedEvent) {
      throw new Error(
        `"${form.title}" is linked to ${linkedEvent.title}. Unlink it from Events before setting it to draft.`,
      );
    }
    const { openDate, closeDate } = getSiteEventDatesFromFormWindow({
      openAt,
      closeAt,
    });
    const linkedEventEnabled = linkedEvent
      ? getAutoManagedSiteEventEnabled({
          enabled: statusValue === "open",
          openDate,
          closeDate,
        })
      : false;
    if (linkedEvent && linkedEventEnabled && (!openAt || !closeAt)) {
      throw new Error(
        `${linkedEvent.title} needs both an open date and a close date before the linked form can be opened.`,
      );
    }

    const isCompetition = form.kind === "competition";
    const teamMinMembers = isCompetition
      ? parseInteger(readString(formData, "teamMinMembers"), Number.NaN)
      : 1;
    const teamMaxMembers = isCompetition
      ? parseInteger(readString(formData, "teamMaxMembers"), Number.NaN)
      : 1;

    if (isCompetition) {
      if (!Number.isInteger(teamMinMembers) || teamMinMembers < 1)
        throw new Error("Minimum team members must be at least 1.");
      if (!Number.isInteger(teamMaxMembers) || teamMaxMembers < teamMinMembers)
        throw new Error(
          "Maximum team members must be at least equal to the minimum.",
        );
    }

    const confirmationEmailEnabled = formData.get("confirmationEmailEnabled") === "on";
    const confirmationEmailTemplate = readOptionalString(formData, "confirmationEmailTemplate");
    const confirmationSettings = validateConfirmationEmailSettings({
      enabled: confirmationEmailEnabled,
      emailFieldId: readOptionalString(formData, "confirmationEmailFieldId"),
      nameFieldId: readOptionalString(formData, "confirmationNameFieldId"),
      fields: form.fields,
    });

    await updateRegistrationFormSettings({
      formId: form.id,
      slug,
      title,
      description: readOptionalString(formData, "description"),
      status: statusValue,
      openAt,
      closeAt,
      successMessage: readOptionalString(formData, "successMessage"),
      confirmationEmailEnabled,
      confirmationEmailTemplate,
      confirmationEmailFieldId: confirmationSettings.confirmationEmailFieldId,
      confirmationNameFieldId: confirmationSettings.confirmationNameFieldId,
      teamMinMembers,
      teamMaxMembers,
    });

    await syncLinkedEventFromForm({
      linkedEvent,
      status: statusValue,
      openAt,
      closeAt,
    });

    revalidateAll(slug);
    if (form.slug !== slug) revalidatePath(`/${form.slug}`);

    return buildState("success", "Form settings saved.");
  } catch (error) {
    return handleError(error);
  }
}

// ─── Upload banner ────────────────────────────────────────────────────────────

export async function uploadFormBannerAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();

    const formId = readString(formData, "formId");
    if (!formId) throw new Error("Unable to identify the form.");

    const file = formData.get("banner");
    if (!(file instanceof File) || file.size === 0)
      throw new Error("Select an image file to upload.");

    if (file.size > 5 * 1024 * 1024)
      throw new Error("Banner image must be smaller than 5 MB.");

    const allowed = ["image/png", "image/jpeg", "image/webp", "image/avif"];
    if (!allowed.includes(file.type))
      throw new Error("Only PNG, JPEG, WebP, or AVIF images are accepted.");

    const form = await getRegistrationFormById(formId);
    if (!form) throw new Error("Form not found.");

    await uploadFormBanner(formId, file);
    revalidateAll(form.slug);
    return buildState("success", "Banner uploaded.");
  } catch (error) {
    return handleError(error);
  }
}

// ─── Delete banner ────────────────────────────────────────────────────────────

export async function deleteFormBannerAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();
    const formId = readString(formData, "formId");
    if (!formId) throw new Error("Unable to identify the form.");

    const form = await getRegistrationFormById(formId);
    if (!form) throw new Error("Form not found.");

    await deleteFormBanner(formId);
    revalidateAll(form.slug);
    return buildState("success", "Banner removed.");
  } catch (error) {
    return handleError(error);
  }
}

// ─── Field actions ────────────────────────────────────────────────────────────

function parseFieldDefinitionInput(formData: FormData) {
  return normalizeFieldDefinitionInput({
    formId: formData.get("formId"),
    scope: formData.get("scope"),
    type: formData.get("type"),
    key: formData.get("key"),
    label: formData.get("label"),
    sortOrder: formData.get("sortOrder"),
    options: formData.get("optionsText"),
    required: formData.get("required"),
    placeholder: formData.get("placeholder"),
    helpText: formData.get("helpText"),
    isUnique: formData.get("isUnique"),
    uniqueCaseSensitive: formData.get("uniqueCaseSensitive"),
  });
}

function ensureUniqueKey(fields: FieldDefinition[], next: FieldDefinition) {
  const conflict = fields.find(
    (f) => f.id !== next.id && f.scope === next.scope && f.key === next.key,
  );
  if (conflict)
    throw new Error(
      `A ${next.scope} field with key "${next.key}" already exists.`,
    );
}

export async function createRegistrationFieldAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();
    const input = parseFieldDefinitionInput(formData);
    const form = await getRegistrationFormById(input.formId);
    if (!form) throw new Error("Form not found.");
    ensureUniqueKey(form.fields, { ...input, id: "__new__" });
    await createRegistrationField(input);
    revalidateAll(form.slug);
    return buildState("success", "Field added.");
  } catch (error) {
    return handleError(error);
  }
}

export async function updateRegistrationFieldAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();
    const fieldId = readString(formData, "fieldId");
    if (!fieldId) throw new Error("Unable to identify the field.");

    const input = parseFieldDefinitionInput(formData);
    const form = await getRegistrationFormById(input.formId);
    if (!form) throw new Error("Form not found.");

    const existing = form.fields.find((f) => f.id === fieldId);
    if (!existing) throw new Error("Field not found.");

    const next: FieldDefinition = { ...existing, ...input, id: fieldId };
    const nextFields = form.fields.map((f) => (f.id === fieldId ? next : f));
    ensureUniqueKey(nextFields, next);

    await updateRegistrationField({ fieldId, ...input });
    revalidateAll(form.slug);
    return buildState("success", "Field updated.");
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteRegistrationFieldAction(
  _prev: RegistrationAdminActionState = initialState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();
    const formId = readString(formData, "formId");
    const fieldId = readString(formData, "fieldId");
    if (!formId || !fieldId) throw new Error("Unable to identify the field.");

    const form = await getRegistrationFormById(formId);
    if (!form) throw new Error("Form not found.");

    await deleteRegistrationField(fieldId);
    revalidateAll(form.slug);
    return buildState("success", "Field removed.");
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderRegistrationFieldsAction(
  formId: string,
  updates: { id: string; sortOrder: number }[],
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();
    if (!formId) throw new Error("Unable to identify the form.");

    const form = await getRegistrationFormById(formId);
    if (!form) throw new Error("Form not found.");

    await updateRegistrationFieldOrders(updates);
    revalidateAll(form.slug);
    return buildState("success", "Field order updated.");
  } catch (error) {
    return handleError(error);
  }
}

export async function bulkSaveRegistrationFieldsAction(
  formId: string,
  fields: {
    id: string; // "draft-..." or real ID
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
  }[]
): Promise<RegistrationAdminActionState> {
  try {
    await requireAdmin();
    if (!formId) throw new Error("Unable to identify the form.");

    const form = await getRegistrationFormById(formId);
    if (!form) throw new Error("Form not found.");

    const normalizedFields = fields.map((field) => ({
      id: field.id,
      ...normalizeFieldDefinitionInput({
        formId,
        scope: field.scope,
        type: field.type,
        key: field.key,
        label: field.label,
        sortOrder: field.sortOrder,
        options: field.options,
        required: field.required,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isUnique: field.isUnique,
        uniqueCaseSensitive: field.uniqueCaseSensitive,
      }),
    }));

    // Validate unique keys across all submitted fields
    const keys = new Set<string>();
    for (const f of normalizedFields) {
      const scopeKey = `${f.scope}:${f.key}`;
      if (keys.has(scopeKey)) {
        throw new Error(`Duplicate key "${f.key}" found in ${f.scope} fields.`);
      }
      keys.add(scopeKey);
    }

    validateConfirmationEmailSettings({
      enabled: form.confirmationEmailEnabled,
      emailFieldId: form.confirmationEmailFieldId,
      nameFieldId: form.confirmationNameFieldId,
      fields: normalizedFields,
    });

    const creates = [];
    const updates = [];
    const incomingIds = new Set(normalizedFields.map(f => f.id));

    for (const f of normalizedFields) {
      if (f.id.startsWith("draft-")) {
        creates.push(f);
      } else {
        updates.push({ ...f, fieldId: f.id });
      }
    }

    // Deletions: fields in the DB that are not in the incoming payload
    const deletes = form.fields
      .map(f => f.id)
      .filter(id => !incomingIds.has(id));

    await bulkSaveRegistrationFields({
      formId,
      creates,
      updates,
      deletes,
    });

    revalidateAll(form.slug);
    return buildState("success", "Form fields saved successfully.");
  } catch (error) {
    return handleError(error);
  }
}
