"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Link2, ShieldAlert, X } from "lucide-react";
import {
  updateAdminResourcesAction,
  type UpdateAdminResourcesState,
} from "@/app/admin/resources/actions";

const initialUpdateAdminResourcesState: UpdateAdminResourcesState = {
  status: "idle",
  message: null,
  toastKey: 0,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 flex w-full justify-center rounded-md border border-transparent bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-300 dark:focus:ring-offset-zinc-900"
    >
      {pending ? "Saving..." : "Save resource"}
    </button>
  );
}

export default function AdminResourcesForm({
  delegateBooklet,
}: {
  delegateBooklet: string;
}) {
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);
  const [state, formAction] = useActionState(
    updateAdminResourcesAction,
    initialUpdateAdminResourcesState,
  );

  const activeToastId =
    state.message && state.status !== "idle"
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

  const visibleToast =
    state.message &&
    state.status !== "idle" &&
    activeToastId !== dismissedToastId
      ? {
          id: activeToastId,
          message: state.message,
          status: state.status,
        }
      : null;
  const isSuccessToast = visibleToast?.status === "success";

  return (
    <>
      {visibleToast ? (
        <div
          className={`fixed left-4 right-4 top-4 z-50 mx-auto flex w-auto max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl sm:left-auto sm:right-6 ${
            isSuccessToast
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
              : "border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100"
          }`}
          role="status"
          aria-live="polite"
        >
          {isSuccessToast ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="flex-1 pr-2 leading-tight">{visibleToast.message}</p>
          <button
            type="button"
            onClick={() => setDismissedToastId(visibleToast.id)}
            aria-label="Close notification"
            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 md:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              Resources
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Update event resources
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Manage downloadable resources that appear on the public MazeX site.
              The delegate booklet link below powers the booklet button in the
              delegates section.
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                <svg fill="currentColor" className="h-5 w-5" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 335.08 335.079" xmlSpace="preserve">
                  <g>
                    <g>
                      <path d="M311.175,115.775c-1.355-10.186-1.546-27.73,7.915-33.621c0.169-0.108,0.295-0.264,0.443-0.398 c7.735-2.474,13.088-5.946,8.886-10.618l-114.102-34.38L29.56,62.445c0,0-21.157,3.024-19.267,35.894 c1.026,17.89,6.637,26.676,11.544,31l-15.161,4.569c-4.208,4.672,1.144,8.145,8.88,10.615c0.147,0.138,0.271,0.293,0.443,0.401 c9.455,5.896,9.273,23.438,7.913,33.626c-33.967,9.645-21.774,12.788-21.774,12.788l7.451,1.803 c-5.241,4.736-10.446,13.717-9.471,30.75c1.891,32.864,19.269,35.132,19.269,35.132l120.904,39.298l182.49-44.202 c0,0,12.197-3.148-21.779-12.794c-1.366-10.172-1.556-27.712,7.921-33.623c0.174-0.105,0.301-0.264,0.442-0.396 c7.736-2.474,13.084-5.943,8.881-10.615l-7.932-2.395c5.29-3.19,13.236-11.527,14.481-33.183 c0.859-14.896-3.027-23.62-7.525-28.756l15.678-3.794C332.949,128.569,345.146,125.421,311.175,115.775z M158.533,115.354 l30.688-6.307l103.708-21.312l15.451-3.178c-4.937,9.036-4.73,21.402-3.913,29.35c0.179,1.798,0.385,3.44,0.585,4.688 L288.14,122.8l-130.897,32.563L158.533,115.354z M26.71,147.337l15.449,3.178l99.597,20.474l8.701,1.782l0,0l0,0l26.093,5.363 l1.287,40.01L43.303,184.673l-13.263-3.296c0.195-1.25,0.401-2.89,0.588-4.693C31.44,168.742,31.651,156.373,26.71,147.337z M20.708,96.757c-0.187-8.743,1.371-15.066,4.52-18.28c2.004-2.052,4.369-2.479,5.991-2.479c0.857,0,1.474,0.119,1.516,0.119 l79.607,25.953l39.717,12.949l-1.303,40.289L39.334,124.07l-5.88-1.647c-0.216-0.061-0.509-0.103-0.735-0.113 C32.26,122.277,21.244,121.263,20.708,96.757z M140.579,280.866L23.28,247.98c-0.217-0.063-0.507-0.105-0.733-0.116 c-0.467-0.031-11.488-1.044-12.021-25.544c-0.19-8.754,1.376-15.071,4.519-18.288c2.009-2.052,4.375-2.479,5.994-2.479 c0.859,0,1.474,0.115,1.519,0.115c0,0,0.005,0,0,0l119.316,38.908L140.579,280.866z M294.284,239.459 c0.185,1.804,0.391,3.443,0.591,4.693l-147.812,36.771l1.292-40.01l31.601-6.497l4.667,1.129l17.492-5.685l80.631-16.569 l15.457-3.18C293.261,219.146,293.466,231.517,294.284,239.459z M302.426,185.084c-0.269,0.006-0.538,0.042-0.791,0.122 l-11.148,3.121l-106.148,29.764l-1.298-40.289l34.826-11.359l84.327-27.501c0.011-0.005,4.436-0.988,7.684,2.315 c3.144,3.214,4.704,9.537,4.52,18.28C313.848,184.035,302.827,185.053,302.426,185.084z"></path>
                    </g>
                  </g>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Delegate booklet
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Accepts an external PDF URL or a site path like
                  {" "}
                  <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    /downloads/Delegate_booklet_dummy.pdf
                  </code>
                  .
                </p>
              </div>
            </div>
          </div>

          <form action={formAction} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="delegateBooklet"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Delegate booklet URL
              </label>

              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Link2 className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <input
                  id="delegateBooklet"
                  name="delegateBooklet"
                  type="text"
                  defaultValue={delegateBooklet}
                  placeholder="https://example.com/delegate-booklet.pdf"
                  className="block h-10 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                />
              </div>
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </>
  );
}
