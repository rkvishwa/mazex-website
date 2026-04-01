"use server";

import { AppwriteException } from "node-appwrite";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  ContactBroadcastConfigError,
  getExecutionErrorMessage,
  sendRegistrationContactBroadcast,
} from "@/lib/contact-broadcasts";
import {
  listRegistrationEmailContacts,
  MessagingContactsConfigError,
} from "@/lib/messaging-contacts";
import {
  countRegistrationContactsForSegment,
  type RegistrationContactSegmentKey,
} from "@/lib/registration-contact-segments";

export type AdminContactMailActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
};

const initialState: AdminContactMailActionState = {
  status: "idle",
  message: null,
  toastKey: 0,
};

function buildState(
  status: AdminContactMailActionState["status"],
  message: string | null,
): AdminContactMailActionState {
  return {
    status,
    message,
    toastKey: Date.now(),
  };
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readSegmentKey(formData: FormData): RegistrationContactSegmentKey {
  const value = readString(formData, "segmentKey");

  if (value === "competition" || value === "workshop") {
    return value;
  }

  return "all";
}

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Your admin session has expired. Sign in again.");
  }

  return admin;
}

function handleError(error: unknown) {
  if (error instanceof AppwriteException) {
    if (error.code === 404) {
      return buildState(
        "error",
        "Contact records or the Resend Appwrite function are not set up yet. Push the latest Appwrite collections and functions first.",
      );
    }

    if ([401, 403].includes(error.code ?? 0)) {
      return buildState(
        "error",
        "The Appwrite API key needs functions.read, executions.write, databases.read, documents.read, users.read, users.write, targets.read, and targets.write scopes.",
      );
    }
  }

  if (
    error instanceof MessagingContactsConfigError ||
    error instanceof ContactBroadcastConfigError
  ) {
    return buildState("error", error.message);
  }

  return buildState("error", getExecutionErrorMessage(error));
}

export async function sendContactEmailAction(
  _prev: AdminContactMailActionState = initialState,
  formData: FormData,
): Promise<AdminContactMailActionState> {
  void _prev;

  try {
    await requireAdmin();

    const segmentKey = readSegmentKey(formData);
    const subject = readString(formData, "subject");
    const content = readString(formData, "content");
    const contacts = await listRegistrationEmailContacts();

    if (contacts.length === 0) {
      throw new Error("No registration contacts are available yet.");
    }

    const syncedRecipientCount = countRegistrationContactsForSegment(
      contacts,
      segmentKey,
      { syncedOnly: true },
    );

    if (syncedRecipientCount === 0) {
      throw new Error(
        "There are no Resend-synced contacts in the selected segment yet.",
      );
    }

    const result = await sendRegistrationContactBroadcast({
      segmentKey,
      subject,
      content,
    });

    const segmentName = result.segmentName || "selected segment";

    return buildState(
      "success",
      `Broadcast queued for ${segmentName} (${syncedRecipientCount} synced contact${syncedRecipientCount === 1 ? "" : "s"}).`,
    );
  } catch (error) {
    return handleError(error);
  }
}
