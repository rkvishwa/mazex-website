"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  LoaderCircle,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import {
  createAdminShortLinkAction,
  type CreateAdminShortLinkState,
  manageAdminShortLinkAction,
  type ManageAdminShortLinkState,
} from "@/app/admin/link-shortener/actions";
import type {
  ShortLinkStatus,
  ShortLinkSummary,
} from "@/lib/short-link-types";

const initialState: CreateAdminShortLinkState = {
  status: "idle",
  message: null,
  toastKey: 0,
  createdLink: null,
};

const initialManageState: ManageAdminShortLinkState = {
  status: "idle",
  message: null,
  toastKey: 0,
  linkId: null,
  intent: null,
};

function normalizeBaseUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  try {
    const url = new URL(trimmedValue);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/u, "");
  } catch {
    return "";
  }
}

function buildShortLinkUrl(baseUrl: string, shortCode: string) {
  const shortPath = `/url/${shortCode}`;
  return baseUrl ? `${baseUrl}${shortPath}` : shortPath;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getStatusTone(status: ShortLinkStatus) {
  if (status === "active") {
    return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100";
  }

  if (status === "expired") {
    return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100";
  }

  return "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-100";
}

function getStatusLabel(status: ShortLinkStatus) {
  if (status === "active") {
    return "Active";
  }

  if (status === "expired") {
    return "Expired";
  }

  return "Paused";
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending ? "Creating..." : "Create short link"}
    </button>
  );
}

function CopyButton({
  value,
  copied,
  onCopy,
}: {
  value: string;
  copied: boolean;
  onCopy: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(value)}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      <Copy className="h-4 w-4" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ManageButton({
  icon: Icon,
  idleLabel,
  pendingLabel,
  tone,
}: {
  icon: typeof ToggleLeft;
  idleLabel: string;
  pendingLabel: string;
  tone: "default" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "danger"
          ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }`}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function DeleteButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 shadow-sm transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <X className="h-4 w-4" />
      )}
      {pending ? "Deleting..." : "Delete link"}
    </button>
  );
}

function DeleteConfirmationDialog({
  shortCode,
  isOpen,
  onCancel,
}: {
  shortCode: string;
  isOpen: boolean;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Confirm delete for /url/${shortCode}`}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Delete this short link?
        </h4>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            /url/{shortCode}
          </span>{" "}
          will be permanently deleted and this action cannot be undone.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950"
          >
            {pending ? "Deleting..." : "Yes, delete link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortLinkCard({
  baseUrl,
  copiedValue,
  onCopy,
  shortLink,
}: {
  baseUrl: string;
  copiedValue: string | null;
  onCopy: (value: string) => void;
  shortLink: ShortLinkSummary;
}) {
  const router = useRouter();
  const handledSuccessToastKeyRef = useRef(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [state, formAction] = useActionState(
    manageAdminShortLinkAction,
    initialManageState,
  );
  const shortLinkUrl = buildShortLinkUrl(baseUrl, shortLink.shortCode);

  useEffect(() => {
    if (
      state.status === "success" &&
      state.toastKey &&
      handledSuccessToastKeyRef.current !== state.toastKey
    ) {
      handledSuccessToastKeyRef.current = state.toastKey;
      router.refresh();
    }
  }, [router, state.status, state.toastKey]);

  useEffect(() => {
    if (
      state.status === "success" &&
      state.intent === "delete" &&
      state.linkId === shortLink.id
    ) {
      setIsDeleteDialogOpen(false);
    }
  }, [shortLink.id, state.intent, state.linkId, state.status]);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${getStatusTone(shortLink.status)}`}
              >
                {getStatusLabel(shortLink.status)}
              </span>
              <span className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {shortLink.visitCount} click{shortLink.visitCount === 1 ? "" : "s"}
              </span>
            </div>

            <a
              href={shortLinkUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center gap-2 break-all text-base font-semibold text-zinc-900 transition hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
            >
              {shortLinkUrl}
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <CopyButton
              value={shortLinkUrl}
              copied={copiedValue === shortLinkUrl}
              onCopy={onCopy}
            />
            <a
              href={shortLink.destinationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Open destination
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {state.status !== "idle" && state.message ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
                : "border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100"
            }`}
            role="status"
            aria-live="polite"
          >
            {state.message}
          </div>
        ) : null}

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Destination URL
          </p>
          <a
            href={shortLink.destinationUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all text-sm text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            {shortLink.destinationUrl}
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Created
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {formatDateTime(shortLink.createdAt)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Expires
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {formatDateTime(shortLink.expiresAt)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Last click
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {formatDateTime(shortLink.lastVisitedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <form action={formAction}>
            <input type="hidden" name="intent" value="toggle" />
            <input type="hidden" name="linkId" value={shortLink.id} />
            <input
              type="hidden"
              name="nextActiveState"
              value={shortLink.isActive ? "false" : "true"}
            />
            <ManageButton
              icon={shortLink.isActive ? ToggleRight : ToggleLeft}
              idleLabel={shortLink.isActive ? "Disable temporarily" : "Enable link"}
              pendingLabel={shortLink.isActive ? "Disabling..." : "Enabling..."}
              tone="default"
            />
          </form>

          <form action={formAction}>
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="linkId" value={shortLink.id} />
            <DeleteButton onClick={() => setIsDeleteDialogOpen(true)} />
            <DeleteConfirmationDialog
              shortCode={shortLink.shortCode}
              isOpen={isDeleteDialogOpen}
              onCancel={() => setIsDeleteDialogOpen(false)}
            />
          </form>
        </div>
      </div>
    </article>
  );
}

export default function AdminLinkShortenerManager({
  configuredBaseUrl,
  initialShortLinks,
}: {
  configuredBaseUrl: string;
  initialShortLinks: ShortLinkSummary[];
}) {
  const router = useRouter();
  const handledCreateSuccessToastKeyRef = useRef(0);
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [state, formAction] = useActionState(
    createAdminShortLinkAction,
    initialState,
  );

  useEffect(() => {
    if (!copiedValue) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedValue(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copiedValue]);

  const activeToastId =
    state.status !== "idle" && state.message
      ? `${state.status}:${state.toastKey}`
      : null;

  useEffect(() => {
    if (!activeToastId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedToastId(activeToastId);
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [activeToastId]);

  useEffect(() => {
    if (
      state.status === "success" &&
      state.toastKey &&
      handledCreateSuccessToastKeyRef.current !== state.toastKey
    ) {
      handledCreateSuccessToastKeyRef.current = state.toastKey;
      router.refresh();
    }
  }, [router, state.status, state.toastKey]);

  const visibleToast =
    activeToastId &&
    state.message &&
    state.status !== "idle" &&
    activeToastId !== dismissedToastId
      ? {
          id: activeToastId,
          message: state.message,
          status: state.status,
        }
      : null;

  const baseUrl =
    normalizeBaseUrl(configuredBaseUrl) ||
    (typeof window !== "undefined"
      ? normalizeBaseUrl(window.location.origin)
      : "");

  const hasLinks = initialShortLinks.length > 0;

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
    } catch {
      setCopiedValue(null);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    const timezoneField = event.currentTarget.elements.namedItem(
      "timezoneOffsetMinutes",
    );

    if (timezoneField instanceof HTMLInputElement) {
      timezoneField.value = String(new Date().getTimezoneOffset());
    }
  }

  return (
    <>
      {visibleToast ? (
        <div
          className={`fixed left-4 right-4 top-4 z-50 mx-auto flex w-auto max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl sm:left-auto sm:right-6 ${
            visibleToast.status === "success"
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
              : "border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100"
          }`}
          role="status"
          aria-live="polite"
        >
          {visibleToast.status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="flex-1 pr-2 leading-tight">{visibleToast.message}</p>
          <button
            type="button"
            onClick={() => setDismissedToastId(visibleToast.id)}
            aria-label="Close notification"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white px-3 py-5 shadow-sm sm:p-6 md:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              Link Shortener
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Create reliable short links for campaigns, forms, and announcements
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Create short URLs under <code>/url/&lt;short-name&gt;</code>, optionally
              set an expiry date, and review every generated link in one place.
            </p>
          </div>

          <div className="mt-8">
            <form
              key={state.status === "success" ? state.toastKey : 0}
              action={formAction}
              onSubmit={handleFormSubmit}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <input
                type="hidden"
                name="timezoneOffsetMinutes"
                defaultValue="0"
              />

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="destinationUrl"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Destination URL
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Link2 className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      id="destinationUrl"
                      name="destinationUrl"
                      type="url"
                      inputMode="url"
                      placeholder="https://example.com/register"
                      className="block h-11 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                      required
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Use the full destination, including <code>https://</code>.
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <label
                      htmlFor="shortCode"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Short name
                      <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                        optional
                      </span>
                    </label>
                    <input
                      id="shortCode"
                      name="shortCode"
                      type="text"
                      placeholder="event-launch"
                      className="mt-1 block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                    />
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      We normalize spaces and punctuation into a clean slug.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="expiresAtLocal"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Expiry date
                      <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                        optional
                      </span>
                    </label>
                    <div className="relative mt-1 rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <CalendarClock className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <input
                        id="expiresAtLocal"
                        name="expiresAtLocal"
                        type="datetime-local"
                        className="block h-11 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Leave blank for a link that stays active.
                    </p>
                  </div>
                </div>

                <SubmitButton />
              </div>
            </form>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white px-3 py-5 shadow-sm sm:p-6 md:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  Existing Links
                </div>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Manage generated short URLs
                </h3>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  Review destinations, expiry windows, click activity, and temporarily disable or delete links when needed.
                </p>
              </div>
              <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {initialShortLinks.length} total links
              </div>
            </div>
          </div>

          {hasLinks ? (
            <div className="mt-6 grid gap-4">
              {initialShortLinks.map((shortLink) => (
                <ShortLinkCard
                  key={shortLink.id}
                  baseUrl={baseUrl}
                  copiedValue={copiedValue}
                  onCopy={handleCopy}
                  shortLink={shortLink}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                No short links yet
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Create the first one above and it will appear here immediately.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
