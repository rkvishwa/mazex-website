"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useFormStatus, createPortal } from "react-dom";
import Link from "next/link";
import FormattedPickerInput from "@/components/FormattedPickerInput";
import { parseDisplayDateInput } from "@/lib/date-format";
import type {
  FieldDefinition,
  FieldOption,
  FormAvailability,
  FormWithFields,
} from "@/lib/registration-types";
import {
  submitRegistrationAction,
  type SubmitRegistrationState,
} from "@/app/[slug]/actions";

const initialState: SubmitRegistrationState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  toastKey: 0,
};

// Helper function to detect and convert URLs to clickable links
function renderMessageWithLinks(message: string) {
  // Regular expression to match URLs (with or without protocol)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
  
  const parts = message.split(urlRegex);
  const matches = message.match(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (matches && matches.includes(part)) {
      // Ensure URL has protocol
      const href = part.startsWith('http') ? part : `https://${part}`;
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 break-all text-emerald-400 underline decoration-emerald-400/30 underline-offset-4 transition-all hover:text-emerald-300 hover:decoration-emerald-300/50 sm:break-normal"
        >
          <span className="break-all">{part}</span>
          <svg 
            className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
            />
          </svg>
        </a>
      );
    }
    return part;
  });
}

function fieldInputClass(hasError: boolean) {
  return `w-full rounded-xl bg-white/[0.03] px-4 py-3 text-[0.9375rem] text-zinc-100 outline-none transition-all placeholder:text-zinc-500 hover:bg-white/[0.04] focus:bg-white/[0.05] border border-white/5 ${
    hasError
      ? "border-rose-500/50 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
      : "focus:border-white/20 focus:ring-4 focus:ring-white/10"
  }`;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-white text-black px-8 py-3.5 text-[0.9375rem] font-medium tracking-wide transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Submitting…" : "Submit registration"}
    </button>
  );
}

function FieldHint({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[0.8125rem] font-medium text-rose-400">{error}</p>
    </div>
  );
}

function FieldDescription({ helpText }: { helpText?: string | null }) {
  if (!helpText) return null;
  return <p className="mb-2.5 text-[0.8125rem] leading-relaxed text-zinc-400">{helpText}</p>;
}

import { Check, ChevronDown, UploadCloud, File, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function ChoiceField({
  field,
  options,
  name,
  error,
  defaultValue,
}: {
  field: FieldDefinition;
  options: FieldOption[];
  name: string;
  error?: string;
  defaultValue?: string | string[];
}) {
  if (field.type === "select") {
    return (
      <div className="relative">
        <select 
          key={typeof defaultValue === "string" ? defaultValue : "select"}
          name={name} 
          id={name} 
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          className={`${fieldInputClass(Boolean(error))} appearance-none pr-10`}
        >
          <option value="" className="bg-[#09090b] text-zinc-500">
            {field.placeholder?.trim() || "Select an option..."}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#09090b] text-zinc-100">
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500">
          <ChevronDown className="h-4 w-4" />
        </div>
        <FieldHint error={error} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.03]">
        {options.map((o) => (
          <label
            key={o.value}
            className="group relative flex cursor-pointer items-start gap-3.5"
          >
            <div className="relative mt-[0.1875rem] h-4 w-4 shrink-0">
              <input
                type={field.type === "radio" ? "radio" : "checkbox"}
                name={name}
                value={o.value}
                defaultChecked={
                  field.type === "checkbox"
                    ? Array.isArray(defaultValue)
                      ? defaultValue.includes(o.value)
                      : defaultValue === o.value
                    : defaultValue === o.value
                }
                className="peer sr-only"
              />
              {field.type === "checkbox" ? (
                <div className="absolute inset-0 flex items-center justify-center rounded border border-white/20 bg-white/5 text-transparent transition-all peer-checked:border-white peer-checked:bg-white peer-checked:text-black group-hover:border-white/40">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full border border-white/20 transition-all peer-checked:border-white group-hover:border-white/40" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity peer-checked:opacity-100">
                    <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_0.3125rem_rgba(255,255,255,0.5)]" />
                  </div>
                </>
              )}
            </div>
            <span className="text-[0.9375rem] leading-snug text-zinc-300 transition-colors group-hover:text-white">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      <FieldHint error={error} />
    </>
  );
}

function ClientFileField({
  name,
  error,
  label,
  selectedFile,
  onFileChange,
  restoreKey,
}: {
  name: string;
  error?: string;
  label: React.ReactNode;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  restoreKey: number;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    if (!selectedFile) {
      if (input.value) input.value = "";
      return;
    }

    const existingFile = input.files?.[0];
    const isSynced =
      existingFile &&
      existingFile.name === selectedFile.name &&
      existingFile.size === selectedFile.size &&
      existingFile.lastModified === selectedFile.lastModified;

    if (isSynced) return;

    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(selectedFile);
      input.files = dataTransfer.files;
    } catch {
      // If the browser refuses programmatic file assignment, we still retain the file in client state.
    }
  }, [selectedFile, restoreKey]);

  return (
    <div>
      {label}
      <div
        className={`group relative mt-2 cursor-pointer overflow-hidden rounded-2xl border border-dashed bg-white/[0.01] px-6 py-8 text-center transition-all hover:bg-white/[0.02] focus-within:ring-4 focus-within:ring-white/10 ${
          error ? "border-rose-500/50" : "border-white/10 hover:border-white/20"
        }`}
      >
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] ?? null;
            onFileChange(selectedFile);
          }}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div className="pointer-events-none flex flex-col items-center justify-center">
          {selectedFile ? (
            <>
              {previewUrl ? (
                <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-xl border border-white/10 shadow-lg ring-1 ring-white/20 sm:h-32 sm:w-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={selectedFile.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                </div>
              ) : (
                <div className="mb-4 rounded-full bg-emerald-500/10 p-3.5 text-emerald-400 ring-1 ring-emerald-500/30 transition-transform group-hover:scale-105">
                  <File className="h-6 w-6" />
                </div>
              )}
              <p className="truncate px-4 text-[0.9375rem] font-medium text-slate-200">
                {selectedFile.name}
              </p>
              <p className="mt-1 text-[0.8125rem] text-emerald-500/80">
                File attached successfully
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 rounded-full bg-white/5 p-3.5 text-slate-400 ring-1 ring-white/10 transition-transform group-hover:scale-105 group-hover:bg-white/10 group-hover:text-white">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-[0.9375rem] font-medium text-slate-200">
                Click to attach or drag & drop
              </p>
              <p className="mt-1.5 text-[0.8125rem] text-slate-500">
                Supports common file formats up to 10MB
              </p>
            </>
          )}
        </div>
      </div>
      <FieldHint error={error} />
    </div>
  );
}

function RenderField({
  field,
  name,
  error,
  defaultValue,
  selectedFile,
  onFileChange,
  restoreKey,
}: {
  field: FieldDefinition;
  name: string;
  error?: string;
  defaultValue?: string | string[];
  selectedFile?: File | null;
  onFileChange?: (file: File | null) => void;
  restoreKey: number;
}) {
  const label = (
    <label
      htmlFor={field.type === "radio" ? undefined : name}
      className="mb-2 block text-[0.875rem] font-medium text-zinc-300"
    >
      {field.label}
      {field.required ? (
        <span className="ml-1 text-rose-400">*</span>
      ) : (
        <span className="ml-2 text-[0.75rem] font-normal text-zinc-500">
          Optional
        </span>
      )}
    </label>
  );

  if (field.type === "select" || field.type === "radio" || field.type === "checkbox") {
    return (
      <div>
        {label}
        <FieldDescription helpText={field.helpText} />
        <ChoiceField field={field} name={name} options={field.options} error={error} defaultValue={defaultValue} />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <FieldDescription helpText={field.helpText} />
        <textarea
          id={name}
          name={name}
          rows={4}
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          placeholder={field.placeholder ?? undefined}
          className={`${fieldInputClass(Boolean(error))} min-h-[6.25rem] resize-y scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20`}
        />
        <FieldHint error={error} />
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <ClientFileField
        name={name}
        error={error}
        selectedFile={selectedFile ?? null}
        onFileChange={onFileChange ?? (() => undefined)}
        restoreKey={restoreKey}
        label={
          <>
            {label}
            <FieldDescription helpText={field.helpText} />
          </>
        }
      />
    );
  }

  if (field.type === "date") {
    return (
      <div>
        {label}
        <FieldDescription helpText={field.helpText} />
        <FormattedPickerInput
          key={`${name}:${typeof defaultValue === "string" ? defaultValue : ""}`}
          id={name}
          name={name}
          mode="date"
          defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
          placeholder="yyyy/mm/dd"
          inputMode="numeric"
          required={field.required}
          pattern="\\d{4}/\\d{2}/\\d{2}"
          ariaLabel={`Select a date for ${field.label}`}
          className={fieldInputClass(Boolean(error))}
        />
        <FieldHint error={error} />
      </div>
    );
  }

  return (
    <div>
      {label}
      <FieldDescription helpText={field.helpText} />
      <input
        id={name}
        name={name}
        type={field.type}
        defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
        placeholder={field.placeholder ?? undefined}
        className={fieldInputClass(Boolean(error))}
      />
      <FieldHint error={error} />
    </div>
  );
}

export default function PublicRegistrationForm({
  form,
  availability,
  slug,
}: {
  form: FormWithFields;
  availability: FormAvailability;
  slug: string;
}) {
  const [state, setState] = useState(initialState);
  const [memberCount, setMemberCount] = useState(form.teamMinMembers);
  const [currentPage, setCurrentPage] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formAction = async (formData: FormData) => {
    const result = await submitRegistrationAction(state, formData);
    setState(result);
  };

  const pages = useMemo(() => {
    const p: FieldDefinition[][] = [[]];
    for (const f of form.fields.filter(f => f.scope === "submission")) {
      if (f.type === "page_break") {
        p.push([]);
      } else {
        p[p.length - 1].push(f);
      }
    }
    return p;
  }, [form.fields]);

  const totalPages = pages.length;

  const memberFields = useMemo(
    () => form.fields.filter((f) => f.scope === "member"),
    [form.fields],
  );
  const memberIndexes = useMemo(
    () => Array.from({ length: memberCount }, (_, i) => i),
    [memberCount],
  );

  useEffect(() => {
    if (state.status === "error" && Object.keys(state.fieldErrors).length > 0) {
      let errorPage = 0;
      for (let i = 0; i < pages.length; i++) {
        const hasError = pages[i].some((f) => state.fieldErrors[`submission__${f.key}`]);
        if (hasError) {
          errorPage = i;
          break;
        }
      }
      if (errorPage === 0 && memberFields.length > 0) {
        const hasMemberError = Object.keys(state.fieldErrors).some(
          (k) => k.startsWith("member__") || k === "memberCount",
        );
        if (hasMemberError) errorPage = totalPages - 1;
      }
      setCurrentPage(errorPage);
    }
  }, [state, pages, memberFields, totalPages]);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      setValidationError(state.message);
      const timer = setTimeout(() => setValidationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.toastKey, state.status, state.message]);

  useEffect(() => {
    if (state.status === "success") {
      setTimeout(() => {
        document.getElementById("registration-success-message")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 10);
    }
  }, [state.status]);

  const handleNext = () => {
    const formEl = document.getElementById("registration-form") as HTMLFormElement;
    if (formEl) {
      let hasError = false;
      const currentFields = pages[currentPage];
      for (const f of currentFields) {
        if (!f.required) continue;
        const name = `submission__${f.key}`;

        if (f.type === "checkbox") {
          const checks = formEl.querySelectorAll(`input[name="${name}"]:checked`);
          if (checks.length === 0) hasError = true;
        } else if (f.type === "radio") {
          const checks = formEl.querySelectorAll(`input[name="${name}"]:checked`);
          if (checks.length === 0) hasError = true;
        } else if (f.type === "file") {
          const input = formEl.elements.namedItem(name) as HTMLInputElement;
          const retainedFile = selectedFiles[name];
          if (!input || (!input.files?.length && !retainedFile)) {
            hasError = true;
          }
        } else {
          const input = formEl.elements.namedItem(name) as HTMLInputElement | null;
          // In React, controlled inputs or defaultValues are accessible via formEl.elements
          // But to be safe, also check if there's a file attached if it's a file
          if (!input || !input.value.trim()) {
            hasError = true;
          } else if (f.type === "date" && !parseDisplayDateInput(input.value.trim())) {
            hasError = true;
          }
        }
      }

      if (hasError) {
        setValidationError("Please complete all required fields on this page before proceeding.");
        setTimeout(() => setValidationError(null), 5000);
        return;
      }
      setValidationError(null);
    }

    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
    setTimeout(() => {
      document.getElementById("registration-form-top")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 10);
  };

  const handlePrev = () => {
    setCurrentPage((p) => Math.max(0, p - 1));
    setTimeout(() => {
      document.getElementById("registration-form-top")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 10);
  };

  const handleFileChange = (name: string, file: File | null) => {
    setSelectedFiles((current) => {
      if (!file) {
        if (!(name in current)) return current;
        const next = { ...current };
        delete next[name];
        return next;
      }

      return { ...current, [name]: file };
    });
  };

  if (state.status === "success") {
    return (
      <div id="registration-success-message" className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-12 text-center sm:p-12 sm:py-16 lg:p-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[18.75rem] w-[18.75rem] rounded-full bg-emerald-500/10 blur-[6.25rem]" />
        </div>

        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_2.5rem_rgba(16,185,129,0.2)] sm:h-20 sm:w-20">
          <Check className="h-8 w-8 stroke-[2.5] sm:h-10 sm:w-10" />
        </div>
        
        <h2 className="relative mt-6 text-2xl font-bold tracking-tight text-white sm:mt-8 sm:text-3xl lg:text-5xl">
          You're all set!
        </h2>
        
        <p className="relative mt-3 w-full max-w-[90vw] px-2 text-base leading-relaxed text-slate-300 sm:mt-4 sm:max-w-lg sm:text-lg">
          {state.message ? renderMessageWithLinks(state.message) : null}
        </p>
        
        <div className="relative mt-8 flex w-full max-w-md flex-col justify-center gap-4 px-4 sm:mt-12 sm:w-auto sm:max-w-none sm:flex-row sm:px-0">
          <Link
            href="/#register"
            className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3.5 text-[0.9375rem] font-medium tracking-wide text-black transition-all hover:bg-zinc-200 sm:w-auto sm:px-8"
          >
            Explore more events
          </Link>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/5 bg-white/5 px-6 py-3.5 text-[0.9375rem] font-medium tracking-wide text-white transition-all hover:bg-white/10 sm:w-auto sm:px-8"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const isFormEmpty = pages[0].length === 0 && !availability.isAcceptingSubmissions;

  return (
    <div className="relative">
      {isMounted && document.body && createPortal(
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className="fixed bottom-6 left-1/2 z-[99999] flex w-[90%] max-w-sm items-center gap-3 rounded-xl border border-rose-500/20 bg-[#18181b]/90 p-4 px-5 text-[0.875rem] font-medium text-rose-200 shadow-2xl backdrop-blur-xl sm:bottom-10"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <p className="flex-1 leading-snug">{validationError}</p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div id="registration-form-top" className="pointer-events-none h-0 w-0" />

      {totalPages > 1 && !isFormEmpty && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-[0.6875rem] font-bold uppercase tracking-widest text-zinc-500">
            <span>Step {currentPage + 1} of {totalPages}</span>
            <span>{Math.round(((currentPage + 1) / totalPages) * 100)}%</span>
          </div>
          <div className="mt-2.5 h-[0.1875rem] w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
            />
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-8" noValidate id="registration-form">
        <input type="hidden" name="formId" value={form.id} />
        <input type="hidden" name="slug" value={slug} />
        <div
          aria-hidden="true"
          className="absolute left-[-625rem] top-auto h-px w-px overflow-hidden"
        >
          <label htmlFor="registration_url">Leave this field empty</label>
          <input
            id="registration_url"
            name="registration_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>

        {isFormEmpty ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-8 text-center backdrop-blur-sm">
            <p className="text-[0.9375rem] font-medium text-amber-200">{availability.label}</p>
            {availability.description && (
              <p className="mt-2 text-[0.875rem] text-amber-300/80">{availability.description}</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-y-6">
              {pages.map((pageFields, pageIndex) => (
                <div key={`page-${pageIndex}`} className={pageIndex === currentPage ? "block" : "hidden"}>
                  <div className="flex flex-col gap-y-6">
                    {pageFields.map((field) => {
                      const name = `submission__${field.key}`;
                      return (
                        <div key={field.id}>
                          <RenderField
                            field={field}
                            name={name}
                            error={state.fieldErrors[name]}
                            defaultValue={state.fields?.[name]}
                            selectedFile={selectedFiles[name] ?? null}
                            onFileChange={(file) => handleFileChange(name, file)}
                            restoreKey={state.toastKey}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Team Details on the last page */}
            {memberFields.length > 0 && currentPage === totalPages - 1 && (
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.01] p-6 sm:p-8 mt-10">
                <div className="absolute left-1/4 top-0 h-96 w-96 -translate-y-1/2 rounded-full bg-white/5 opacity-40 blur-3xl" />
                
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-widest text-zinc-300">
                      Team Details
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                      Competition Members
                    </h3>
                    <p className="mt-2 text-[0.875rem] leading-relaxed text-zinc-400 max-w-sm">
                      Enter the information for each participant. Team size: {form.teamMinMembers}–
                      {form.teamMaxMembers}.
                    </p>
                  </div>

                  <div className="w-full max-w-[16rem]">
                    <label
                      htmlFor="memberCount"
                      className="mb-2 block text-[0.875rem] font-medium text-zinc-300"
                    >
                      How many members?
                    </label>
                    <select
                      id="memberCount"
                      name="memberCount"
                      value={memberCount}
                      onChange={(e) => setMemberCount(Number(e.target.value))}
                      className={fieldInputClass(Boolean(state.fieldErrors.memberCount))}
                    >
                      {Array.from(
                        { length: form.teamMaxMembers - form.teamMinMembers + 1 },
                        (_, i) => form.teamMinMembers + i,
                      ).map((v) => (
                        <option key={v} value={v} className="bg-[#09090b] text-zinc-100">
                          {v} {v === 1 ? "member" : "members"}
                        </option>
                      ))}
                    </select>
                    {state.fieldErrors.memberCount && (
                      <p className="mt-2 text-[0.8125rem] text-rose-300">
                        {state.fieldErrors.memberCount}
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative mt-8 space-y-6">
                  {memberIndexes.map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-colors sm:p-7"
                    >
                      <h4 className="flex items-center gap-3 text-lg font-medium text-white">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-[0.6875rem] font-bold ring-1 ring-white/10">
                          {i + 1}
                        </span>
                        Member {i + 1}
                      </h4>
                      <div className="mt-6 flex flex-col gap-y-6">
                        {memberFields.map((field) => {
                          const name = `member__${i}__${field.key}`;
                          return (
                            <div key={`${field.id}-${i}`}>
                              <RenderField
                                field={field}
                                name={name}
                                error={state.fieldErrors[name]}
                                defaultValue={state.fields?.[name]}
                                selectedFile={selectedFiles[name] ?? null}
                                onFileChange={(file) => handleFileChange(name, file)}
                                restoreKey={state.toastKey}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <div className="flex flex-col items-center justify-between gap-5 sm:flex-row sm:gap-6 pt-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {currentPage > 0 && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-white/5 py-3.5 px-6 text-[0.9375rem] font-medium text-white transition-all hover:bg-white/10 sm:w-auto"
                    >
                      Previous
                    </button>
                  )}
                  {currentPage < totalPages - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-white text-black px-8 py-3.5 text-[0.9375rem] font-medium tracking-wide transition-all hover:bg-zinc-200 sm:w-auto"
                    >
                      Next Step
                    </button>
                  ) : (
                    <SubmitButton disabled={!availability.isAcceptingSubmissions} />
                  )}
                </div>
                {!availability.isAcceptingSubmissions && (
                  <p className="text-[0.8125rem] font-medium text-amber-300">
                    This form is currently {availability.label.toLowerCase()}.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
