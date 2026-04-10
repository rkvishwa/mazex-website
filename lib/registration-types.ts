export const REGISTRATION_FORM_KINDS = ["competition", "workshop"] as const;
export const REGISTRATION_FORM_STATUSES = ["draft", "open", "closed"] as const;
export const REGISTRATION_FIELD_SCOPES = ["submission", "member"] as const;
export const REGISTRATION_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "select",
  "radio",
  "checkbox",
  "date",
  "time",
  "file",
  "page_break"
] as const;
export const REGISTRATION_FIELD_PLACEHOLDER_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "select",
  "date",
  "time",
] as const;
export const REGISTRATION_FIELD_UNIQUE_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "select",
  "radio",
  "date",
  "time",
] as const;
export const REGISTRATION_FIELD_CASE_SENSITIVE_UNIQUE_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "select",
  "radio",
] as const;

export type RegistrationFormKind = (typeof REGISTRATION_FORM_KINDS)[number];
export type RegistrationFormStatus = (typeof REGISTRATION_FORM_STATUSES)[number];
export type FieldScope = (typeof REGISTRATION_FIELD_SCOPES)[number];
export type FieldType = (typeof REGISTRATION_FIELD_TYPES)[number];

export type FieldOption = {
  label: string;
  value: string;
};

// FieldValidation removed

export type FieldDefinition = {
  id: string;
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
};

export type FormDefinition = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: RegistrationFormKind;
  status: RegistrationFormStatus;
  openAt: string | null;
  closeAt: string | null;
  successMessage: string | null;
  confirmationEmailEnabled: boolean;
  confirmationEmailTemplate: string | null;
  confirmationEmailFieldId: string | null;
  confirmationNameFieldId: string | null;
  googleSheetsSyncEnabled: boolean;
  googleSheetsSelectedFieldIds: string[];
  googleSheetsAdminUserId: string | null;
  googleSheetsSheetTitle: string | null;
  teamMinMembers: number;
  teamMaxMembers: number;
  bannerFileId: string | null;
  sortOrder: number;
};

export type FormWithFields = FormDefinition & {
  fields: FieldDefinition[];
};

export type FormAvailabilityState = "open" | "upcoming" | "closed";

export type FormAvailability = {
  state: FormAvailabilityState;
  label: string;
  description: string | null;
  isAcceptingSubmissions: boolean;
};

export type FormCard = FormDefinition & {
  availability: FormAvailability;
};

export type SubmissionAnswerValue = string | number | boolean | null | string[] | File;
export type SubmissionAnswers = Record<string, SubmissionAnswerValue>;

export type SubmissionPayload = {
  formId: string;
  answers: SubmissionAnswers;
  memberAnswers: SubmissionAnswers[];
  teamName: string | null;
};

export type SubmissionSummary = {
  id: string;
  formId: string;
  formSlug: string | null;
  formTitle: string | null;
  createdAt: string;
  displayTitle: string;
  displaySubtitle: string | null;
  teamName: string | null;
  commonMatches?: SubmissionCommonMatch[];
};

export type SubmissionDetail = SubmissionSummary & {
  answers: SubmissionAnswers;
  memberAnswers: SubmissionAnswers[];
};

export type SubmissionCommonMatch = {
  formId: string;
  formSlug: string | null;
  formTitle: string | null;
  submissionId: string;
  createdAt: string;
};

export type RegistrationOverviewItem = {
  form: FormDefinition;
  availability: FormAvailability;
  submissionCount: number;
};

export type RegistrationOverviewTrendPoint = {
  date: string;
  label: string;
  total: number;
  competitions: number;
  workshops: number;
};

export type RegistrationOverviewFormBreakdownPoint = {
  formId: string;
  label: string;
  kind: RegistrationFormKind;
  availabilityState: FormAvailabilityState;
  submissions: number;
};

export type RegistrationOverviewCategoryBreakdownPoint = {
  key: RegistrationFormKind;
  label: string;
  value: number;
};

export type RegistrationOverviewWeekdayPoint = {
  weekday: string;
  submissions: number;
};

export type RegistrationOverviewAnalyticsSummary = {
  last7DaysSubmissions: number;
  previous7DaysSubmissions: number;
  averageSubmissionsPerForm: number;
  topFormTitle: string | null;
  topFormCount: number;
  peakDayLabel: string | null;
  peakDayCount: number;
  busiestWeekday: string | null;
  busiestWeekdayCount: number;
};

export type RegistrationOverviewAnalytics = {
  trend: RegistrationOverviewTrendPoint[];
  formBreakdown: RegistrationOverviewFormBreakdownPoint[];
  kindBreakdown: RegistrationOverviewCategoryBreakdownPoint[];
  weekdayBreakdown: RegistrationOverviewWeekdayPoint[];
  summary: RegistrationOverviewAnalyticsSummary;
};

export type RegistrationOverview = {
  forms: RegistrationOverviewItem[];
  totalSubmissions: number;
  recentSubmissions: SubmissionDetail[];
  analytics: RegistrationOverviewAnalytics;
};

export type SubmissionFilters = {
  formId?: string;
  commonFormIds?: string[] | null;
  commonFieldKey?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number | "all";
  searchField?: string | null;
  searchQuery?: string | null;
};

export type SubmissionPage = {
  submissions: SubmissionDetail[];
  total: number;
  page: number;
  pageSize: number | "all";
};

export const MAX_REGISTRATION_FORMS = 5;

/** Slugs that are reserved by the Next.js app and cannot be used for forms. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "signin",
  "register",
  "resources",
  "_next",
]);

export function fieldTypeSupportsPlaceholder(type: FieldType) {
  return REGISTRATION_FIELD_PLACEHOLDER_TYPES.includes(
    type as (typeof REGISTRATION_FIELD_PLACEHOLDER_TYPES)[number],
  );
}

export function fieldTypeSupportsUnique(type: FieldType) {
  return REGISTRATION_FIELD_UNIQUE_TYPES.includes(
    type as (typeof REGISTRATION_FIELD_UNIQUE_TYPES)[number],
  );
}

export function fieldTypeSupportsCaseSensitiveUnique(type: FieldType) {
  return REGISTRATION_FIELD_CASE_SENSITIVE_UNIQUE_TYPES.includes(
    type as (typeof REGISTRATION_FIELD_CASE_SENSITIVE_UNIQUE_TYPES)[number],
  );
}

export function fieldTypeSupportsGoogleSheetsSync(type: FieldType) {
  return type !== "page_break" && type !== "file";
}
