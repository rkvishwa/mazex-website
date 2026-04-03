import { Loader2 } from "lucide-react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${
        className ?? ""
      }`}
    />
  );
}

export function GenericCardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-0">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 md:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-8 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
          <Skeleton className="h-4 w-5/6 max-w-lg rounded-md" />
        </div>
        <div className="mt-8 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function TwoColumnSkeleton() {
  return (
    <div className="flex h-[calc(100vh-6rem)] w-full gap-4 lg:h-[calc(100vh-8rem)] lg:gap-6">
      {/* Sidebar Skeleton */}
      <div className="hidden w-72 flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm xl:flex dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 sm:px-6 dark:border-zinc-800">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 p-4 sm:p-6 space-y-6 flex flex-col items-center justify-center">
           <Loader2 className="h-8 w-8 animate-spin text-zinc-300 dark:text-zinc-700" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-10">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-5 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-4">
             <Skeleton className="h-6 w-32" />
             <Skeleton className="h-8 w-64" />
             <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-3">
             <Skeleton className="h-10 w-36" />
             <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      <Skeleton className="h-[25rem] w-full rounded-xl" />

      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
         <Skeleton className="h-[31.25rem] w-full rounded-xl" />
         <Skeleton className="h-[31.25rem] w-full rounded-xl" />
      </div>
    </div>
  );
}
