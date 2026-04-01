export const REGISTRATION_CONTACT_SEGMENTS = [
  {
    key: "all",
    label: "All registered users",
    description: "Every registrant synced to Resend.",
  },
  {
    key: "competition",
    label: "Registered for competition",
    description: "Registrants who submitted at least one competition form.",
  },
  {
    key: "workshop",
    label: "Registered for workshops",
    description: "Registrants who submitted at least one workshop form.",
  },
] as const;

export type RegistrationContactSegmentKey =
  (typeof REGISTRATION_CONTACT_SEGMENTS)[number]["key"];

export type RegistrationEmailContact = {
  id: string;
  email: string;
  name: string | null;
  userId: string | null;
  targetId: string | null;
  resendContactId: string | null;
  registeredForCompetition: boolean;
  registeredForWorkshop: boolean;
  lastFormId: string | null;
  lastFormTitle: string | null;
  lastSubmissionId: string | null;
  lastSubmittedAt: string | null;
};

export function isRegistrationContactSyncedToResend(
  contact: RegistrationEmailContact,
) {
  return Boolean(contact.resendContactId);
}

export function contactBelongsToSegment(
  contact: RegistrationEmailContact,
  segmentKey: RegistrationContactSegmentKey,
  options?: { syncedOnly?: boolean },
) {
  if (options?.syncedOnly && !isRegistrationContactSyncedToResend(contact)) {
    return false;
  }

  switch (segmentKey) {
    case "all":
      return true;
    case "competition":
      return contact.registeredForCompetition;
    case "workshop":
      return contact.registeredForWorkshop;
    default:
      return false;
  }
}

export function countRegistrationContactsForSegment(
  contacts: RegistrationEmailContact[],
  segmentKey: RegistrationContactSegmentKey,
  options?: { syncedOnly?: boolean },
) {
  return contacts.filter((contact) =>
    contactBelongsToSegment(contact, segmentKey, options),
  ).length;
}
