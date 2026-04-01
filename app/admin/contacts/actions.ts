"use server";

import { revalidatePath } from "next/cache";
import { AppwriteException } from "node-appwrite";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  ContactBroadcastConfigError,
  getExecutionErrorMessage,
  sendRegistrationContactBroadcast,
  syncExistingRegistrationContacts,
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
const CONTACTS_ADMIN_PATH = "/admin/contacts";
const BACKFILL_BATCH_SIZE = 5;
const MAX_BACKFILL_BATCHES = 10;

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

function getSyncedAllContactsCount(
  contacts: Awaited<ReturnType<typeof listRegistrationEmailContacts>>,
) {
  return countRegistrationContactsForSegment(contacts, "all", {
    syncedOnly: true,
  });
}

function getPendingAllContactsCount(
  contacts: Awaited<ReturnType<typeof listRegistrationEmailContacts>>,
) {
  return contacts.length - getSyncedAllContactsCount(contacts);
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

export async function syncPendingContactsAction(
  _prev: AdminContactMailActionState = initialState,
): Promise<AdminContactMailActionState> {
  void _prev;

  try {
    await requireAdmin();

    const beforeContacts = await listRegistrationEmailContacts();
    const pendingBefore = getPendingAllContactsCount(beforeContacts);

    if (pendingBefore === 0) {
      return buildState("success", "All registration contacts are already synced to Resend.");
    }

    let totalProcessed = 0;
    let totalFailed = 0;
    let cursorAfter: string | null = null;
    let hasMore = false;

    for (let index = 0; index < MAX_BACKFILL_BATCHES; index += 1) {
      const result = await syncExistingRegistrationContacts({
        batchSize: BACKFILL_BATCH_SIZE,
        cursorAfter,
      });

      totalProcessed += result.processedCount;
      totalFailed += result.failedCount;
      hasMore = result.hasMore;
      cursorAfter = result.nextCursor;

      if (!hasMore || !cursorAfter) {
        break;
      }
    }

    revalidatePath(CONTACTS_ADMIN_PATH);
    const afterContacts = await listRegistrationEmailContacts();
    const pendingAfter = getPendingAllContactsCount(afterContacts);
    const syncedNow = Math.max(0, pendingBefore - pendingAfter);

    if (pendingAfter === 0) {
      return buildState(
        "success",
        `Synced ${syncedNow} pending contact${syncedNow === 1 ? "" : "s"} to Resend.`,
      );
    }

    if (syncedNow > 0) {
      return buildState(
        "success",
        `Synced ${syncedNow} pending contact${syncedNow === 1 ? "" : "s"} to Resend. ${pendingAfter} contact${pendingAfter === 1 ? "" : "s"} still need sync${hasMore ? ", so run it again to continue the backfill." : "."}`,
      );
    }

    if (hasMore) {
      return buildState(
        "success",
        `Processed ${totalProcessed} historical submission${totalProcessed === 1 ? "" : "s"} without reaching the remaining pending contacts yet. Run the sync again to continue the backfill.`,
      );
    }

    return buildState(
      "error",
      `Processed ${totalProcessed} historical submission${totalProcessed === 1 ? "" : "s"}, but ${pendingAfter} contact${pendingAfter === 1 ? "" : "s"} still remain pending.${totalFailed > 0 ? ` ${totalFailed} submission${totalFailed === 1 ? "" : "s"} failed during backfill; check the Resend contacts function logs.` : ""}`,
    );
  } catch (error) {
    return handleError(error);
  }
}
