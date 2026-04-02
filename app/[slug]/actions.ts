"use server";

import { revalidatePath } from "next/cache";
import { AppwriteConfigError } from "@/lib/appwrite";
import {
  attachUniqueValueReservationsToSubmission,
  coerceFieldValue,
  createRegistrationSubmission,
  deleteRegistrationFiles,
  FormSubmissionNotAllowedError,
  getFormAvailability,
  getRegistrationFormById,
  getRegistrationFormBySlug,
  isRegistrationsConfigured,
  releaseUniqueValueReservations,
  reserveUniqueFieldValues,
  UniqueFieldConflictError,
  uploadRegistrationFile,
  validateFieldValue,
} from "@/lib/registrations";
import type { SubmissionAnswerValue } from "@/lib/registration-types";

export type SubmitRegistrationState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
  fields?: Record<string, string | string[]>;
  toastKey: number;
};

const empty: Record<string, string> = {};
const HONEYPOT_FIELD_NAME = "registration_url";
const MAX_TOTAL_UPLOAD_BYTES = 25 * 1024 * 1024;
const DEFAULT_SUCCESS_MESSAGE =
  "Registration received successfully. We will contact you with the next steps.";

function buildState(
  status: SubmitRegistrationState["status"],
  message: string | null,
  fieldErrors: Record<string, string> = empty,
  fields?: Record<string, string | string[]>,
): SubmitRegistrationState {
  return { status, message, fieldErrors, toastKey: Date.now(), fields };
}

function getSerializedFieldRecord(
  formData: FormData,
): Record<string, string | string[]> {
  const fieldsRecord: Record<string, string | string[]> = {};

  for (const [key, val] of Array.from(formData.entries())) {
    if (typeof val !== "string") continue;

    if (fieldsRecord[key] !== undefined) {
      if (Array.isArray(fieldsRecord[key])) {
        (fieldsRecord[key] as string[]).push(val);
      } else {
        fieldsRecord[key] = [fieldsRecord[key] as string, val];
      }
    } else {
      fieldsRecord[key] = val;
    }
  }

  return fieldsRecord;
}


function getTotalUploadBytes(records: Array<Record<string, SubmissionAnswerValue>>) {
  let total = 0;

  for (const record of records) {
    for (const value of Object.values(record)) {
      if (value instanceof File) {
        total += value.size;
      }
    }
  }

  return total;
}

async function uploadAnswerFiles(
  record: Record<string, SubmissionAnswerValue>,
  uploadedFileIds: string[],
) {
  for (const [key, value] of Object.entries(record)) {
    if (!(value instanceof File)) continue;

    const fileId = await uploadRegistrationFile(value);
    record[key] = fileId;
    uploadedFileIds.push(fileId);
  }
}

export async function submitRegistrationAction(
  _prev: SubmitRegistrationState,
  formData: FormData,
): Promise<SubmitRegistrationState> {
  const fieldsRecord = getSerializedFieldRecord(formData);
  const honeypotValue = formData.get(HONEYPOT_FIELD_NAME);
  if (typeof honeypotValue === "string" && honeypotValue.trim()) {
    return buildState(
      "error",
      "Unable to submit right now. Please refresh and try again.",
      empty,
      fieldsRecord,
    );
  }


  const formIdValue = formData.get("formId");
  const formId = typeof formIdValue === "string" ? formIdValue.trim() : "";
  const slugValue = formData.get("slug");
  const slug = typeof slugValue === "string" ? slugValue.trim() : "";
  if (!formId && !slug) {
    return buildState(
      "error",
      "Unable to determine which form to submit.",
      empty,
      fieldsRecord,
    );
  }

  const form = formId
    ? await getRegistrationFormById(formId)
    : await getRegistrationFormBySlug(slug);
  if (!form) return buildState("error", "This registration form was not found.", empty, fieldsRecord);

  const availability = getFormAvailability(form);
  if (!availability.isAcceptingSubmissions) {
    return buildState(
      "error",
      availability.description
        ? `This form is not accepting submissions. ${availability.description}`
        : "This form is not accepting submissions right now.",
      empty,
      fieldsRecord,
    );
  }

  if (!isRegistrationsConfigured()) {
    return buildState(
      "error",
      "Registrations are not configured yet. Contact the administrator.",
      empty,
      fieldsRecord,
    );
  }

  // Client-side validation for immediate feedback
  const fieldErrors: Record<string, string> = {};
  const submissionFields = form.fields.filter((f) => f.scope === "submission" && f.type !== "page_break");
  const memberFields = form.fields.filter((f) => f.scope === "member" && f.type !== "page_break");
  const answers: Record<string, SubmissionAnswerValue> = {};
  const uniqueValidationEntries: Array<{
    field: (typeof form.fields)[number];
    value: SubmissionAnswerValue;
    errorKey: string;
  }> = [];

  for (const field of submissionFields) {
    const name = `submission__${field.key}`;
    const rawVal = field.type === "checkbox" ? formData.getAll(name) : formData.get(name);
    const value = coerceFieldValue(field, rawVal);
    const error = validateFieldValue(field, value);
    if (error) fieldErrors[name] = error;
    answers[field.key] = value;
    if (!error && field.isUnique) {
      uniqueValidationEntries.push({ field, value, errorKey: name });
    }
  }

  const memberAnswers: Array<Record<string, SubmissionAnswerValue>> = [];

  if (memberFields.length > 0) {
    const rawCount = formData.get("memberCount");
    const memberCount = Number(typeof rawCount === "string" ? rawCount.trim() : "");

    if (
      !Number.isInteger(memberCount) ||
      memberCount < form.teamMinMembers ||
      memberCount > form.teamMaxMembers
    ) {
      fieldErrors.memberCount = `Team size must be between ${form.teamMinMembers} and ${form.teamMaxMembers}.`;
    } else {
      for (let i = 0; i < memberCount; i++) {
        const memberAnswer: Record<string, SubmissionAnswerValue> = {};
        for (const field of memberFields) {
          const name = `member__${i}__${field.key}`;
          const rawVal = field.type === "checkbox" ? formData.getAll(name) : formData.get(name);
          const value = coerceFieldValue(field, rawVal);
          const error = validateFieldValue(field, value);
          if (error) fieldErrors[name] = `Member ${i + 1}: ${error}`;
          memberAnswer[field.key] = value;
          if (!error && field.isUnique) {
            uniqueValidationEntries.push({ field, value, errorKey: name });
          }
        }
        memberAnswers.push(memberAnswer);
      }
    }
  }

  // Return early on client-side validation errors
  if (Object.keys(fieldErrors).length > 0) {
    return buildState(
      "error",
      "Please fix the highlighted fields and try again.",
      fieldErrors,
      fieldsRecord,
    );
  }

  const totalUploadBytes = getTotalUploadBytes([answers, ...memberAnswers]);
  if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
    return buildState(
      "error",
      "Combined uploads must be 25MB or less.",
      empty,
      fieldsRecord,
    );
  }

  let reservedUniqueValueIds: string[] = [];
  try {
    reservedUniqueValueIds = await reserveUniqueFieldValues({
      formId: form.id,
      entries: uniqueValidationEntries,
    });
  } catch (error) {
    if (error instanceof UniqueFieldConflictError) {
      return buildState(
        "error",
        "Please fix the highlighted fields and try again.",
        error.fieldErrors,
        fieldsRecord,
      );
    }

    if (error instanceof AppwriteConfigError) {
      return buildState("error", error.message, empty, fieldsRecord);
    }

    console.error("Unique value reservation failed:", error);
    return buildState(
      "error",
      "Unable to verify unique field values right now. Please try again.",
      empty,
      fieldsRecord,
    );
  }

  const uploadedFileIds: string[] = [];
  try {
    await uploadAnswerFiles(answers, uploadedFileIds);
    for (const member of memberAnswers) {
      await uploadAnswerFiles(member, uploadedFileIds);
    }

    const submission = await createRegistrationSubmission({
      formId: form.id,
      answers,
      memberAnswers,
      teamName: null,
    });

    await attachUniqueValueReservationsToSubmission(
      reservedUniqueValueIds,
      submission.$id,
    );

    revalidatePath("/");
    revalidatePath(`/${form.slug}`);
    revalidatePath("/admin");
    revalidatePath("/admin/registrations");

    return buildState(
      "success",
      form.successMessage || DEFAULT_SUCCESS_MESSAGE,
    );
  } catch (error) {
    try {
      await releaseUniqueValueReservations(reservedUniqueValueIds);
    } catch (cleanupError) {
      console.error("Failed to release unique value reservations:", cleanupError);
    }

    try {
      await deleteRegistrationFiles(uploadedFileIds);
    } catch (cleanupError) {
      console.error("Failed to delete uploaded registration files:", cleanupError);
    }

    if (error instanceof UniqueFieldConflictError) {
      return buildState(
        "error",
        "Please fix the highlighted fields and try again.",
        error.fieldErrors,
        fieldsRecord,
      );
    }

    if (error instanceof FormSubmissionNotAllowedError) {
      return buildState("error", error.message, empty, fieldsRecord);
    }

    if (error instanceof AppwriteConfigError) {
      return buildState("error", error.message, empty, fieldsRecord);
    }

    console.error("Direct registration submission failed:", error);
    return buildState("error", "Unable to submit right now. Please try again.", empty, fieldsRecord);
  }
}
