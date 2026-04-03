import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  ExternalLink,
  LayoutTemplate,
  Trophy,
} from "lucide-react";
import { formatDateTimeDisplay } from "@/lib/date-format";
import { getRegistrationOverview } from "@/lib/registrations";
import AdminRegistrationAnalyticsCharts from "./AdminRegistrationAnalyticsCharts";

function formatTimestamp(value: string) {
  return formatDateTimeDisplay(value);
}

export default async function AdminRegistrationsOverview() {
  const overview = await getRegistrationOverview();
  const rankedForms = [...overview.forms].sort(
    (a, b) => b.submissionCount - a.submissionCount || a.form.title.localeCompare(b.form.title),
  );
  const maxSubmissionCount = Math.max(
    ...rankedForms.map((item) => item.submissionCount),
    1,
  );
  const openFormsCount = overview.forms.filter(
    (item) => item.availability.isAcceptingSubmissions,
  ).length;
  const topForm = rankedForms[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-5 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 tracking-wide uppercase">
              Registration Analytics
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              MaxeX 1.0
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Powered by Knurdz
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/form-builder"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm"
            >
              <LayoutTemplate className="h-4 w-4" />
              Open form builder
            </Link>
            <Link
              href="/admin/registrations"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 shadow-sm"
            >
              <ClipboardList className="h-4 w-4" />
              Open registrations
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total submissions" value={String(overview.totalSubmissions)} />
          <MetricCard
            label="Open forms"
            value={String(
              overview.forms.filter((item) => item.availability.isAcceptingSubmissions)
                .length,
            )}
          />
          <MetricCard
            label="Competition forms"
            value={String(
              overview.forms.filter((item) => item.form.kind === "competition").length,
            )}
          />
          <MetricCard
            label="Workshop forms"
            value={String(
              overview.forms.filter((item) => item.form.kind === "workshop").length,
            )}
          />
        </div>
      </div>

      <AdminRegistrationAnalyticsCharts analytics={overview.analytics} />

      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-5 sm:p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Forms
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                A ranked view of every registration form, with live status and
                relative submission momentum.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <SummaryPill
                icon={BarChart3}
                label="Open now"
                value={String(openFormsCount)}
              />
              <SummaryPill
                icon={Trophy}
                label="Top form"
                value={topForm ? `${topForm.submissionCount}` : "0"}
              />
            </div>
          </div>

          {rankedForms.length > 0 ? (
            <div className="mt-6 space-y-4">
              {rankedForms.map((item, index) => {
                const share = overview.totalSubmissions > 0
                  ? Math.round((item.submissionCount / overview.totalSubmissions) * 100)
                  : 0;
                const progressWidth = Math.max(
                  6,
                  Math.round((item.submissionCount / maxSubmissionCount) * 100),
                );

                return (
                  <Link
                    key={item.form.id}
                    href={`/admin/form-builder?form=${item.form.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 p-4 sm:p-5 transition-all hover:border-zinc-300 hover:shadow-sm dark:hover:border-zinc-700"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-700 dark:text-zinc-200 shadow-sm">
                            #{index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={getKindBadgeClasses(item.form.kind)}>
                                {formatFormKindLabel(item.form.kind)}
                              </span>
                              <span className={getAvailabilityBadgeClasses(item.availability.state)}>
                                {item.availability.label}
                              </span>
                            </div>

                            <div className="mt-3 flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                                  {item.form.title}
                                </p>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                  {item.availability.description ??
                                    "No timing note configured for this form yet."}
                                </p>
                              </div>
                              <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            <span>Submission momentum</span>
                            <span>{share}% of all submissions</span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <div
                              className={getProgressBarClasses(item.form.kind)}
                              style={{ width: `${progressWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:min-w-48 lg:grid-cols-1">
                        <FeatureStat
                          label="Submissions"
                          value={String(item.submissionCount)}
                        />
                        <FeatureStat
                          label="Relative rank"
                          value={`#${index + 1}`}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                No forms created yet
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Create a registration form and it will appear here with live analytics.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-5 sm:p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Recent submissions
          </h3>

          {overview.recentSubmissions.length > 0 ? (
            <div className="mt-6 space-y-3">
              {overview.recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/admin/registrations?form=${submission.formSlug ?? ""}&submission=${submission.id}`}
                  className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-1">
                    {submission.displayTitle}
                  </p>
                  {submission.displaySubtitle && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {submission.displaySubtitle}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[0.625rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 line-clamp-1 mr-2">
                      {submission.formTitle ?? "Registration"}
                    </p>
                    <p className="text-[0.625rem] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                      {formatTimestamp(submission.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                No submissions yet
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                They will appear here once received.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 px-3.5 py-2.5">
      <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-2 text-zinc-600 dark:text-zinc-300">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[0.625rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
      </div>
    </div>
  );
}

function FeatureStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-3 shadow-sm">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50 truncate">
        {value}
      </p>
    </div>
  );
}

function formatFormKindLabel(kind: string) {
  return kind === "competition" ? "Competition" : "Workshop";
}

function getKindBadgeClasses(kind: string) {
  if (kind === "competition") {
    return "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }

  return "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
}

function getAvailabilityBadgeClasses(state: string) {
  if (state === "open") {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  if (state === "upcoming") {
    return "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }

  return "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function getProgressBarClasses(kind: string) {
  if (kind === "competition") {
    return "h-full rounded-full bg-zinc-700 dark:bg-zinc-300";
  }

  return "h-full rounded-full bg-zinc-500 dark:bg-zinc-500";
}
