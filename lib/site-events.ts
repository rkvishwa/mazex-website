import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  COLOMBO_OFFSET,
  formatDateDisplay,
  formatStoredDateForInput,
  getStoredDateFromIso,
} from "@/lib/date-format";
import {
  getFormAvailability,
  listRegistrationForms,
  updateRegistrationFormSettings,
} from "@/lib/registrations";
import { getSiteResourceValue, upsertSiteResourceValue } from "@/lib/site-resources";
import type { FormDefinition } from "@/lib/registration-types";
import {
  COMPETITION_SITE_EVENT,
  SITE_EVENT_DEFINITIONS,
  WORKSHOP_SITE_EVENTS,
  resolveCompetitionCta,
  type AdminSiteEventItem,
  type CompetitionEventConfig,
  type ResolvedCompetitionEvent,
  type ResolvedSiteEvents,
  type ResolvedWorkshopEvent,
  type SiteEventConfig,
  type SiteEventKey,
  type WorkshopEventConfig,
} from "@/lib/site-event-types";

const SITE_EVENT_RESOURCE_PREFIX = "site_event_";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getSiteEventResourceKey(key: SiteEventKey) {
  return `${SITE_EVENT_RESOURCE_PREFIX}${key}`;
}

export function isValidSiteEventDate(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00${COLOMBO_OFFSET}`).getTime());
}

function normalizeStoredDate(value: unknown) {
  const normalized = normalizeString(value);
  return isValidSiteEventDate(normalized) ? normalized : null;
}

export function formatSiteEventDate(date: string) {
  return formatStoredDateForInput(date);
}

function formatLongDate(date: string | null) {
  if (!date) return null;
  return formatDateDisplay(`${date}T00:00:00${COLOMBO_OFFSET}`);
}

export function getCompetitionOpenAtIso(date: string | null) {
  return isValidSiteEventDate(date)
    ? new Date(`${date}T00:00:00${COLOMBO_OFFSET}`).toISOString()
    : null;
}

export function getCompetitionCloseAtIso(date: string | null) {
  return isValidSiteEventDate(date)
    ? new Date(`${date}T23:59:59.999${COLOMBO_OFFSET}`).toISOString()
    : null;
}

function getCurrentColomboDate(now: Date = new Date()) {
  return getStoredDateFromIso(now);
}

export function getAutoManagedSiteEventEnabled(
  config: Pick<CompetitionEventConfig, "enabled" | "openDate" | "closeDate">,
  currentDate = getCurrentColomboDate(),
) {
  if (
    !currentDate ||
    !config.openDate ||
    !config.closeDate ||
    config.openDate > config.closeDate
  ) {
    return config.enabled;
  }

  if (currentDate > config.closeDate) {
    return false;
  }

  if (currentDate < config.openDate) {
    return false;
  }

  return config.enabled;
}

function getAutoManagedSiteEventConfig<T extends SiteEventConfig>(
  config: T,
  currentDate = getCurrentColomboDate(),
): T {
  const enabled = getAutoManagedSiteEventEnabled(config, currentDate);

  if (enabled === config.enabled) {
    return config;
  }

  return {
    ...config,
    enabled,
  } as T;
}

export function getSiteEventFormSyncState(
  config: Pick<CompetitionEventConfig, "enabled" | "openDate" | "closeDate">,
  currentDate = getCurrentColomboDate(),
) {
  const enabled = getAutoManagedSiteEventEnabled(config, currentDate);

  return {
    status: enabled ? ("open" as const) : ("closed" as const),
    openAt: getCompetitionOpenAtIso(config.openDate),
    closeAt: getCompetitionCloseAtIso(config.closeDate),
  };
}

export function getSiteEventDatesFromFormWindow(params: {
  openAt: string | null;
  closeAt: string | null;
}) {
  return {
    openDate: getStoredDateFromIso(params.openAt),
    closeDate: getStoredDateFromIso(params.closeAt),
  };
}

function normalizeCompetitionConfig(value: unknown): CompetitionEventConfig {
  const record = isRecord(value) ? value : {};

  return {
    enabled: Boolean(record.enabled),
    formId: normalizeString(record.formId),
    openDate: normalizeStoredDate(record.openDate),
    closeDate: normalizeStoredDate(record.closeDate),
  };
}

function normalizeWorkshopConfig(
  value: unknown,
): WorkshopEventConfig {
  const record = isRecord(value) ? value : {};

  return {
    enabled: Boolean(record.enabled),
    formId: normalizeString(record.formId),
    openDate: normalizeStoredDate(record.openDate),
    closeDate: normalizeStoredDate(record.closeDate),
  };
}

function parseStoredConfig(raw: string | null, key: SiteEventKey): SiteEventConfig {
  let parsed: unknown = null;

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (key === COMPETITION_SITE_EVENT.key) {
    return normalizeCompetitionConfig(parsed);
  }

  return normalizeWorkshopConfig(parsed);
}

export function getDefaultSiteEventConfigs() {
  const configs: Record<SiteEventKey, SiteEventConfig> = {
    competition_registration: {
      enabled: false,
      formId: null,
      openDate: null,
      closeDate: null,
    },
    workshop_foundations: {
      enabled: false,
      formId: null,
      openDate: null,
      closeDate: null,
    },
    workshop_microcontrollers: {
      enabled: false,
      formId: null,
      openDate: null,
      closeDate: null,
    },
    workshop_pid_control: {
      enabled: false,
      formId: null,
      openDate: null,
      closeDate: null,
    },
    workshop_maze_solving: {
      enabled: false,
      formId: null,
      openDate: null,
      closeDate: null,
    },
  };

  return configs;
}

async function getStoredSiteEventConfigs() {
  noStore();

  const configs = getDefaultSiteEventConfigs();
  const values = await Promise.all(
    SITE_EVENT_DEFINITIONS.map(async (definition) => {
      const raw = await getSiteResourceValue(getSiteEventResourceKey(definition.key));
      return [definition.key, parseStoredConfig(raw, definition.key)] as const;
    }),
  );

  for (const [key, config] of values) {
    configs[key] = config;
  }

  return configs;
}

type SiteEventSnapshot = {
  configs: Record<SiteEventKey, SiteEventConfig>;
  forms: FormDefinition[];
};

async function getSynchronizedSiteEventSnapshot(): Promise<SiteEventSnapshot> {
  const [storedConfigs, forms] = await Promise.all([
    getStoredSiteEventConfigs(),
    listRegistrationForms({ skipSiteEventAutoSync: true }),
  ]);
  const currentDate = getCurrentColomboDate();
  const nextConfigs = { ...storedConfigs } as Record<SiteEventKey, SiteEventConfig>;
  const nextForms = [...forms];
  const formIndexById = new Map(nextForms.map((form, index) => [form.id, index]));
  const formUpdates: Promise<unknown>[] = [];
  let hasConfigChanges = false;

  for (const definition of SITE_EVENT_DEFINITIONS) {
    const storedConfig = storedConfigs[definition.key];
    const nextConfig = getAutoManagedSiteEventConfig(storedConfig, currentDate);
    nextConfigs[definition.key] = nextConfig;

    if (nextConfig.enabled !== storedConfig.enabled) {
      hasConfigChanges = true;
    }

    if (!nextConfig.formId) {
      continue;
    }

    const formIndex = formIndexById.get(nextConfig.formId);
    if (formIndex === undefined) {
      continue;
    }

    const form = nextForms[formIndex];
    const desiredState = getSiteEventFormSyncState(nextConfig, currentDate);

    if (
      form.status === desiredState.status &&
      form.openAt === desiredState.openAt &&
      form.closeAt === desiredState.closeAt
    ) {
      continue;
    }

    nextForms[formIndex] = {
      ...form,
      status: desiredState.status,
      openAt: desiredState.openAt,
      closeAt: desiredState.closeAt,
    };

    formUpdates.push(
      updateRegistrationFormSettings({
        formId: form.id,
        slug: form.slug,
        title: form.title,
        description: form.description,
        status: desiredState.status,
        openAt: desiredState.openAt,
        closeAt: desiredState.closeAt,
        successMessage: form.successMessage,
        confirmationEmailEnabled: form.confirmationEmailEnabled,
        confirmationEmailTemplate: form.confirmationEmailTemplate,
        confirmationEmailFieldId: form.confirmationEmailFieldId,
        confirmationNameFieldId: form.confirmationNameFieldId,
        teamMinMembers: form.teamMinMembers,
        teamMaxMembers: form.teamMaxMembers,
      }),
    );
  }

  if (hasConfigChanges || formUpdates.length > 0) {
    try {
      await Promise.all([
        hasConfigChanges ? upsertSiteEventConfigs(nextConfigs) : Promise.resolve(),
        ...formUpdates,
      ]);
    } catch {
      // Keep serving the computed state even if the background sync write fails.
    }
  }

  return {
    configs: nextConfigs,
    forms: nextForms,
  };
}

export async function syncSiteEventDateTransitionsIfNeeded() {
  await getSynchronizedSiteEventSnapshot();
}

export async function getSiteEventConfigs() {
  const { configs } = await getSynchronizedSiteEventSnapshot();
  return configs;
}

export async function upsertSiteEventConfig(
  key: SiteEventKey,
  config: SiteEventConfig,
) {
  return upsertSiteResourceValue(
    getSiteEventResourceKey(key),
    JSON.stringify(config),
  );
}

export async function upsertSiteEventConfigs(
  configs: Record<SiteEventKey, SiteEventConfig>,
) {
  await Promise.all(
    (Object.entries(configs) as Array<[SiteEventKey, SiteEventConfig]>).map(
      ([key, config]) => upsertSiteEventConfig(key, config),
    ),
  );
}

function toLinkedForm(form: FormDefinition | null) {
  if (!form) return null;

  return {
    id: form.id,
    title: form.title,
    slug: form.slug,
    status: form.status,
    kind: form.kind,
  } as const;
}

function resolveCompetitionEvent(
  config: CompetitionEventConfig,
  linkedForm: FormDefinition | null,
  now: Date,
  currentDate: string | null,
): ResolvedCompetitionEvent {
  const effectiveConfig = getAutoManagedSiteEventConfig(config, currentDate);
  const openAt = getCompetitionOpenAtIso(effectiveConfig.openDate);
  const closeAt = getCompetitionCloseAtIso(effectiveConfig.closeDate);
  const registerHref = linkedForm?.slug ? `/${linkedForm.slug}` : null;
  const { ctaState, countdownTarget } = resolveCompetitionCta({
    enabled: effectiveConfig.enabled,
    openAt,
    closeAt,
    registerHref,
    now: now.getTime(),
  });

  const openDateLabel = formatLongDate(effectiveConfig.openDate);
  const closeDateLabel = formatLongDate(effectiveConfig.closeDate);
  const scheduleLabel =
    ctaState === "countdown"
      ? openDateLabel && closeDateLabel
        ? `Opens ${openDateLabel} and closes ${closeDateLabel}.`
        : openDateLabel
          ? `Opens ${openDateLabel}.`
          : null
      : ctaState === "open"
        ? closeDateLabel
          ? `Closes ${closeDateLabel}.`
          : openDateLabel
            ? `Opened ${openDateLabel}.`
            : null
        : ctaState === "temporarily-closed"
          ? closeDateLabel
            ? `Registration is temporarily closed. Scheduled window ends ${closeDateLabel}.`
            : "Registration is temporarily closed."
        : ctaState === "closed"
          ? closeDateLabel
            ? `Closed ${closeDateLabel}.`
            : null
          : openDateLabel
            ? `Opens ${openDateLabel}.`
            : null;

  return {
    key: COMPETITION_SITE_EVENT.key,
    title: COMPETITION_SITE_EVENT.title,
    enabled: effectiveConfig.enabled,
    formId: effectiveConfig.formId,
    formSlug: linkedForm?.slug ?? null,
    formTitle: linkedForm?.title ?? null,
    formStatus: linkedForm?.status ?? null,
    linkedFormMissing: Boolean(effectiveConfig.formId && !linkedForm),
    openDate: effectiveConfig.openDate,
    closeDate: effectiveConfig.closeDate,
    openAt,
    closeAt,
    ctaState,
    countdownTarget,
    registerHref,
    navbarHref:
      ctaState === "open" && registerHref ? registerHref : "/#register",
    scheduleLabel,
  };
}

function resolveWorkshopEvent(
  config: WorkshopEventConfig,
  definition: (typeof WORKSHOP_SITE_EVENTS)[number],
  linkedForm: FormDefinition | null,
  currentDate: string | null,
): ResolvedWorkshopEvent {
  const effectiveConfig = getAutoManagedSiteEventConfig(config, currentDate);
  const date = definition.defaultDate;
  const registerHref = linkedForm?.slug ? `/${linkedForm.slug}` : null;
  const openDate = effectiveConfig.openDate ?? getStoredDateFromIso(linkedForm?.openAt);
  const closeDate = effectiveConfig.closeDate ?? getStoredDateFromIso(linkedForm?.closeAt);
  const isRegisterEnabled = Boolean(
    effectiveConfig.enabled &&
      registerHref &&
      linkedForm &&
      getFormAvailability(linkedForm).isAcceptingSubmissions,
  );

  return {
    key: definition.key,
    number: definition.number,
    title: definition.title,
    description: definition.description,
    enabled: effectiveConfig.enabled,
    date,
    displayDate: formatSiteEventDate(date),
    formId: effectiveConfig.formId,
    formSlug: linkedForm?.slug ?? null,
    formTitle: linkedForm?.title ?? null,
    formStatus: linkedForm?.status ?? null,
    linkedFormMissing: Boolean(effectiveConfig.formId && !linkedForm),
    openDate,
    closeDate,
    registerHref,
    isRegisterEnabled,
  };
}

export async function getResolvedSiteEvents(): Promise<ResolvedSiteEvents> {
  noStore();

  const { configs, forms } = await getSynchronizedSiteEventSnapshot();
  const now = new Date();
  const currentDate = getCurrentColomboDate(now);
  const formsById = new Map(forms.map((form) => [form.id, form]));

  const competitionConfig = configs[COMPETITION_SITE_EVENT.key] as CompetitionEventConfig;
  const competitionForm = competitionConfig.formId
    ? formsById.get(competitionConfig.formId) ?? null
    : null;
  const competition = resolveCompetitionEvent(
    competitionConfig,
    competitionForm,
    now,
    currentDate,
  );

  const workshops = WORKSHOP_SITE_EVENTS.map((definition) => {
    const config = configs[definition.key] as WorkshopEventConfig;
    const linkedForm = config.formId ? formsById.get(config.formId) ?? null : null;
    return resolveWorkshopEvent(config, definition, linkedForm, currentDate);
  });

  const adminItems: AdminSiteEventItem[] = [
    {
      key: competition.key,
      kind: "competition",
      title: competition.title,
      requiredFormKind: "competition",
      enabled: competition.enabled,
      formId: competition.formId,
      openDate: competition.openDate,
      closeDate: competition.closeDate,
      linkedForm: toLinkedForm(competitionForm),
      linkedFormMissing: competition.linkedFormMissing,
    },
    ...WORKSHOP_SITE_EVENTS.map((definition, index) => {
      const workshop = workshops[index];
      const linkedForm = workshop.formId
        ? formsById.get(workshop.formId) ?? null
        : null;

      return {
        key: definition.key,
        kind: "workshop" as const,
        number: definition.number,
        title: definition.title,
        description: definition.description,
        requiredFormKind: definition.requiredFormKind,
        enabled: workshop.enabled,
        formId: workshop.formId,
        openDate: workshop.openDate,
        closeDate: workshop.closeDate,
        defaultDate: definition.defaultDate,
        linkedForm: toLinkedForm(linkedForm),
        linkedFormMissing: workshop.linkedFormMissing,
      };
    }),
  ];

  return {
    competition,
    workshops,
    adminItems,
  };
}
