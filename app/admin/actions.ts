"use server";

import { AppwriteException } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroyCurrentAdminSession,
  getCurrentAdmin,
  getCurrentAdminPasswordClient,
} from "@/lib/admin-auth";
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
