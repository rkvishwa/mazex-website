import type {
  FormDefinition,
  RegistrationFormKind,
  RegistrationFormStatus,
} from "@/lib/registration-types";

export type SiteEventKey =
  | "competition_registration"
  | "workshop_foundations"
  | "workshop_microcontrollers"
  | "workshop_pid_control"
  | "workshop_maze_solving";

export type CompetitionEventConfig = {
  enabled: boolean;
  formId: string | null;
  openDate: string | null;
  closeDate: string | null;
};

export type WorkshopEventConfig = {
  enabled: boolean;
  formId: string | null;
  openDate: string | null;
  closeDate: string | null;
};

export type SiteEventConfig = CompetitionEventConfig | WorkshopEventConfig;

export type SiteEventLinkedForm = Pick<
  FormDefinition,
  "id" | "title" | "slug" | "status" | "kind"
>;

export type SiteEventDefinitionBase = {
  key: SiteEventKey;
  title: string;
  requiredFormKind: RegistrationFormKind;
};

export type CompetitionEventDefinition = SiteEventDefinitionBase & {
  key: "competition_registration";
  kind: "competition";
};

export type WorkshopEventDefinition = SiteEventDefinitionBase & {
  key:
    | "workshop_foundations"
    | "workshop_microcontrollers"
    | "workshop_pid_control"
    | "workshop_maze_solving";
  kind: "workshop";
  number: string;
  description: string;
  defaultDate: string;
};

export type SiteEventDefinition =
  | CompetitionEventDefinition
  | WorkshopEventDefinition;

export const COMPETITION_SITE_EVENT: CompetitionEventDefinition = {
  key: "competition_registration",
  kind: "competition",
  title: "Competition Registration",
  requiredFormKind: "competition",
};

export const WORKSHOP_SITE_EVENTS: WorkshopEventDefinition[] = [
  {
    key: "workshop_foundations",
    kind: "workshop",
    number: "01",
    title: "Foundations, Components & Build Start",
    description:
      "Introduction to Micromouse rules, robot anatomy, and electronics basics. Teams begin their physical build.",
    defaultDate: "2026-04-11",
    requiredFormKind: "workshop",
  },
  {
    key: "workshop_microcontrollers",
    kind: "workshop",
    number: "02",
    title: "Microcontrollers, Sensors & Basic Movement",
    description:
      "Microcontroller setup, IR sensor interfacing, and encoder integration. Robot performs its first movements.",
    defaultDate: "2026-04-18",
    requiredFormKind: "workshop",
  },
  {
    key: "workshop_pid_control",
    kind: "workshop",
    number: "03",
    title: "PID Control & Wall Following",
    description:
      "PID theory, tuning, and implementation for stable wall-following behaviour.",
    defaultDate: "2026-04-25",
    requiredFormKind: "workshop",
  },
  {
    key: "workshop_maze_solving",
    kind: "workshop",
    number: "04",
    title: "Maze-Solving Algorithms & Full Integration",
    description:
      "Flood Fill algorithm and full system integration into a competition-ready robot.",
    defaultDate: "2026-05-02",
    requiredFormKind: "workshop",
  },
];

export const SITE_EVENT_DEFINITIONS: SiteEventDefinition[] = [
  COMPETITION_SITE_EVENT,
  ...WORKSHOP_SITE_EVENTS,
];

export type CompetitionCtaState =
  | "coming-soon"
  | "countdown"
  | "open"
  | "temporarily-closed"
  | "closed";

function getValidTimestamp(value: string | null) {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function resolveCompetitionCta(params: {
  enabled: boolean;
  openAt: string | null;
  closeAt: string | null;
  registerHref: string | null;
  now?: number;
}) {
  const now = params.now ?? Date.now();
  const openAtTimestamp = getValidTimestamp(params.openAt);
  const closeAtTimestamp = getValidTimestamp(params.closeAt);

  if (
    openAtTimestamp !== null &&
    closeAtTimestamp !== null &&
    openAtTimestamp > closeAtTimestamp
  ) {
    return {
      ctaState: "coming-soon" as const,
      countdownTarget: null,
    };
  }

  if (closeAtTimestamp !== null && now > closeAtTimestamp) {
    return {
      ctaState: "closed" as const,
      countdownTarget: null,
    };
  }

  if (openAtTimestamp === null) {
    return {
      ctaState: "coming-soon" as const,
      countdownTarget: null,
    };
  }

  if (now < openAtTimestamp) {
    return {
      ctaState: "countdown" as const,
      countdownTarget: params.openAt,
    };
  }

  if (!params.enabled) {
    return {
      ctaState: "temporarily-closed" as const,
      countdownTarget: null,
    };
  }

  if (params.enabled && params.registerHref) {
    return {
      ctaState: "open" as const,
      countdownTarget: closeAtTimestamp !== null ? params.closeAt : null,
    };
  }

  return {
    ctaState: "coming-soon" as const,
    countdownTarget: null,
  };
}

export type ResolvedCompetitionEvent = {
  key: CompetitionEventDefinition["key"];
  title: string;
  enabled: boolean;
  formId: string | null;
  formSlug: string | null;
  formTitle: string | null;
  formStatus: RegistrationFormStatus | null;
  linkedFormMissing: boolean;
  openDate: string | null;
  closeDate: string | null;
  openAt: string | null;
  closeAt: string | null;
  ctaState: CompetitionCtaState;
  countdownTarget: string | null;
  registerHref: string | null;
  navbarHref: string;
  scheduleLabel: string | null;
};

export type ResolvedWorkshopEvent = {
  key: WorkshopEventDefinition["key"];
  number: string;
  title: string;
  description: string;
  enabled: boolean;
  date: string;
  displayDate: string;
  formId: string | null;
  formSlug: string | null;
  formTitle: string | null;
  formStatus: RegistrationFormStatus | null;
  linkedFormMissing: boolean;
  openDate: string | null;
  closeDate: string | null;
  registerHref: string | null;
  isRegisterEnabled: boolean;
};

export type AdminCompetitionEventItem = {
  key: CompetitionEventDefinition["key"];
  kind: "competition";
  title: string;
  requiredFormKind: RegistrationFormKind;
  enabled: boolean;
  formId: string | null;
  openDate: string | null;
  closeDate: string | null;
  linkedForm: SiteEventLinkedForm | null;
  linkedFormMissing: boolean;
};

export type AdminWorkshopEventItem = {
  key: WorkshopEventDefinition["key"];
  kind: "workshop";
  number: string;
  title: string;
  description: string;
  requiredFormKind: RegistrationFormKind;
  enabled: boolean;
  formId: string | null;
  openDate: string | null;
  closeDate: string | null;
  defaultDate: string;
  linkedForm: SiteEventLinkedForm | null;
  linkedFormMissing: boolean;
};

export type AdminSiteEventItem =
  | AdminCompetitionEventItem
  | AdminWorkshopEventItem;

export type ResolvedSiteEvents = {
  competition: ResolvedCompetitionEvent;
  workshops: ResolvedWorkshopEvent[];
  adminItems: AdminSiteEventItem[];
};
