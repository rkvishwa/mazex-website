"use server";

import { AppwriteException } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { AppwriteConfigError } from "@/lib/appwrite";
import { getStoredDateFromIso, parseDisplayDateInput } from "@/lib/date-format";
import {
  getRegistrationFormById,
  listRegistrationForms,
  updateRegistrationFormSettings,
} from "@/lib/registrations";
import {
  COMPETITION_SITE_EVENT,
  WORKSHOP_SITE_EVENTS,
  type CompetitionEventConfig,
  type SiteEventConfig,
  type SiteEventKey,
  type WorkshopEventConfig,
} from "@/lib/site-event-types";
import {
  getAutoManagedSiteEventEnabled,
  getSiteEventFormSyncState,
  upsertSiteEventConfig,
  getSiteEventConfigs,
  upsertSiteEventConfigs,
} from "@/lib/site-events";

export type UpdateAdminEventsState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
  resetTargetEventKey: SiteEventKey | null;
};

const initialState: UpdateAdminEventsState = {
  status: "idle",
  message: null,
  toastKey: 0,
  resetTargetEventKey: null,
};

function buildState(
  status: UpdateAdminEventsState["status"],
  message: string | null,
  options?: {
    resetTargetEventKey?: SiteEventKey | null;
  },
): UpdateAdminEventsState {
  return {
    status,
    message,
    toastKey: Date.now(),
    resetTargetEventKey: options?.resetTargetEventKey ?? null,
  };
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return null;
  return parseDisplayDateInput(value);
}

function isSiteEventKey(value: string): value is SiteEventKey {
  return (
    value === COMPETITION_SITE_EVENT.key ||
    WORKSHOP_SITE_EVENTS.some((event) => event.key === value)
  );
}

function getSiteEventTitle(key: SiteEventKey) {
  if (key === COMPETITION_SITE_EVENT.key) {
    return COMPETITION_SITE_EVENT.title;
  }

  return WORKSHOP_SITE_EVENTS.find((event) => event.key === key)?.title ?? key;
}

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Your admin session has expired. Sign in again to continue.");
  }

  return admin;
}

function revalidateAll(paths: string[]) {
  const uniquePaths = new Set([
    "/",
    "/admin",
    "/admin/events",
    "/admin/form-builder",
    "/admin/registrations",
    ...paths,
  ]);

  for (const path of uniquePaths) {
    revalidatePath(path);
  }
}

function handleError(error: unknown): UpdateAdminEventsState {
  if (error instanceof ManualOpenBeforeWindowStartedError) {
    return buildState("error", error.message, {
      resetTargetEventKey: error.eventKey,
    });
  }

  if (error instanceof ManualOpenAfterWindowEndedError) {
    return buildState("error", error.message, {
      resetTargetEventKey: error.eventKey,
    });
  }

  if (error instanceof AppwriteException) {
    if (error.code === 404) {
      return buildState(
        "error",
        "Events resources or registration forms were not found. Push the Appwrite config first.",
      );
    }

    if ([401, 403].includes(error.code ?? 0)) {
      return buildState(
        "error",
        "The Appwrite API key needs databases.read and databases.write scopes.",
      );
    }

    return buildState(
      "error",
      error.message || "Unable to update the events right now.",
    );
  }

  if (error instanceof AppwriteConfigError) {
    return buildState("error", error.message);
  }

  return buildState(
    "error",
    error instanceof Error ? error.message : "Unable to update the events right now.",
  );
}

class ManualOpenBeforeWindowStartedError extends Error {
  eventKey: SiteEventKey;

  constructor(eventKey: SiteEventKey, title: string) {
    super(
      `${title} cannot be manually opened before its registration open date. Change the open date first.`,
    );
    this.name = "ManualOpenBeforeWindowStartedError";
    this.eventKey = eventKey;
  }
}

class ManualOpenAfterWindowEndedError extends Error {
  eventKey: SiteEventKey;

  constructor(eventKey: SiteEventKey, title: string) {
    super(
      `${title} cannot be manually opened after its close date has passed. Change the dates first.`,
    );
    this.name = "ManualOpenAfterWindowEndedError";
    this.eventKey = eventKey;
  }
}

function assertLinkedForm(
  formId: string | null,
  formsById: Map<string, Awaited<ReturnType<typeof listRegistrationForms>>[number]>,
  requiredKind: "competition" | "workshop",
  title: string,
) {
  if (!formId) return null;

  const form = formsById.get(formId);
  if (!form) {
    throw new Error(`The linked form for ${title} could not be found.`);
  }

  if (form.kind !== requiredKind) {
    throw new Error(`${title} must be linked to a ${requiredKind} form.`);
  }

  if (form.status === "draft") {
    throw new Error(`${title} cannot be linked to a draft form. Open or close the form first.`);
  }

  return form;
}

function assertCanOpenBeforeRegistrationStarts(params: {
  eventKey: SiteEventKey;
  title: string;
  currentEnabled: boolean;
  requestedEnabled: boolean;
  openDate: string | null;
  currentDate: string | null;
}) {
  const { eventKey, title, currentEnabled, requestedEnabled, openDate, currentDate } = params;

  if (currentEnabled) return;
  if (!requestedEnabled) return;
  if (!currentDate || !openDate) return;
  if (currentDate >= openDate) return;

  throw new ManualOpenBeforeWindowStartedError(eventKey, title);
}

function assertCanReopenExpiredEvent(params: {
  eventKey: SiteEventKey;
  title: string;
  currentEnabled: boolean;
  requestedEnabled: boolean;
  closeDate: string | null;
  currentDate: string | null;
}) {
  const { eventKey, title, currentEnabled, requestedEnabled, closeDate, currentDate } = params;

  if (currentEnabled) return;
  if (!requestedEnabled) return;
  if (!currentDate || !closeDate) return;
  if (currentDate <= closeDate) return;

  throw new ManualOpenAfterWindowEndedError(eventKey, title);
}

async function syncLinkedForm(
  formId: string,
  state:
    | {
        status: "open" | "closed";
        openAt: string | null;
        closeAt: string | null;
      }
    | undefined,
) {
  if (!state) return;

  const form = await getRegistrationFormById(formId);
  if (!form) return;

  await updateRegistrationFormSettings({
    formId: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    kind: form.kind,
    status: state.status,
    openAt: state.openAt,
    closeAt: state.closeAt,
    successMessage: form.successMessage,
    confirmationEmailEnabled: form.confirmationEmailEnabled,
    confirmationEmailTemplate: form.confirmationEmailTemplate,
    confirmationEmailFieldId: form.confirmationEmailFieldId,
    confirmationNameFieldId: form.confirmationNameFieldId,
    googleSheetsSyncEnabled: form.googleSheetsSyncEnabled,
    googleSheetsSelectedFieldIds: form.googleSheetsSelectedFieldIds,
    googleSheetsAdminUserId: form.googleSheetsAdminUserId,
    googleSheetsSheetTitle: form.googleSheetsSheetTitle,
    teamMinMembers: form.teamMinMembers,
    teamMaxMembers: form.teamMaxMembers,
  });
}

export async function updateAdminEventsAction(
  previousState: UpdateAdminEventsState = initialState,
  formData: FormData,
): Promise<UpdateAdminEventsState> {
  try {
    void previousState;
    await requireAdmin();

    const [currentConfigs, forms] = await Promise.all([
      getSiteEventConfigs(),
      listRegistrationForms({ skipSiteEventAutoSync: true }),
    ]);
    const currentDate = getStoredDateFromIso(new Date());
    const formsById = new Map(forms.map((form) => [form.id, form]));
    const targetEventKey = (() => {
      const raw = readString(formData, "targetEventKey");
      return isSiteEventKey(raw) ? raw : null;
    })();

    const shouldReadCompetition =
      !targetEventKey || targetEventKey === COMPETITION_SITE_EVENT.key;
    const currentCompetitionConfig =
      currentConfigs[COMPETITION_SITE_EVENT.key] as CompetitionEventConfig;
    const competitionRequestedEnabled =
      formData.get(`${COMPETITION_SITE_EVENT.key}__enabled`) === "on";
    const competitionConfig: CompetitionEventConfig = shouldReadCompetition
      ? {
          enabled: getAutoManagedSiteEventEnabled({
            enabled: competitionRequestedEnabled,
            openDate: readOptionalDate(
              formData,
              `${COMPETITION_SITE_EVENT.key}__openDate`,
            ),
            closeDate: readOptionalDate(
              formData,
              `${COMPETITION_SITE_EVENT.key}__closeDate`,
            ),
          }),
          formId:
            readString(formData, `${COMPETITION_SITE_EVENT.key}__formId`) || null,
          openDate: readOptionalDate(
            formData,
            `${COMPETITION_SITE_EVENT.key}__openDate`,
          ),
          closeDate: readOptionalDate(
            formData,
            `${COMPETITION_SITE_EVENT.key}__closeDate`,
          ),
        }
      : (currentConfigs[COMPETITION_SITE_EVENT.key] as CompetitionEventConfig);

    if (shouldReadCompetition) {
      if (
        readString(formData, `${COMPETITION_SITE_EVENT.key}__openDate`) &&
        !competitionConfig.openDate
      ) {
        throw new Error("Enter a valid open date for Competition Registration in yyyy/mm/dd format.");
      }

      if (
        readString(formData, `${COMPETITION_SITE_EVENT.key}__closeDate`) &&
        !competitionConfig.closeDate
      ) {
        throw new Error("Enter a valid close date for Competition Registration in yyyy/mm/dd format.");
      }

      assertCanOpenBeforeRegistrationStarts({
        eventKey: COMPETITION_SITE_EVENT.key,
        title: COMPETITION_SITE_EVENT.title,
        currentEnabled: currentCompetitionConfig.enabled,
        requestedEnabled: competitionRequestedEnabled,
        openDate: competitionConfig.openDate,
        currentDate,
      });

      assertCanReopenExpiredEvent({
        eventKey: COMPETITION_SITE_EVENT.key,
        title: COMPETITION_SITE_EVENT.title,
        currentEnabled: currentCompetitionConfig.enabled,
        requestedEnabled: competitionRequestedEnabled,
        closeDate: competitionConfig.closeDate,
        currentDate,
      });

      if (competitionConfig.enabled) {
        if (!competitionConfig.formId) {
          throw new Error("Select a competition form before enabling Competition Registration.");
        }
        if (!competitionConfig.openDate || !competitionConfig.closeDate) {
          throw new Error("Competition Registration needs both an open date and a close date.");
        }
        if (competitionConfig.openDate > competitionConfig.closeDate) {
          throw new Error("Competition Registration open date must be before the close date.");
        }
      }

      assertLinkedForm(
        competitionConfig.formId,
        formsById,
        "competition",
        COMPETITION_SITE_EVENT.title,
      );
    }

    const workshopConfigs = WORKSHOP_SITE_EVENTS.map((event) => {
      const shouldReadEvent = !targetEventKey || targetEventKey === event.key;
      if (!shouldReadEvent) {
        return [event.key, currentConfigs[event.key] as WorkshopEventConfig] as const;
      }

      const currentConfig = currentConfigs[event.key] as WorkshopEventConfig;

      const formId = readString(formData, `${event.key}__formId`) || null;
      const rawOpenDate = readString(formData, `${event.key}__openDate`);
      const rawCloseDate = readString(formData, `${event.key}__closeDate`);
      const openDate = rawOpenDate
        ? readOptionalDate(formData, `${event.key}__openDate`)
        : null;
      const closeDate = rawCloseDate
        ? readOptionalDate(formData, `${event.key}__closeDate`)
        : null;

      if (rawOpenDate && !openDate) {
        throw new Error(`Enter a valid open date for ${event.title} in yyyy/mm/dd format.`);
      }

      if (rawCloseDate && !closeDate) {
        throw new Error(`Enter a valid end date for ${event.title} in yyyy/mm/dd format.`);
      }

      const requestedEnabled = formData.get(`${event.key}__enabled`) === "on";
      assertCanOpenBeforeRegistrationStarts({
        eventKey: event.key,
        title: event.title,
        currentEnabled: currentConfig.enabled,
        requestedEnabled,
        openDate,
        currentDate,
      });

      assertCanReopenExpiredEvent({
        eventKey: event.key,
        title: event.title,
        currentEnabled: currentConfig.enabled,
        requestedEnabled,
        closeDate,
        currentDate,
      });

      const config: WorkshopEventConfig = {
        enabled: getAutoManagedSiteEventEnabled({
          enabled: requestedEnabled,
          openDate,
          closeDate,
        }),
        formId,
        openDate,
        closeDate,
      };

      if (config.enabled && !config.formId) {
        throw new Error(`Select a workshop form before enabling ${event.title}.`);
      }

      if (config.enabled && (!config.openDate || !config.closeDate)) {
        throw new Error(`${event.title} needs both an open date and an end date.`);
      }

      if (
        config.enabled &&
        config.openDate &&
        config.closeDate &&
        config.openDate > config.closeDate
      ) {
        throw new Error(`${event.title} open date must be before the end date.`);
      }

      assertLinkedForm(config.formId, formsById, "workshop", event.title);
      return [event.key, config] as const;
    });

    const nextConfigs: Record<SiteEventKey, SiteEventConfig> = {
      competition_registration: competitionConfig,
      workshop_foundations:
        workshopConfigs.find(([key]) => key === "workshop_foundations")?.[1] ??
        {
          enabled: false,
          formId: null,
          openDate: null,
          closeDate: null,
        },
      workshop_microcontrollers:
        workshopConfigs.find(([key]) => key === "workshop_microcontrollers")?.[1] ??
        {
          enabled: false,
          formId: null,
          openDate: null,
          closeDate: null,
        },
      workshop_pid_control:
        workshopConfigs.find(([key]) => key === "workshop_pid_control")?.[1] ??
        {
          enabled: false,
          formId: null,
          openDate: null,
          closeDate: null,
        },
      workshop_maze_solving:
        workshopConfigs.find(([key]) => key === "workshop_maze_solving")?.[1] ??
        {
          enabled: false,
          formId: null,
          openDate: null,
          closeDate: null,
        },
    };

    const usedForms = new Map<string, string>();
    for (const [key, config] of Object.entries(nextConfigs) as Array<
      [SiteEventKey, SiteEventConfig]
    >) {
      const formId = config.formId;
      if (!formId) continue;

      const existingEvent = usedForms.get(formId);
      if (existingEvent) {
        throw new Error("A form can only be linked to one event at a time.");
      }

      usedForms.set(formId, key);
    }

    const affectedKeys = targetEventKey
      ? [targetEventKey]
      : (Object.keys(nextConfigs) as SiteEventKey[]);
    const affectedFormIds = new Set<string>();
    for (const key of affectedKeys) {
      const currentConfig = currentConfigs[key];
      if (currentConfig.formId) affectedFormIds.add(currentConfig.formId);

      const nextConfig = nextConfigs[key];
      if (nextConfig.formId) affectedFormIds.add(nextConfig.formId);
    }

    const desiredFormStates = new Map<
      string,
      { status: "open" | "closed"; openAt: string | null; closeAt: string | null }
    >();

    if (
      affectedKeys.includes(COMPETITION_SITE_EVENT.key) &&
      competitionConfig.formId
    ) {
      desiredFormStates.set(
        competitionConfig.formId,
        getSiteEventFormSyncState(competitionConfig),
      );
    }

    for (const [key, config] of workshopConfigs) {
      if (!affectedKeys.includes(key)) continue;
      if (!config.formId) continue;

      desiredFormStates.set(config.formId, getSiteEventFormSyncState(config));
    }

    for (const formId of affectedFormIds) {
      if (!desiredFormStates.has(formId)) {
        desiredFormStates.set(formId, {
          status: "closed",
          openAt: null,
          closeAt: null,
        });
      }
    }

    await Promise.all(
      Array.from(desiredFormStates.entries()).map(([formId, state]) =>
        syncLinkedForm(formId, state),
      ),
    );

    if (targetEventKey) {
      await upsertSiteEventConfig(targetEventKey, nextConfigs[targetEventKey]);
    } else {
      await upsertSiteEventConfigs(nextConfigs);
    }

    const revalidateSlugs = new Set<string>();
    for (const formId of affectedFormIds) {
      const form = formsById.get(formId);
      if (form?.slug) {
        revalidateSlugs.add(`/${form.slug}`);
      }
    }

    revalidateAll(Array.from(revalidateSlugs));

    return buildState(
      "success",
      targetEventKey
        ? `${getSiteEventTitle(targetEventKey)} updated successfully.`
        : "Events updated successfully.",
    );
  } catch (error) {
    return handleError(error);
  }
}
