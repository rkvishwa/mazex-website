"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import {
  createAdminAccountAction,
  deleteAdminAccountAction,
  type ManageAdminAccountsState,
} from "@/app/admin/actions";
import type { SiteAdminSummary } from "@/lib/admin-users";

const initialManageAdminAccountsState: ManageAdminAccountsState = {
  status: "idle",
  message: null,
  toastKey: 0,
};

function TextField({
  id,
  label,
  name,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>

      <div className="relative mt-1 rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Mail className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
        </div>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          className="block h-10 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  name,
  autoComplete,
}: {
  id: string;
  label: string;
  name: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>

      <div className="relative mt-1 rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <ShieldCheck className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
        </div>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className="block h-10 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-10 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
            className="text-zinc-400 transition-colors hover:text-zinc-600 focus:outline-none dark:hover:text-zinc-300"
          >
            {visible ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAdminSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-300 dark:focus:ring-offset-zinc-900"
    >
      <UserPlus className="h-4 w-4" />
      {pending ? "Adding admin..." : "Add admin"}
    </button>
  );
}

function DeleteAdminSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 dark:focus:ring-rose-700 dark:focus:ring-offset-zinc-900"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Removing..." : "Remove"}
    </button>
  );
}

function DeleteAdminForm({
  admin,
}: {
  admin: SiteAdminSummary;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    deleteAdminAccountAction,
    initialManageAdminAccountsState,
  );

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end"
        onSubmit={(event) => {
          if (!isOpen) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <input type="hidden" name="userId" value={admin.id} />
        <DeleteAdminSubmitButton />
        {state.status === "error" && state.message ? (
          <p className="max-w-xs text-xs text-rose-600 dark:text-rose-400">
            {state.message}
          </p>
        ) : null}
      </form>

      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          setIsOpen(false);
          formRef.current?.requestSubmit();
        }}
        title="Remove admin access?"
        description={`This will permanently remove admin access for ${admin.email || admin.name || "this account"}. They will no longer be able to sign in or manage maze resources.`}
        confirmText="Remove access"
        tone="danger"
      />
    </>
  );
}

function AdminRoleBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "default" | "strong";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        tone === "strong"
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
      }`}
    >
      {children}
    </span>
  );
}

export default function AdminAccessManager({
  adminDirectoryNotice,
  admins,
  canDeleteAdmins,
  canManageAdmins,
  currentAdminUserId,
}: {
  adminDirectoryNotice: {
    status: "error";
    message: string;
  } | null;
  admins: SiteAdminSummary[];
  canDeleteAdmins: boolean;
  canManageAdmins: boolean;
  currentAdminUserId: string;
}) {
  const [createState, createFormAction] = useActionState(
    createAdminAccountAction,
    initialManageAdminAccountsState,
  );
  const createFormKey =
    createState.status === "success"
      ? `success:${createState.toastKey}`
      : "create-admin-form";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-3 py-5 shadow-sm sm:p-6 md:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="max-w-2xl">
        <div className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          Admin access
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Manage admins
        </h2>
      </div>

      {canManageAdmins && (
        <form
          key={createFormKey}
          action={createFormAction}
          className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Add a new admin
            </h3>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TextField
              id="newAdminName"
              label="Name"
              name="name"
              autoComplete="name"
            />
            <TextField
              id="newAdminEmail"
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
            />
            <PasswordField
              id="newAdminPassword"
              label="Password"
              name="password"
              autoComplete="new-password"
            />
            <PasswordField
              id="newAdminConfirmPassword"
              label="Confirm password"
              name="confirmPassword"
              autoComplete="new-password"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <CreateAdminSubmitButton />
          </div>

          {createState.status !== "idle" && createState.message ? (
            <p
              className={`mt-4 text-sm ${
                createState.status === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {createState.message}
            </p>
          ) : null}
        </form>
      )}

      <div className="mt-8 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Current admins
            </h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {admins.length} admin account{admins.length === 1 ? "" : "s"}
          </p>
        </div>

        {adminDirectoryNotice ? (
          <div className="border-b border-zinc-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-zinc-800 dark:bg-rose-950/30 dark:text-rose-300">
            {adminDirectoryNotice.message}
          </div>
        ) : null}

        {admins.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {admins.map((admin) => {
              const title = admin.name || admin.email || "Admin account";
              const subtitle = admin.email && admin.name ? admin.email : null;
              const isCurrentAdmin = admin.id === currentAdminUserId;

              return (
                <div
                  key={admin.id}
                  className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {title}
                      </p>
                      {isCurrentAdmin ? (
                        <AdminRoleBadge tone="default">Signed in</AdminRoleBadge>
                      ) : null}
                      {admin.isSuperAdmin ? (
                        <AdminRoleBadge tone="strong">superadmin</AdminRoleBadge>
                      ) : null}
                      {admin.isAdmin ? (
                        <AdminRoleBadge tone="default">admin</AdminRoleBadge>
                      ) : null}
                    </div>

                    {subtitle ? (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {subtitle}
                      </p>
                    ) : null}

                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {admin.emailVerification ? "Verified email" : "Email not verified"}
                      {" · "}
                      {admin.status ? "Active account" : "Disabled account"}
                    </p>
                  </div>

                  {canDeleteAdmins && !isCurrentAdmin ? (
                    <DeleteAdminForm admin={admin} />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : !adminDirectoryNotice ? (
          <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No admin accounts were found.
          </div>
        ) : null}
      </div>
    </section>
  );
}
