import "server-only";

import { AppwriteException, Databases, Models, Query } from "node-appwrite";
import { createAppwriteAdminClient } from "@/lib/appwrite";
import type { RegistrationEmailContact } from "@/lib/registration-contact-segments";

const DEFAULT_CONTACTS_COLLECTION_ID = "registration_contacts";

type RegistrationContactDoc = Models.Document & {
  email?: string;
  name?: string | null;
  userId?: string | null;
  targetId?: string | null;
  resendContactId?: string | null;
  registeredForCompetition?: boolean;
  registeredForWorkshop?: boolean;
  lastFormId?: string | null;
  lastFormTitle?: string | null;
  lastSubmissionId?: string | null;
  lastSubmittedAt?: string | null;
};

export class MessagingContactsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessagingContactsConfigError";
  }
}

function trim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function trimNullable(value: unknown) {
  const normalized = trim(value);
  return normalized || null;
}

function normalizeEmailAddress(value: unknown) {
  return trim(value).toLocaleLowerCase("en-US");
}

function getMessagingContactsConfig() {
  const databaseId = process.env.APPWRITE_DB_ID?.trim();

  if (!databaseId) {
    throw new MessagingContactsConfigError(
      "Missing required Appwrite environment variable: APPWRITE_DB_ID",
    );
  }

  return {
    databaseId,
    contactsCollectionId:
      process.env.APPWRITE_COLLECTION_REGISTRATION_CONTACTS?.trim() ||
      DEFAULT_CONTACTS_COLLECTION_ID,
  };
}

function createDatabasesService() {
  return new Databases(createAppwriteAdminClient());
}

function mapRegistrationContactDoc(
  doc: RegistrationContactDoc,
): RegistrationEmailContact | null {
  const email = normalizeEmailAddress(doc.email);

  if (!email) {
    return null;
  }

  return {
    id: doc.$id,
    email,
    name: trimNullable(doc.name),
    userId: trimNullable(doc.userId),
    targetId: trimNullable(doc.targetId),
    resendContactId: trimNullable(doc.resendContactId),
    registeredForCompetition: Boolean(doc.registeredForCompetition),
    registeredForWorkshop: Boolean(doc.registeredForWorkshop),
    lastFormId: trimNullable(doc.lastFormId),
    lastFormTitle: trimNullable(doc.lastFormTitle),
    lastSubmissionId: trimNullable(doc.lastSubmissionId),
    lastSubmittedAt: trimNullable(doc.lastSubmittedAt),
  };
}

async function listAllRegistrationContactDocuments() {
  const { databaseId, contactsCollectionId } = getMessagingContactsConfig();
  const databases = createDatabasesService();
  const documents: RegistrationContactDoc[] = [];
  let offset = 0;

  while (true) {
    const page = await databases.listDocuments<RegistrationContactDoc>(
      databaseId,
      contactsCollectionId,
      [Query.limit(100), Query.offset(offset)],
    );

    documents.push(...page.documents);

    if (page.documents.length < 100) {
      break;
    }

    offset += page.documents.length;
  }

  return documents;
}

function sortContacts(contacts: RegistrationEmailContact[]) {
  return [...contacts].sort((a, b) => {
    const aTime = a.lastSubmittedAt ?? "";
    const bTime = b.lastSubmittedAt ?? "";

    if (aTime && bTime && aTime !== bTime) {
      return bTime.localeCompare(aTime);
    }

    if (aTime && !bTime) return -1;
    if (!aTime && bTime) return 1;

    return a.email.localeCompare(b.email);
  });
}

export async function listRegistrationEmailContacts() {
  try {
    const contacts = (await listAllRegistrationContactDocuments())
      .map(mapRegistrationContactDoc)
      .filter((contact): contact is RegistrationEmailContact => contact !== null);

    return sortContacts(contacts);
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      return [];
    }

    throw error;
  }
}
