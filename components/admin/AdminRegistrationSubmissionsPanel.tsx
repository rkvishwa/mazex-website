"use client";

import Link from "next/link";
import { useEffect } from "react";
import FormattedPickerInput from "@/components/FormattedPickerInput";
import { formatDateTimeDisplay, formatStoredDateForInput } from "@/lib/date-format";
import type {
  FormDefinition,
  FormWithFields,
  SubmissionDetail,
  SubmissionPage,
  SubmissionSummary,
} from "@/lib/registration-types";

import FormSelectorDropdown from "@/components/admin/FormSelectorDropdown";
import SubmissionDrawer from "@/components/admin/SubmissionDrawer";
import { OptimisticSubmissionDrawer } from "@/components/admin/OptimisticSubmissionDrawer";
import SubmissionRowInteractive from "@/components/admin/SubmissionRowInteractive";
import { useRouter } from "next/navigation";

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
}: {
  slug: string;
  page?: number;
  from?: string | null;
  to?: string | null;
  submissionId?: string | null;
  pageSize?: number | "all" | null;
  searchField?: string | null;
  searchQuery?: string | null;
}) {
  const params = new URLSearchParams();

  params.set("form", slug);

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (submissionId) params.set("submission", submissionId);
  if (pageSize && pageSize !== 15) params.set("pageSize", String(pageSize));
  if (searchField) params.set("searchField", searchField);
  if (searchQuery) params.set("searchQuery", searchQuery);

  return `/admin/registrations?${params.toString()}`;
}

export function SubmissionDetailPanel({
  form,
  submission,
  onCloseHref,
}: {
  form: FormWithFields;
  submission: SubmissionDetail;
  onCloseHref: string;
}) {
  const labelMap = new Map(form.fields.map((f) => [f.key, f.label] as const));
  const typeMap = new Map(form.fields.map((f) => [f.key, f.type] as const));

  return (
    <div className="w-full bg-white dark:bg-zinc-900">
      <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 bg-white/95 px-6 pb-6 pt-6 backdrop-blur-md sm:px-8 sm:pt-8 dark:border-zinc-800/80 dark:bg-zinc-900/95">
        <div>
           <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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

      <div className="p-6 sm:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {submission.displaySubtitle && <SummaryItem label="Contact" value={submission.displaySubtitle} />}
          {submission.teamName && <SummaryItem label="Team name" value={submission.teamName} />}
          <SummaryItem label="Form" value={submission.formTitle ?? form.title} />
        </div>

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

function SubmissionRow({
  form,
  submission,
  from,
  to,
  isActive,
  sequenceNumber,
}: {
  form: FormWithFields;
  submission: SubmissionSummary;
  from?: string | null;
  to?: string | null;
  isActive?: boolean;
  sequenceNumber: number;
}) {
  return (
      <SubmissionRowInteractive
        href={buildPageHref({
          slug: form.slug,
          from,
          to,
          submissionId: submission.id,
        })}
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
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap pt-1">
          {formatTimestamp(submission.createdAt)}
        </p>
      </div>

      {submission.teamName && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <SummaryItem label="Team" value={submission.teamName} />
        </div>
      )}
    </SubmissionRowInteractive>
  );
}

export default function AdminRegistrationSubmissionsPanel({
  forms,
  form,
  submissionPage,
  selectedSubmission,
  from,
  to,
  pageSize,
  searchField,
  searchQuery,
}: {
  forms: FormDefinition[];
  form: FormWithFields;
  submissionPage: SubmissionPage;
  selectedSubmission: SubmissionDetail | null;
  from?: string | null;
  to?: string | null;
  pageSize?: number | "all" | null;
  searchField?: string | null;
  searchQuery?: string | null;
}) {
  const router = useRouter();

  // Load preferred page size on mount if omitted
  useEffect(() => {
    if (!pageSize) {
      const stored = localStorage.getItem("mazex_admin_page_size");
      if (stored) {
        const parsed = stored === "all" ? "all" : parseInt(stored, 10);
        if (parsed === "all" || (Number.isInteger(parsed) && parsed > 0)) {
          const href = buildPageHref({
            slug: form.slug,
             page: 1,
            from,
            to,
            pageSize: parsed,
            searchField,
            searchQuery,
          });
          router.replace(href, { scroll: false });
        }
      }
    }
  }, [pageSize, router, form.slug, from, to, searchField, searchQuery]);

  const totalPages =
    submissionPage.pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(submissionPage.total / (submissionPage.pageSize as number)));
  const exportParams = new URLSearchParams();

  exportParams.set("form", form.slug);

  if (from) {
    exportParams.set("from", from);
  }

  if (to) {
    exportParams.set("to", to);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-0 pb-10">
      <OptimisticSubmissionDrawer form={form} submissions={submissionPage.submissions} />
      <FormSelectorDropdown
        items={forms.map((f) => ({
          id: f.id,
          title: f.title,
          href: buildPageHref({ slug: f.slug, from, to }),
          status: f.status,
          kind: f.kind,
        }))}
        selectedId={form.id}
      />

       <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
         <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800/80">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {form.title} Submissions
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Filter by date range, inspect individual submissions, and export the
              current form’s data.
            </p>
          </div>

          <a
            href={`/admin/registrations/export?${exportParams.toString()}`}
            title="Download CSV"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-300 transition-colors"
          >
            Export CSV
          </a>
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
              slug: form.slug,
              page: 1,
              from: f || null,
              to: t || null,
              pageSize: ps === "all" ? "all" : (ps ? parseInt(ps, 10) : null),
              searchField: sf || null,
              searchQuery: sq || null,
            });
            router.push(href);
          }}
        >
          <input type="hidden" name="form" value={form.slug} />
          
          <div className="flex flex-col md:flex-row md:items-end gap-4">
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
                {form.fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-[2] space-y-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Search query
              </label>
              <input
                type="search"
                name="searchQuery"
                placeholder="Search..."
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
                ariaLabel={`Select the start date for ${form.title} submissions`}
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
                ariaLabel={`Select the end date for ${form.title} submissions`}
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
                        form={form}
                        submission={submission}
                        from={from}
                        to={to}
                        isActive={selectedSubmission?.id === submission.id}
                        sequenceNumber={sequenceNumber}
                    />
                  );
                })
            ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    No submissions found
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Once users submit this form, they will appear here.
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
                    href={buildPageHref({
                      slug: form.slug,
                      page: Math.max(1, submissionPage.page - 1),
                      from,
                      to,
                      pageSize,
                      searchField,
                      searchQuery,
                    })}
                    className={`inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 ${
                      submissionPage.page <= 1 ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Prev
                  </Link>
                  <Link
                    href={buildPageHref({
                      slug: form.slug,
                      page: Math.min(totalPages, submissionPage.page + 1),
                      from,
                      to,
                      pageSize,
                      searchField,
                      searchQuery,
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

            {selectedSubmission && (
              <SubmissionDrawer onCloseHref={buildPageHref({ slug: form.slug, from, to, page: submissionPage.page, pageSize, searchField, searchQuery })}>
                <SubmissionDetailPanel 
                  form={form} 
                  submission={selectedSubmission} 
                  onCloseHref={buildPageHref({ slug: form.slug, from, to, page: submissionPage.page, pageSize, searchField, searchQuery })} 
                />
              </SubmissionDrawer>
            )}
        </div>
      </div>
    </div>
  );
}
