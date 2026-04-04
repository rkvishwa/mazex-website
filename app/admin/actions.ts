"use server";

import { AppwriteException } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroyCurrentAdminSession,
  getCurrentAdmin,
  getCurrentAdminPasswordClient,
} from "@/lib/admin-auth";
import {
  createSiteAdmin,
  deleteSiteAdmin,
  listSiteAdmins,
} from "@/lib/admin-users";
import { AppwriteConfigError } from "@/lib/appwrite";
import { setGoogleSheetsTransferOnReconnectEnabled } from "@/lib/site-resources";

export type ChangeAdminPasswordState = {
  error: string | null;
  toastKey: number;
};

export type UpdateGoogleSheetsTransferState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
};

export type ManageAdminAccountsState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
};

function buildGoogleSheetsTransferState(
  status: UpdateGoogleSheetsTransferState["status"],
  message: string | null,
): UpdateGoogleSheetsTransferState {
  return {
    status,
    message,
    toastKey: Date.now(),
  };
}

function buildManageAdminAccountsState(
  status: ManageAdminAccountsState["status"],
  message: string | null,
): ManageAdminAccountsState {
  return {
    status,
    message,
    toastKey: Date.now(),
  };
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function handleManageAdminAccountsError(
  error: unknown,
  fallbackMessage: string,
): ManageAdminAccountsState {
  if (error instanceof AppwriteException) {
    if (error.code === 409) {
      return buildManageAdminAccountsState(
        "error",
        "An account with that email already exists.",
      );
    }

    if ([401, 403].includes(error.code ?? 0)) {
      return buildManageAdminAccountsState(
        "error",
        "The Appwrite API key needs users.read and users.write scopes.",
      );
    }

    if (error.code === 404) {
      return buildManageAdminAccountsState(
        "error",
        "The selected admin account could not be found anymore.",
      );
    }

    if (/email/i.test(error.message)) {
      return buildManageAdminAccountsState(
        "error",
        "Enter a valid email address for the new admin.",
      );
    }

    if (/password/i.test(error.message)) {
      return buildManageAdminAccountsState(
        "error",
        "Admin passwords must be at least 8 characters long.",
      );
    }

    return buildManageAdminAccountsState(
      "error",
      error.message || fallbackMessage,
    );
  }

  if (error instanceof AppwriteConfigError) {
    return buildManageAdminAccountsState("error", error.message);
  }

  return buildManageAdminAccountsState(
    "error",
    error instanceof Error ? error.message : fallbackMessage,
  );
}

export async function logoutAdminAction() {
  await destroyCurrentAdminSession();
  redirect("/login?reason=signed-out");
}

export async function changeAdminPasswordAction(
  _previousState: ChangeAdminPasswordState,
  formData: FormData,
): Promise<ChangeAdminPasswordState> {
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return {
      error: "Fill in all password fields to continue.",
      toastKey: Date.now(),
    };
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      error: "Fill in all password fields to continue.",
      toastKey: Date.now(),
    };
  }

  if (newPassword.length < 8) {
    return {
      error: "New password must be at least 8 characters long.",
      toastKey: Date.now(),
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "New password and confirmation do not match.",
      toastKey: Date.now(),
    };
  }

  if (currentPassword === newPassword) {
    return {
      error: "Choose a new password that is different from the current one.",
      toastKey: Date.now(),
    };
  }

  try {
    const account = await getCurrentAdminPasswordClient();

    if (!account) {
      return {
        error: "Your admin session has expired. Sign in again to continue.",
        toastKey: Date.now(),
      };
    }

    await account.updatePassword({
      password: newPassword,
      oldPassword: currentPassword,
    });

    await destroyCurrentAdminSession();
  } catch (error) {
    if (error instanceof AppwriteException) {
      if (
        [400, 401, 403].includes(error.code ?? 0) &&
        /password/i.test(error.message)
      ) {
        return {
          error: "Current password is incorrect.",
          toastKey: Date.now(),
        };
      }

      return {
        error: error.message || "Unable to change the password right now.",
        toastKey: Date.now(),
      };
    }

    return {
      error: "Unable to change the password right now.",
      toastKey: Date.now(),
    };
  }

  redirect("/login?reason=password-updated");
}

export async function updateGoogleSheetsTransferPreferenceAction(
  _previousState: UpdateGoogleSheetsTransferState,
  formData: FormData,
): Promise<UpdateGoogleSheetsTransferState> {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return buildGoogleSheetsTransferState(
      "error",
      "Your admin session has expired. Sign in again to continue.",
    );
  }

  const enabled = formData.get("transferExistingGoogleSheetsData") === "on";

  try {
    await setGoogleSheetsTransferOnReconnectEnabled(enabled);
  } catch (error) {
    if (error instanceof AppwriteException) {
      if (error.code === 404) {
        return buildGoogleSheetsTransferState(
          "error",
          "Resources collection was not found. Push the Appwrite schema first.",
        );
      }

      if ([401, 403].includes(error.code ?? 0)) {
        return buildGoogleSheetsTransferState(
          "error",
          "The Appwrite API key needs databases.read and databases.write scopes.",
        );
      }

      return buildGoogleSheetsTransferState(
        "error",
        error.message || "Unable to update the Google Sheets transfer setting.",
      );
    }

    if (error instanceof AppwriteConfigError) {
      return buildGoogleSheetsTransferState("error", error.message);
    }

    return buildGoogleSheetsTransferState(
      "error",
      "Unable to update the Google Sheets transfer setting.",
    );
  }

  revalidatePath("/admin/settings");

  return buildGoogleSheetsTransferState(
    "success",
    enabled
      ? "Transfer on Google account change is enabled."
      : "Transfer on Google account change is disabled.",
  );
}

export async function createAdminAccountAction(
  _previousState: ManageAdminAccountsState,
  formData: FormData,
): Promise<ManageAdminAccountsState> {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return buildManageAdminAccountsState(
      "error",
      "Your admin session has expired. Sign in again to continue.",
    );
  }

  if (!currentAdmin.canManageAdmins) {
    return buildManageAdminAccountsState(
      "error",
      "Only superadmins can add other admins.",
    );
  }

  const name = readFormString(formData, "name");
  const email = readFormString(formData, "email").toLowerCase();
  const password = readFormString(formData, "password");
  const confirmPassword = readFormString(formData, "confirmPassword");

  if (!email || !password || !confirmPassword) {
    return buildManageAdminAccountsState(
      "error",
      "Fill in the email, password, and confirmation fields to continue.",
    );
  }

  if (password.length < 8) {
    return buildManageAdminAccountsState(
      "error",
      "Admin passwords must be at least 8 characters long.",
    );
  }

  if (password !== confirmPassword) {
    return buildManageAdminAccountsState(
      "error",
      "Password and confirmation do not match.",
    );
  }

  try {
    await createSiteAdmin({ email, password, name });
  } catch (error) {
    return handleManageAdminAccountsError(
      error,
      "Unable to add the admin account right now.",
    );
  }

  revalidatePath("/admin/settings");

  return buildManageAdminAccountsState(
    "success",
    `Admin access created for ${email}.`,
  );
}

export async function deleteAdminAccountAction(
  _previousState: ManageAdminAccountsState,
  formData: FormData,
): Promise<ManageAdminAccountsState> {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return buildManageAdminAccountsState(
      "error",
      "Your admin session has expired. Sign in again to continue.",
    );
  }

  if (!currentAdmin.canDeleteAdmins) {
    return buildManageAdminAccountsState(
      "error",
      "Only superadmins can remove admins.",
    );
  }

  const targetUserId = readFormString(formData, "userId");

  if (!targetUserId) {
    return buildManageAdminAccountsState(
      "error",
      "Missing the admin account to remove.",
    );
  }

  if (targetUserId === currentAdmin.user.$id) {
    return buildManageAdminAccountsState(
      "error",
      "You cannot remove the admin account that is currently signed in.",
    );
  }

  let admins;

  try {
    admins = await listSiteAdmins();
  } catch (error) {
    return handleManageAdminAccountsError(
      error,
      "Unable to verify the admin account before deleting it.",
    );
  }

  const targetAdmin = admins.find((admin) => admin.id === targetUserId);

  if (!targetAdmin) {
    return buildManageAdminAccountsState(
      "error",
      "The selected admin account could not be found.",
    );
  }

  if (targetAdmin.isSuperAdmin) {
    const remainingSuperAdmins = admins.filter(
      (admin) => admin.isSuperAdmin && admin.id !== targetAdmin.id,
    );

    if (remainingSuperAdmins.length === 0) {
      return buildManageAdminAccountsState(
        "error",
        "At least one superadmin account must remain.",
      );
    }
  }

  try {
    await deleteSiteAdmin(targetAdmin.id);
  } catch (error) {
    return handleManageAdminAccountsError(
      error,
      "Unable to remove the admin account right now.",
    );
  }

  revalidatePath("/admin/settings");

  return buildManageAdminAccountsState(
    "success",
    targetAdmin.email
      ? `Removed admin access for ${targetAdmin.email}.`
      : "Admin account removed.",
  );
}
