"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Minus,
  Trophy,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RegistrationOverviewAnalytics } from "@/lib/registration-types";

type AnalyticsChartsProps = {
  analytics: RegistrationOverviewAnalytics;
};

type InsightTone = "positive" | "negative" | "neutral";

const CHART_COLORS = {
  total: "#8b5cf6",
  competition: "#38bdf8",
  workshop: "#f59e0b",
  muted: "#a1a1aa",
  grid: "rgba(113, 113, 122, 0.18)",
  tooltipBorder: "rgba(63, 63, 70, 0.3)",
  tooltipBackground: "rgba(9, 9, 11, 0.94)",
};

const TREND_SERIES_LABELS: Record<string, string> = {
  competitions: "Competition",
  workshops: "Workshop",
  total: "Total",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function truncateLabel(value: string, maxLength = 18) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function getWeeklyDelta(current: number, previous: number) {
  const delta = current - previous;

  if (delta > 0) {
    if (previous === 0) {
      return {
        icon: ArrowUpRight,
        tone: "positive" as const,
        detail: `${formatNumber(delta)} more than the previous 7-day window`,
      };
    }

    const percent = Math.round((delta / previous) * 100);
    return {
      icon: ArrowUpRight,
      tone: "positive" as const,
      detail: `Up ${percent}% versus the previous 7 days`,
    };
  }

  if (delta < 0) {
    const percent = previous > 0 ? Math.round((Math.abs(delta) / previous) * 100) : 0;
    return {
      icon: ArrowDownRight,
      tone: "negative" as const,
      detail: previous > 0
        ? `Down ${percent}% versus the previous 7 days`
        : "Fewer submissions than the previous 7-day window",
    };
  }

  return {
    icon: Minus,
    tone: "neutral" as const,
    detail: "Flat compared with the previous 7-day window",
  };
}

function getToneClasses(tone: InsightTone) {
  if (tone === "positive") {
    return "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10";
  }

  if (tone === "negative") {
    return "text-rose-600 dark:text-rose-300 bg-rose-500/10";
  }

  return "text-zinc-600 dark:text-zinc-300 bg-zinc-500/10";
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-zinc-200 dark:border-zinc-800",
        "bg-white dark:bg-zinc-900 px-3 py-5 sm:p-6 md:p-8 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="max-w-2xl">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: InsightTone;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-4 sm:p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
        </div>
        <div
          className={`inline-flex rounded-lg p-2 ${getToneClasses(tone)}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {detail}
      </p>
    </div>
  );
}

function ChartEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-950/80 p-4 sm:px-6 text-center">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </p>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

export default function AdminRegistrationAnalyticsCharts({
  analytics,
}: AnalyticsChartsProps) {
  const weeklyDelta = getWeeklyDelta(
    analytics.summary.last7DaysSubmissions,
    analytics.summary.previous7DaysSubmissions,
  );
  const totalSubmissions = analytics.formBreakdown.reduce(
    (sum, item) => sum + item.submissions,
    0,
  );
  const hasTrendData = analytics.trend.some((point) => point.total > 0);
  const hasFormBreakdown = analytics.formBreakdown.some((point) => point.submissions > 0);
  const hasKindBreakdown = analytics.kindBreakdown.some((point) => point.value > 0);
  const hasWeekdayBreakdown = analytics.weekdayBreakdown.some(
    (point) => point.submissions > 0,
  );
  const busiestWeekdayCount = Math.max(
    ...analytics.weekdayBreakdown.map((point) => point.submissions),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <InsightCard
          icon={weeklyDelta.icon}
          label="Last 7 Days"
          value={formatNumber(analytics.summary.last7DaysSubmissions)}
          detail={weeklyDelta.detail}
          tone={weeklyDelta.tone}
        />
        <InsightCard
          icon={BarChart3}
          label="Average Per Form"
          value={formatNumber(analytics.summary.averageSubmissionsPerForm)}
          detail={
            analytics.formBreakdown.length > 0
              ? `Across ${formatNumber(analytics.formBreakdown.length)} registration forms`
              : "Create a form to start building an average"
          }
        />
        <InsightCard
          icon={Trophy}
          label="Top Form"
          value={analytics.summary.topFormTitle ?? "No leader yet"}
          detail={
            analytics.summary.topFormTitle
              ? `${formatNumber(analytics.summary.topFormCount)} submissions so far`
              : "New submissions will surface the strongest form"
          }
        />
        <InsightCard
          icon={CalendarRange}
          label="Peak Day"
          value={analytics.summary.peakDayLabel ?? "No peak yet"}
          detail={
            analytics.summary.peakDayLabel
              ? `${formatNumber(analytics.summary.peakDayCount)} registrations on the busiest day`
              : "The 14-day trend chart will fill this in once registrations land"
          }
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.5fr_0.95fr]">
        <ChartCard
          title="Submission Trend"
          description="A 14-day view of registration activity, split by competitions and workshops so momentum changes are easy to spot."
        >
          {hasTrendData ? (
            <div className="h-[21.25rem]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.trend}>
                  <defs>
                    <linearGradient id="competitionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.competition} stopOpacity={0.42} />
                      <stop offset="95%" stopColor={CHART_COLORS.competition} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="workshopFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.workshop} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_COLORS.workshop} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="label"
                    minTickGap={16}
                    tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: CHART_COLORS.total, strokeOpacity: 0.25, strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: CHART_COLORS.tooltipBorder,
                      backgroundColor: CHART_COLORS.tooltipBackground,
                    }}
                    labelStyle={{ color: "#fafafa", fontWeight: 600 }}
                    itemStyle={{ color: "#e4e4e7" }}
                    formatter={(value, name) => [
                      formatNumber(Number(value)),
                      TREND_SERIES_LABELS[String(name)] ?? String(name),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ color: CHART_COLORS.muted, paddingTop: 16 }}
                    formatter={(value) =>
                      TREND_SERIES_LABELS[String(value)] ?? String(value)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="competitions"
                    stackId="submissions"
                    stroke={CHART_COLORS.competition}
                    fill="url(#competitionFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="workshops"
                    stackId="submissions"
                    stroke={CHART_COLORS.workshop}
                    fill="url(#workshopFill)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={CHART_COLORS.total}
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmptyState
              title="No trend data yet"
              description="As soon as registrations start coming in, this chart will show how daily submission volume moves over time."
            />
          )}
        </ChartCard>

        <div className="grid gap-6">
          <ChartCard
            title="Kind Split"
            description="A quick ratio of competition versus workshop demand."
          >
            {hasKindBreakdown ? (
              <>
                <div className="h-[14.375rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          borderColor: CHART_COLORS.tooltipBorder,
                          backgroundColor: CHART_COLORS.tooltipBackground,
                        }}
                        labelStyle={{ color: "#fafafa", fontWeight: 600 }}
                        itemStyle={{ color: "#e4e4e7" }}
                        formatter={(value, name) => [
                          formatNumber(Number(value)),
                          String(name),
                        ]}
                      />
                      <Pie
                        data={analytics.kindBreakdown}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={4}
                        stroke="rgba(24, 24, 27, 0.08)"
                      >
                        {analytics.kindBreakdown.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={
                              entry.key === "competition"
                                ? CHART_COLORS.competition
                                : CHART_COLORS.workshop
                            }
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {analytics.kindBreakdown.map((entry) => {
                    const percentage = totalSubmissions > 0
                      ? Math.round((entry.value / totalSubmissions) * 100)
                      : 0;

                    return (
                      <div
                        key={entry.key}
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                entry.key === "competition"
                                  ? CHART_COLORS.competition
                                  : CHART_COLORS.workshop,
                            }}
                          />
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {entry.label}
                          </p>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                          {formatNumber(entry.value)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {percentage}% of total submissions
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <ChartEmptyState
                title="No split to compare yet"
                description="Once registrations arrive, this chart will show whether competitions or workshops are drawing more attention."
              />
            )}
          </ChartCard>

          <ChartCard
            title="Weekly Rhythm"
            description="Which days of the week tend to capture the most registrations."
          >
            {hasWeekdayBreakdown ? (
              <>
                <div className="h-[14.375rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.weekdayBreakdown}>
                      <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                      <XAxis
                        dataKey="weekday"
                        tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          borderColor: CHART_COLORS.tooltipBorder,
                          backgroundColor: CHART_COLORS.tooltipBackground,
                        }}
                        labelStyle={{ color: "#fafafa", fontWeight: 600 }}
                        itemStyle={{ color: "#e4e4e7" }}
                        formatter={(value) => [formatNumber(Number(value)), "Submissions"]}
                      />
                      <Bar dataKey="submissions" radius={[10, 10, 0, 0]}>
                        {analytics.weekdayBreakdown.map((entry) => (
                          <Cell
                            key={entry.weekday}
                            fill={
                              entry.submissions === busiestWeekdayCount &&
                              busiestWeekdayCount > 0
                                ? CHART_COLORS.total
                                : CHART_COLORS.competition
                            }
                            fillOpacity={
                              entry.submissions === busiestWeekdayCount &&
                              busiestWeekdayCount > 0
                                ? 1
                                : 0.65
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-500" />
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Busiest weekday
                    </p>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {analytics.summary.busiestWeekday ?? "No pattern yet"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {analytics.summary.busiestWeekday
                      ? `${formatNumber(analytics.summary.busiestWeekdayCount)} registrations landed on that weekday`
                      : "The first batch of registrations will establish the weekly rhythm"}
                  </p>
                </div>
              </>
            ) : (
              <ChartEmptyState
                title="No weekday pattern yet"
                description="Once registrations arrive, this view will reveal which days tend to pull the most activity."
              />
            )}
          </ChartCard>
        </div>
      </div>

      <ChartCard
        title="Submissions By Form"
        description="A leaderboard view of which registration forms are attracting the most signups. Closed and upcoming forms appear slightly softer so active demand stands out."
      >
        {hasFormBreakdown ? (
          <div
            className="w-full"
            style={{
              height: `${(Math.max(260, analytics.formBreakdown.length * 58)) / 16}rem`,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.formBreakdown}
                layout="vertical"
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={180}
                  tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => truncateLabel(String(value), 24)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    borderColor: CHART_COLORS.tooltipBorder,
                    backgroundColor: CHART_COLORS.tooltipBackground,
                  }}
                  labelStyle={{ color: "#fafafa", fontWeight: 600 }}
                  itemStyle={{ color: "#e4e4e7" }}
                  formatter={(value) => [formatNumber(Number(value)), "Submissions"]}
                />
                <Bar dataKey="submissions" radius={[0, 10, 10, 0]}>
                  {analytics.formBreakdown.map((entry) => (
                    <Cell
                      key={entry.formId}
                      fill={
                        entry.kind === "competition"
                          ? CHART_COLORS.competition
                          : CHART_COLORS.workshop
                      }
                      fillOpacity={
                        entry.availabilityState === "open"
                          ? 1
                          : entry.availabilityState === "upcoming"
                            ? 0.78
                            : 0.55
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmptyState
            title="No submissions ranked yet"
            description="As soon as entries begin arriving, this chart will rank your forms from highest to lowest demand."
          />
        )}
      </ChartCard>
    </div>
  );
}
