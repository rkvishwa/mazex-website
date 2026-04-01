"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Link2,
  ShieldAlert,
  X,
} from "lucide-react";
import { updateAdminEventsAction, type UpdateAdminEventsState } from "@/app/admin/events/actions";
import FormattedPickerInput from "@/components/FormattedPickerInput";
import { formatStoredDateForInput } from "@/lib/date-format";
import type { AdminSiteEventItem } from "@/lib/site-event-types";
import type {
  RegistrationFormKind,
  RegistrationFormStatus,
} from "@/lib/registration-types";

type AdminEventFormOption = {
  id: string;
  title: string;
  slug: string;
  status: RegistrationFormStatus;
  kind: RegistrationFormKind;
};

const initialState: UpdateAdminEventsState = {
  status: "idle",
  message: null,
  toastKey: 0,
  resetTargetEventKey: null,
};

function SaveEventButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending ? "Saving..." : "Save event"}
    </button>
  );
}

function EventToggle({
  name,
  defaultEnabled,
}: {
  name: string;
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div className="w-full max-w-sm">
      <input type="hidden" name={name} value={enabled ? "on" : "off"} />
      <div className="flex justify-end">
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Enable Event
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Enable event"
            onClick={() => setEnabled((value) => !value)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:focus:ring-zinc-200 dark:focus:ring-offset-zinc-900 ${
              enabled
                ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                : "border-zinc-300 bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-700"
            }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-zinc-950 ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${
              enabled
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {enabled ? "Open" : "Close"}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RegistrationFormStatus }) {
  const className =
    status === "open"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
      : status === "draft"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
        : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {status}
    </span>
  );
}

function Toast({
  state,
  onClose,
}: {
  state: { id: string; message: string; status: UpdateAdminEventsState["status"] };
  onClose: () => void;
}) {
  const isSuccess = state.status === "success";

  return (
    <div
      className={`fixed left-4 right-4 top-4 z-50 mx-auto flex w-auto max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl sm:left-auto sm:right-6 ${
        isSuccess
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
          : "border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100"
      }`}
      role="status"
      aria-live="polite"
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <p className="flex-1 pr-2 leading-tight">{state.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function FieldShell({
  label,
  children,
  description,
}: {
  label: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-col justify-between">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="mt-1 min-h-[1rem]">
        {description ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function EventCard({
  event,
  forms,
  formAction,
  submissionState,
}: {
  event: AdminSiteEventItem;
  forms: AdminEventFormOption[];
  formAction: (payload: FormData) => void;
  submissionState: UpdateAdminEventsState;
}) {
  const eligibleForms = forms.filter((form) => form.kind === event.requiredFormKind);
  const formResetKey =
    submissionState.status === "error" &&
    submissionState.resetTargetEventKey === event.key
      ? submissionState.toastKey
      : 0;

  return (
    <form
      key={`${getEventRenderKey(event)}:${formResetKey}`}
      action={formAction}
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="targetEventKey" value={event.key} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {event.kind === "competition" ? "Competition" : `Workshop ${event.number}`}
            </span>
            {event.linkedForm?.status ? <StatusBadge status={event.linkedForm.status} /> : null}
            {event.linkedFormMissing ? (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                Linked form unavailable
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {event.kind === "workshop"
              ? `${event.title} - ${formatStoredDateForInput(event.defaultDate)}`
              : event.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {event.kind === "competition"
              ? "Control the public competition registration window, navbar CTA, and linked form availability from one place."
              : event.description}
          </p>
          {event.linkedForm ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-950">
                <Link2 className="h-4 w-4" />
                {event.linkedForm.title}
              </span>
              <a
                href={`/${event.linkedForm.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
              >
                /{event.linkedForm.slug}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : event.linkedFormMissing ? (
            <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">
              The previously linked form is no longer available. Select a replacement to restore this event.
            </p>
          ) : null}
        </div>

        <EventToggle
          name={`${event.key}__enabled`}
          defaultEnabled={event.enabled}
        />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <FieldShell
          label={event.kind === "competition" ? "Competition form" : "Workshop form"}
          description={`Only ${event.requiredFormKind} forms are available here. Draft forms cannot be linked.`}
        >
          <select
            name={`${event.key}__formId`}
            defaultValue={event.formId ?? ""}
            className="block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          >
            <option value="">No form linked</option>
            {event.linkedFormMissing && event.formId ? (
              <option value={event.formId}>
                Previously linked form unavailable
              </option>
            ) : null}
            {eligibleForms.map((form) => (
              <option key={form.id} value={form.id} disabled={form.status === "draft"}>
                {form.title} ({form.status === "draft" ? "draft, unavailable" : form.status})
              </option>
            ))}
          </select>
        </FieldShell>

        {event.kind === "competition" ? (
          <>
            <FieldShell label="Open date">
              <FormattedPickerInput
                key={`${event.key}:open:${event.openDate ?? ""}`}
                name={`${event.key}__openDate`}
                mode="date"
                defaultValue={event.openDate}
                placeholder="yyyy/mm/dd"
                inputMode="numeric"
                ariaLabel={`Select the open date for ${event.title}`}
                className="block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </FieldShell>
            <FieldShell label="Close date">
              <FormattedPickerInput
                key={`${event.key}:close:${event.closeDate ?? ""}`}
                name={`${event.key}__closeDate`}
                mode="date"
                defaultValue={event.closeDate}
                placeholder="yyyy/mm/dd"
                inputMode="numeric"
                ariaLabel={`Select the close date for ${event.title}`}
                className="block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </FieldShell>
          </>
        ) : (
          <>
            <FieldShell label="Open date">
              <FormattedPickerInput
                key={`${event.key}:open:${event.openDate ?? ""}`}
                name={`${event.key}__openDate`}
                mode="date"
                defaultValue={event.openDate}
                placeholder="yyyy/mm/dd"
                inputMode="numeric"
                ariaLabel={`Select the open date for ${event.title}`}
                className="block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </FieldShell>
            <FieldShell label="End date">
              <FormattedPickerInput
                key={`${event.key}:close:${event.closeDate ?? ""}`}
                name={`${event.key}__closeDate`}
                mode="date"
                defaultValue={event.closeDate}
                placeholder="yyyy/mm/dd"
                inputMode="numeric"
                ariaLabel={`Select the end date for ${event.title}`}
                className="block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </FieldShell>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Save this card to update the public event, CTA state, and linked form availability.
        </p>
        <SaveEventButton />
      </div>
    </form>
  );
}

function getEventRenderKey(event: AdminSiteEventItem) {
  if (event.kind === "competition") {
    return [
      event.key,
      event.enabled ? "enabled" : "disabled",
      event.formId ?? "none",
      event.openDate ?? "none",
      event.closeDate ?? "none",
      event.linkedForm?.slug ?? "no-slug",
      event.linkedFormMissing ? "missing" : "present",
    ].join(":");
  }

  return [
    event.key,
    event.enabled ? "enabled" : "disabled",
    event.formId ?? "none",
    event.openDate ?? "none",
    event.closeDate ?? "none",
    event.linkedForm?.slug ?? "no-slug",
    event.linkedFormMissing ? "missing" : "present",
  ].join(":");
}

export default function AdminEventsForm({
  forms,
  events,
}: {
  forms: AdminEventFormOption[];
  events: AdminSiteEventItem[];
}) {
  const router = useRouter();
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);
  const [state, formAction] = useActionState(updateAdminEventsAction, initialState);

  const activeToastId =
    state.message && state.status !== "idle"
      ? `${state.status}:${state.toastKey}`
      : null;

  useEffect(() => {
    if (state.status === "success" && state.toastKey) {
      router.refresh();
    }
  }, [router, state.status, state.toastKey]);

  useEffect(() => {
    if (!activeToastId) return;

    const timeoutId = window.setTimeout(() => {
      setDismissedToastId(activeToastId);
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [activeToastId]);

  const visibleToast =
    state.message &&
    state.status !== "idle" &&
    activeToastId !== dismissedToastId
      ? {
          id: activeToastId!,
          message: state.message,
          status: state.status,
        }
      : null;

  return (
    <>
      {visibleToast ? (
        <Toast
          state={visibleToast}
          onClose={() => setDismissedToastId(visibleToast.id)}
        />
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-0">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              <CalendarDays className="h-3.5 w-3.5" />
              Events
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Manage public events and registration links
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Competition dates and workshop registration windows are managed here, while workshop timeline dates on the home page stay hard-coded.
              Form Builder still owns the form schema, fields, and content. Each card saves independently.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {events.map((event) => (
              <EventCard
                key={getEventRenderKey(event)}
                event={event}
                forms={forms}
                formAction={formAction}
                submissionState={state}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
