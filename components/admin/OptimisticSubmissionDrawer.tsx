"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { FormWithFields, SubmissionDetail } from "@/lib/registration-types";
import { SubmissionDetailPanel, buildPageHref } from "./AdminRegistrationSubmissionsPanel";

// Global emitter to let Server Components with Client children trigger this
let dispatchOptimisticOpen: ((id: string | null) => void) | null = null;
export const openOptimisticDrawer = (id: string | null) => {
  if (dispatchOptimisticOpen) dispatchOptimisticOpen(id);
};

export function OptimisticSubmissionDrawer({
  forms,
  mode,
  formSlug,
  commonFormSlugs,
  submissions,
  selectedSubmission,
}: {
  forms: FormWithFields[];
  mode: "single" | "common";
  formSlug: string | null;
  commonFormSlugs: string[];
  submissions: SubmissionDetail[];
  selectedSubmission: SubmissionDetail | null;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const formById = new Map(forms.map((form) => [form.id, form] as const));

  useEffect(() => {
    dispatchOptimisticOpen = setLoadingId;
    return () => { dispatchOptimisticOpen = null; };
  }, []);

  const closeHref = buildPageHref({
    slug: mode === "common" ? null : formSlug,
    mode,
    commonFormSlugs,
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: searchParams.get("pageSize") === "all" ? "all" : (searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : null),
    searchField: mode === "common" ? null : searchParams.get("searchField"),
    searchQuery: searchParams.get("searchQuery"),
  });

  const handleClose = () => {
    setLoadingId(null);
    router.push(closeHref, { scroll: false });
  };

  if (typeof document === "undefined") return null;
  const portalRoot = document.getElementById("admin-drawer-portal");
  if (!portalRoot) return null;

  const isOpen = loadingId !== null || selectedSubmission !== null;
  const submissionToRender = 
    (loadingId ? submissions.find((s) => s.id === loadingId) : null) ?? 
    selectedSubmission;
  const form = submissionToRender ? formById.get(submissionToRender.formId) ?? null : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="optimistic-drawer-wrap" className="absolute inset-0 z-[55] pointer-events-none">
          {/* Backdrop */}
          <motion.div
            key="optimistic-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm dark:bg-zinc-900/60 pointer-events-auto"
            onClick={handleClose}
            aria-label="Cancel loading"
          />

          {/* Drawer Container */}
          <motion.div
            key="optimistic-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 w-full z-[60] bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-2xl shadow-[0_-1.25rem_2.5rem_-1.25rem_rgba(0,0,0,0.1)] flex flex-col h-[95vh] max-h-[95vh] overflow-hidden items-center pointer-events-auto"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              const target = e.target as HTMLElement;
              const link = target.closest("a");
              if (link && link.getAttribute("aria-label") === "Close") {
                e.preventDefault();
                handleClose();
              }
            }}
          >
            {submissionToRender ? (
              <div className="overflow-y-auto w-full text-left self-start">
                <SubmissionDetailPanel
                  form={form}
                  submission={submissionToRender}
                  onCloseHref={closeHref}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 animate-pulse">
                  Loading submission details...
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalRoot
  );
}
