"use server";

import { AppwriteException } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { AppwriteConfigError } from "@/lib/appwrite";
import {
  DELEGATE_BOOKLET_RESOURCE_KEY,
  normalizeSiteResourceLink,
  upsertSiteResourceValue,
} from "@/lib/site-resources";

export type UpdateAdminResourcesState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
};

function buildState(
  status: UpdateAdminResourcesState["status"],
  message: string | null,
): UpdateAdminResourcesState {
  return {
    status,
    message,
    toastKey: Date.now(),
  };
}

export async function updateAdminResourcesAction(
  _previousState: UpdateAdminResourcesState,
  formData: FormData,
): Promise<UpdateAdminResourcesState> {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return buildState(
      "error",
      "Your admin session has expired. Sign in again to continue.",
    );
  }

  const delegateBooklet = formData.get("delegateBooklet");

  if (typeof delegateBooklet !== "string") {
    return buildState("error", "Invalid delegate booklet URL payload.");
  }

  const trimmedLink = delegateBooklet.trim();
  let normalizedLink = "";

  if (trimmedLink) {
    const parsedLink = normalizeSiteResourceLink(trimmedLink);

    if (!parsedLink) {
      return buildState(
        "error",
        "Enter a valid http(s) URL or a site path that starts with '/'.",
      );
    }

    normalizedLink = parsedLink;
  }

  if (trimmedLink && !normalizedLink) {
    return buildState(
      "error",
      "Enter a valid http(s) URL or a site path that starts with '/'.",
    );
  }

  try {
    await upsertSiteResourceValue(
      DELEGATE_BOOKLET_RESOURCE_KEY,
      normalizedLink,
    );
  } catch (error) {
    if (error instanceof AppwriteException) {
      if (error.code === 404) {
        return buildState(
          "error",
          "Resources collection was not found. Push appwrite.config.json first.",
        );
      }

      if ([401, 403].includes(error.code ?? 0)) {
        return buildState(
          "error",
          "The Appwrite API key needs databases.read and databases.write scopes.",
        );
      }

      return buildState(
        "error",
        error.message || "Unable to update the delegate booklet right now.",
      );
    }

    if (error instanceof AppwriteConfigError) {
      return buildState("error", error.message);
    }

    return buildState(
      "error",
      "Unable to update the delegate booklet right now.",
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/resources");

  return buildState(
    "success",
    trimmedLink
      ? "Delegate booklet URL updated successfully."
      : "Delegate booklet URL cleared. The public button is now disabled.",
  );
}
