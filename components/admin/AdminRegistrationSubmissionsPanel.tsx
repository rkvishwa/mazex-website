"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ListFilter } from "lucide-react";
import FormattedPickerInput from "@/components/FormattedPickerInput";
import {
  listCommonUserFieldOptions,
} from "@/lib/registration-common-fields";
import { formatDateTimeDisplay, formatStoredDateForInput } from "@/lib/date-format";
import type {
  FormDefinition,
  FormWithFields,
  SubmissionDetail,
  SubmissionPage,
  SubmissionSummary,
} from "@/lib/registration-types";

import FormSelectorDropdown from "@/components/admin/FormSelectorDropdown";
import { OptimisticSubmissionDrawer } from "@/components/admin/OptimisticSubmissionDrawer";
import SubmissionRowInteractive from "@/components/admin/SubmissionRowInteractive";
import { useRouter } from "next/navigation";

const FORM_FILTER_ITEM_ID = "__form_filter__";

function normalizeCommonFormSlugs(value: string[] | null | undefined) {
  return Array.from(
    new Set((value ?? []).map((item) => item.trim()).filter(Boolean)),
  );
}

function normalizeCommonFieldKey(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function formatValue(
  value: unknown,
  fieldType?: FormWithFields["fields"][number]["type"],
) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (fieldType === "date" && typeof value === "string") {
    return formatStoredDateForInput(value);
  }

  return String(value);
}

function formatTimestamp(value: string) {
  return formatDateTimeDisplay(value);
}

export function buildPageHref({
  slug,
  page,
  from,
  to,
  submissionId,
  pageSize,
  searchField,
  searchQuery,
  mode,
  commonFormSlugs,
  commonFieldKey,
}: {
  slug?: string | null;
  page?: number;
  from?: string | null;
  to?: string | null;
  submissionId?: string | null;
  pageSize?: number | "all" | null;
  searchField?: string | null;
  searchQuery?: string | null;
  mode?: "single" | "common";
  commonFormSlugs?: string[] | null;
  commonFieldKey?: string | null;
}) {
  const params = new URLSearchParams();
  const normalizedCommonFormSlugs = normalizeCommonFormSlugs(commonFormSlugs);
  const normalizedCommonFieldKey = normalizeCommonFieldKey(commonFieldKey);

  if (mode === "common") {
    params.set("mode", "common");
    if (normalizedCommonFormSlugs.length > 0) {
      params.set("commonForms", normalizedCommonFormSlugs.join(","));
    }
    if (normalizedCommonFieldKey) {
      params.set("commonField", normalizedCommonFieldKey);
    }
  } else if (slug) {
    params.set("form", slug);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (submissionId) params.set("submission", submissionId);
  if (pageSize && pageSize !== 15) params.set("pageSize", String(pageSize));
  if (searchField) params.set("searchField", searchField);
  if (searchQuery) params.set("searchQuery", searchQuery);

  const query = params.toString();
  return query ? `/admin/registrations?${query}` : "/admin/registrations";
}

export function SubmissionDetailPanel({
  form,
  submission,
  onCloseHref,
}: {
  form: FormWithFields | null;
  submission: SubmissionDetail;
  onCloseHref: string;
}) {
  const labelMap = new Map(form?.fields.map((f) => [f.key, f.label] as const) ?? []);
  const typeMap = new Map(form?.fields.map((f) => [f.key, f.type] as const) ?? []);

  return (
    <div className="w-full bg-white dark:bg-zinc-900">
      <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 bg-white/95 px-6 pb-6 pt-6 backdrop-blur-md sm:px-8 sm:pt-8 dark:border-zinc-800/80 dark:bg-zinc-900/95">
        <div>
           <p className="text-[0.625rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Submission Detail
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {submission.displayTitle}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Submitted on {formatTimestamp(submission.createdAt)}
          </p>
        </div>

        <Link
          href={onCloseHref}
           className="-m-2 rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
           aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </Link>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {submission.displaySubtitle && <SummaryItem label="Contact" value={submission.displaySubtitle} />}
          {submission.teamName && <SummaryItem label="Team name" value={submission.teamName} />}
          <SummaryItem label="Form" value={submission.formTitle ?? form?.title ?? "Unknown form"} />
        </div>

        {submission.commonMatches && submission.commonMatches.length > 0 ? (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Common across forms
            </h4>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {submission.commonMatches.map((match) => (
                <SummaryItem
                  key={`${submission.id}-${match.formId}-${match.submissionId}`}
                  label={match.formTitle ?? "Form"}
                  value={`Submitted ${formatTimestamp(match.createdAt)}`}
                  vertical
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Submission fields
        </h4>
        <div className="mt-4 space-y-3">
          {Object.entries(submission.answers).map(([key, value]) => (
            <SummaryItem
              key={key}
              label={labelMap.get(key) ?? key}
              value={formatValue(value, typeMap.get(key))}
              vertical
            />
          ))}
        </div>
      </div>

      {submission.memberAnswers.length > 0 ? (
        <div className="mt-8 space-y-4">
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Team members
          </h4>
          {submission.memberAnswers.map((member, index) => (
             <div
              key={`${submission.id}-member-${index}`}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
               <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                Member {index + 1}
              </p>
              <div className="space-y-3">
                {Object.entries(member).map(([key, value]) => (
                  <SummaryItem
                    key={`${submission.id}-${index}-${key}`}
                    label={labelMap.get(key) ?? key}
                    value={formatValue(value, typeMap.get(key))}
                    vertical
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      </div>
    </div>
  );
}

function SummaryItem({ label, value, vertical = false }: { label: string; value: string; vertical?: boolean }) {
  if (vertical) {
    return (
       <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-right truncate">
        {value}
      </span>
    </div>
  );
}

function CommonFormFilterDropdown({
  forms,
  selectedSlugs,
  selectedFieldKey,
  onToggleSlug,
  onFieldKeyChange,
  onApply,
  disabled,
}: {
  forms: FormWithFields[];
  selectedSlugs: string[];
  selectedFieldKey: string;
  onToggleSlug: (slug: string) => void;
  onFieldKeyChange: (fieldKey: string) => void;
  onApply: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSlugSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);
  const selectedForms = useMemo(
    () => forms.filter((candidate) => selectedSlugSet.has(candidate.slug)),
    [forms, selectedSlugSet],
  );
  const fieldOptions = useMemo(
    () => listCommonUserFieldOptions(selectedForms),
    [selectedForms],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside, { capture: true });
      document.addEventListener("touchstart", handleClickOutside, { capture: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, { capture: true });
      document.removeEventListener("touchstart", handleClickOutside, { capture: true });
    };
  }, [open]);

  const buttonLabel =
    selectedForms.length === 0
      ? "Select forms"
      : selectedForms.length === 1
      ? selectedForms[0].title
      : `${selectedForms.length} forms selected`;

  return (
    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <div className="relative w-full min-w-0 md:max-w-88 md:flex-1" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-[3.125rem] w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-700"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ListFilter className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="truncate">{buttonLabel}</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open ? (
          <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="max-h-[18.75rem] overflow-y-auto px-1.5">
              {forms.map((candidate) => {
                const isChecked = selectedSlugSet.has(candidate.slug);

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => onToggleSlug(candidate.slug)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition-all hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isChecked
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-300 text-transparent dark:border-zinc-700"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{candidate.title}</span>
                      <span className="block text-[0.625rem] font-bold uppercase tracking-wider text-zinc-400">
                        {candidate.kind}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="w-full min-w-0 md:min-w-52 md:flex-1">
        <label htmlFor="common-field-select" className="sr-only">
          Match by field
        </label>
        <select
          id="common-field-select"
          value={selectedFieldKey}
          onChange={(event) => onFieldKeyChange(event.target.value)}
          disabled={fieldOptions.length === 0}
          aria-label="Match by field"
          className="block h-[3.125rem] w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
        >
          {fieldOptions.length === 0 ? (
            <option value="">No shared fields</option>
          ) : (
            fieldOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
        {fieldOptions.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Select forms that share the same comparable submission field.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        className="inline-flex h-[3.125rem] w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:self-end dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-300"
      >
        Filter
      </button>
    </div>
  );
}

function SubmissionRow({
  submission,
  href,
  isActive,
  sequenceNumber,
  showCommonMatches = false,
}: {
  submission: SubmissionSummary;
  href: string;
  isActive?: boolean;
  sequenceNumber: number;
  showCommonMatches?: boolean;
}) {
  return (
      <SubmissionRowInteractive
        href={href}
        isActive={!!isActive}
        submissionId={submission.id}
      >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-6 min-w-[2.5rem] shrink-0 items-center justify-center rounded-md bg-zinc-100 px-2 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            #{sequenceNumber}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {submission.displayTitle}
            </p>
            {submission.displaySubtitle && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                {submission.displaySubtitle}
              </p>
            )}
          </div>
        </div>
        <p className="text-[0.625rem] text-zinc-400 dark:text-zinc-500 whitespace-nowrap pt-1">
          {formatTimestamp(submission.createdAt)}
        </p>
      </div>

      {submission.teamName && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <SummaryItem label="Team" value={submission.teamName} />
        </div>
      )}

      {showCommonMatches && submission.commonMatches && submission.commonMatches.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {submission.commonMatches.map((match) => (
            <span
              key={`${submission.id}-${match.formId}-${match.submissionId}`}
              className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[0.6875rem] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {match.formTitle ?? "Form"}
            </span>
          ))}
        </div>
      ) : null}
    </SubmissionRowInteractive>
  );
}

export default function AdminRegistrationSubmissionsPanel({
  forms,
  formsWithFields,
  form,
  submissionPage,
  selectedSubmission,
  from,
  to,
  pageSize,
  searchField,
  searchQuery,
  mode = "single",
  commonFormSlugs = [],
  commonFieldKey = "",
}: {
  forms: FormDefinition[];
  formsWithFields: FormWithFields[];
  form: FormWithFields | null;
  submissionPage: SubmissionPage;
  selectedSubmission: SubmissionDetail | null;
  from?: string | null;
  to?: string | null;
  pageSize?: number | "all" | null;
  searchField?: string | null;
  searchQuery?: string | null;
  mode?: "single" | "common";
  commonFormSlugs?: string[];
  commonFieldKey?: string;
}) {
  const router = useRouter();
  const isCommonMode = mode === "common";
  const normalizedCommonFormSlugs = useMemo(
    () => normalizeCommonFormSlugs(commonFormSlugs),
    [commonFormSlugs],
  );
  const normalizedCommonFieldKey = useMemo(
    () => normalizeCommonFieldKey(commonFieldKey),
    [commonFieldKey],
  );
  const selectedCommonSlugSet = useMemo(
    () => new Set(normalizedCommonFormSlugs),
    [normalizedCommonFormSlugs],
  );
  const selectedCommonForms = useMemo(
    () => formsWithFields.filter((candidate) => selectedCommonSlugSet.has(candidate.slug)),
    [formsWithFields, selectedCommonSlugSet],
  );
  const selectedCommonFieldOptions = useMemo(
    () => listCommonUserFieldOptions(selectedCommonForms),
    [selectedCommonForms],
  );
  const selectedCommonField =
    selectedCommonFieldOptions.find((option) => option.value === normalizedCommonFieldKey) ?? null;
  const [showCommonFormFilter, setShowCommonFormFilter] = useState(isCommonMode);
  const [pendingCommonFormSlugs, setPendingCommonFormSlugs] = useState<string[]>(
    normalizedCommonFormSlugs.length > 0
      ? normalizedCommonFormSlugs
      : form?.slug
      ? [form.slug]
      : [],
  );
  const [pendingCommonFieldKey, setPendingCommonFieldKey] = useState<string>(
    normalizedCommonFieldKey,
  );
  const pendingSelectedForms = useMemo(() => {
    const pendingSlugSet = new Set(pendingCommonFormSlugs);
    return formsWithFields.filter((candidate) => pendingSlugSet.has(candidate.slug));
  }, [formsWithFields, pendingCommonFormSlugs]);
  const pendingCommonFieldOptions = useMemo(
    () => listCommonUserFieldOptions(pendingSelectedForms),
    [pendingSelectedForms],
  );

  useEffect(() => {
    setShowCommonFormFilter(isCommonMode);
  }, [isCommonMode]);

  useEffect(() => {
    setPendingCommonFormSlugs(
      normalizedCommonFormSlugs.length > 0
        ? normalizedCommonFormSlugs
        : form?.slug
        ? [form.slug]
        : [],
    );
  }, [form?.slug, normalizedCommonFormSlugs]);

  useEffect(() => {
    setPendingCommonFieldKey(normalizedCommonFieldKey);
  }, [normalizedCommonFieldKey]);

  useEffect(() => {
    if (pendingCommonFieldOptions.length === 0) {
      if (pendingCommonFieldKey) {
        setPendingCommonFieldKey("");
      }
      return;
    }

    if (
      !pendingCommonFieldOptions.some(
        (option) => option.value === pendingCommonFieldKey,
      )
    ) {
      setPendingCommonFieldKey(pendingCommonFieldOptions[0].value);
    }
  }, [pendingCommonFieldKey, pendingCommonFieldOptions]);

  const currentModeRouteConfig = useMemo<{
    slug: string | null;
    mode: "single" | "common";
    commonFormSlugs: string[] | null;
    commonFieldKey: string | null;
    searchField: string | null | undefined;
  }>(
    () => ({
      slug: isCommonMode ? null : form?.slug ?? null,
      mode: isCommonMode ? "common" : "single",
      commonFormSlugs: isCommonMode ? normalizedCommonFormSlugs : null,
      commonFieldKey: isCommonMode ? normalizedCommonFieldKey : null,
      searchField: isCommonMode ? null : searchField,
    }),
    [
      form?.slug,
      isCommonMode,
      normalizedCommonFieldKey,
      normalizedCommonFormSlugs,
      searchField,
    ],
  );

  const buildCurrentModeHref = ({
    page,
    submissionId,
    nextFrom = from,
    nextTo = to,
    nextPageSize = pageSize,
    nextSearchField = searchField,
    nextSearchQuery = searchQuery,
  }: {
    page?: number;
    submissionId?: string | null;
    nextFrom?: string | null;
    nextTo?: string | null;
    nextPageSize?: number | "all" | null;
    nextSearchField?: string | null;
    nextSearchQuery?: string | null;
  }) =>
    buildPageHref({
      ...currentModeRouteConfig,
      page,
      from: nextFrom,
      to: nextTo,
      submissionId,
      pageSize: nextPageSize,
      searchField: isCommonMode ? null : nextSearchField,
      searchQuery: nextSearchQuery,
    });

  // Load preferred page size on mount if omitted
  useEffect(() => {
    if (!pageSize) {
      const stored = localStorage.getItem("mazex_admin_page_size");
      if (stored) {
        const parsed = stored === "all" ? "all" : parseInt(stored, 10);
        if (parsed === "all" || (Number.isInteger(parsed) && parsed > 0)) {
          const href = buildPageHref({
            ...currentModeRouteConfig,
            page: 1,
            from,
            to,
            pageSize: parsed,
            searchQuery,
          });
          router.replace(href, { scroll: false });
        }
      }
    }
  }, [currentModeRouteConfig, from, pageSize, router, searchQuery, to]);

  const totalPages =
    submissionPage.pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(submissionPage.total / (submissionPage.pageSize as number)));
  const exportParams = new URLSearchParams();

  if (form?.slug) {
    exportParams.set("form", form.slug);
  }

  if (from) {
    exportParams.set("from", from);
  }

  if (to) {
    exportParams.set("to", to);
  }

  const formSelectorItems = [
    ...forms.map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      href: buildPageHref({
        slug: candidate.slug,
        page: 1,
        from,
        to,
        pageSize,
        searchField,
        searchQuery,
      }),
      status: candidate.status,
      kind: candidate.kind,
    })),
    {
      id: FORM_FILTER_ITEM_ID,
      title:
        selectedCommonForms.length > 0
          ? `Form filter (${selectedCommonForms.length})`
          : "Form filter",
      onSelect: () => {
        setShowCommonFormFilter(true);
        setPendingCommonFormSlugs((current) =>
          current.length > 0 ? current : form?.slug ? [form.slug] : [],
        );
      },
      status: "filter",
      kind: "multi-form",
    },
  ];

  const selectedSelectorId = showCommonFormFilter ? FORM_FILTER_ITEM_ID : form?.id;
  const title = isCommonMode
    ? "Common Registrations"
    : `${form?.title ?? "Registration"} Submissions`;
  const description = isCommonMode
    ? "Showing registrants that are common to every selected form."
    : "Filter by date range, inspect individual submissions, and export the current form’s data.";
  const dateLabelTarget = isCommonMode
    ? "common registrations"
    : `${form?.title ?? "registration"} submissions`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      <OptimisticSubmissionDrawer
        forms={formsWithFields}
        mode={mode}
        formSlug={form?.slug ?? null}
        commonFormSlugs={normalizedCommonFormSlugs}
        commonFieldKey={normalizedCommonFieldKey}
        submissions={submissionPage.submissions}
        selectedSubmission={selectedSubmission}
      />
      <FormSelectorDropdown
        items={formSelectorItems}
        selectedId={selectedSelectorId}
        afterSelector={
          showCommonFormFilter ? (
            <CommonFormFilterDropdown
              forms={formsWithFields}
              selectedSlugs={pendingCommonFormSlugs}
              selectedFieldKey={pendingCommonFieldKey}
              onToggleSlug={(slug) => {
                setPendingCommonFormSlugs((current) =>
                  current.includes(slug)
                    ? current.filter((value) => value !== slug)
                    : [...current, slug],
                );
              }}
              onFieldKeyChange={setPendingCommonFieldKey}
              onApply={() => {
                const nextCommonFormSlugs = normalizeCommonFormSlugs(pendingCommonFormSlugs);
                const href = buildPageHref({
                  mode: "common",
                  commonFormSlugs: nextCommonFormSlugs,
                  commonFieldKey: pendingCommonFieldKey,
                  page: 1,
                  from,
                  to,
                  pageSize,
                  searchField: null,
                  searchQuery,
                });
                router.push(href, { scroll: false });
              }}
              disabled={
                pendingCommonFormSlugs.length === 0 || !normalizeCommonFieldKey(pendingCommonFieldKey)
              }
            />
          ) : null
        }
      />

       <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 md:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
         <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800/80">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
            {isCommonMode && selectedCommonForms.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCommonForms.map((selectedForm) => (
                  <span
                    key={selectedForm.id}
                    className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[0.6875rem] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                  >
                    {selectedForm.title}
                  </span>
                ))}
                {selectedCommonField ? (
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[0.6875rem] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    Match by {selectedCommonField.label}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {!isCommonMode && form ? (
            <a
              href={`/admin/registrations/export?${exportParams.toString()}`}
              title="Download CSV"
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-300 transition-colors"
            >
              Export CSV
            </a>
          ) : null}
        </div>

        <form 
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const f = formData.get("from") as string;
            const t = formData.get("to") as string;
            const ps = formData.get("pageSize") as string;
            const sf = formData.get("searchField") as string;
            const sq = formData.get("searchQuery") as string;
            
            if (ps) {
              localStorage.setItem("mazex_admin_page_size", ps);
            }
            
            const href = buildPageHref({
              slug: isCommonMode ? null : form?.slug,
              mode: isCommonMode ? "common" : "single",
              commonFormSlugs: isCommonMode ? normalizedCommonFormSlugs : null,
              commonFieldKey: isCommonMode ? normalizedCommonFieldKey : null,
              page: 1,
              from: f || null,
              to: t || null,
              pageSize: ps === "all" ? "all" : (ps ? parseInt(ps, 10) : null),
              searchField: isCommonMode ? null : sf || null,
              searchQuery: sq || null,
            });
            router.push(href, { scroll: false });
          }}
        >
          {isCommonMode ? <input type="hidden" name="searchField" value="" /> : null}
          
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {!isCommonMode && form ? (
              <div className="flex-1 space-y-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Search field
                </label>
                <select
                  name="searchField"
                  defaultValue={searchField ?? ""}
                  className="block h-10 w-full rounded-md border border-zinc-300 bg-white pl-3 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                  style={{ paddingRight: "2.5rem" }}
                >
                  <option value="">All fields</option>
                  <option value="teamName">Team Name</option>
                  {form.fields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className={`${isCommonMode ? "flex-1" : "flex-[2]"} space-y-1`}>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Search query
              </label>
              <input
                type="search"
                name="searchQuery"
                placeholder={
                  isCommonMode ? "Search across selected forms..." : "Search..."
                }
                defaultValue={searchQuery ?? ""}
                className="block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Search
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
             <div className="w-full md:w-48 space-y-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                From date
              </label>
              <FormattedPickerInput
                key={`from:${from ?? ""}`}
                name="from"
                mode="date"
                defaultValue={from}
                placeholder="yyyy/mm/dd"
                inputMode="numeric"
                ariaLabel={`Select the start date for ${dateLabelTarget}`}
                className="block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </div>

             <div className="w-full md:w-48 space-y-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                To date
              </label>
              <FormattedPickerInput
                key={`to:${to ?? ""}`}
                name="to"
                mode="date"
                defaultValue={to}
                placeholder="yyyy/mm/dd"
                inputMode="numeric"
                ariaLabel={`Select the end date for ${dateLabelTarget}`}
               className="block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              />
            </div>
            
             <div className="w-full md:w-32 space-y-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Per page
              </label>
              <select
                name="pageSize"
                defaultValue={pageSize === "all" ? "all" : (pageSize?.toString() ?? "15")}
               className="block h-10 w-full rounded-md border border-zinc-300 bg-white pl-3 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
               style={{ paddingRight: "2.5rem" }}
              >
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                 className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-zinc-300 transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8">
            <div className="space-y-3">
            {submissionPage.submissions.length > 0 ? (
                submissionPage.submissions.map((submission, index) => {
                  const currentOffset = submissionPage.pageSize === "all" ? 0 : (submissionPage.page - 1) * submissionPage.pageSize;
                  const sequenceNumber = submissionPage.total - currentOffset - index;
                  return (
                    <SubmissionRow
                        key={submission.id}
                        submission={submission}
                        href={buildCurrentModeHref({
                          page: submissionPage.page,
                          submissionId: submission.id,
                        })}
                        isActive={selectedSubmission?.id === submission.id}
                        sequenceNumber={sequenceNumber}
                        showCommonMatches={isCommonMode}
                    />
                  );
                })
            ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {isCommonMode ? "No common registrations found" : "No submissions found"}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {isCommonMode
                      ? "Select different forms or wait for overlapping registrants to submit."
                      : "Once users submit this form, they will appear here."}
                </p>
                </div>
            )}
            
            {submissionPage.total > (submissionPage.pageSize === "all" ? submissionPage.total + 1 : (submissionPage.pageSize as number)) ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Page {submissionPage.page} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <Link
                    href={buildCurrentModeHref({
                      page: Math.max(1, submissionPage.page - 1),
                    })}
                    className={`inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 ${
                      submissionPage.page <= 1 ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Prev
                  </Link>
                  <Link
                    href={buildCurrentModeHref({
                      page: Math.min(totalPages, submissionPage.page + 1),
                    })}
                    className={`inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 ${
                      submissionPage.page >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }`}
                  >
                    Next
                  </Link>
                </div>
              </div>
            ) : null}

            </div>


        </div>
      </div>
    </div>
  );
}
