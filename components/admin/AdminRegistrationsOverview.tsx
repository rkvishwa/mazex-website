import Link from "next/link";
import { ClipboardList, ExternalLink, LayoutTemplate } from "lucide-react";
import { formatDateTimeDisplay } from "@/lib/date-format";
import { getRegistrationOverview } from "@/lib/registrations";

function formatTimestamp(value: string) {
  return formatDateTimeDisplay(value);
}

export default async function AdminRegistrationsOverview() {
  const overview = await getRegistrationOverview();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 tracking-wide uppercase">
              Registration Analytics
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dynamic registration overview
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Track submission volume across the forms, open the form builder
              to manage schemas, and review registrations on a separate submissions
              page.
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

        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Forms
          </h3>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {overview.forms.map((item) => (
              <Link
                key={item.form.id}
                href={`/admin/form-builder?form=${item.form.slug}`}
                className="group block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-5 transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {item.form.kind}
                    </p>
                    <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.form.title}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                </div>

                <div className="mt-5 grid gap-3 grid-cols-2">
                  <MetricInline
                    label="Status"
                    value={item.availability.label}
                  />
                  <MetricInline
                    label="Submissions"
                    value={String(item.submissionCount)}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
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
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 line-clamp-1 mr-2">
                      {submission.formTitle ?? "Registration"}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
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
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function MetricInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
        {value}
      </p>
    </div>
  );
}
