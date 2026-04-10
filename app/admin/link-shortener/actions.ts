"use server";

import { AppwriteException } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { AppwriteConfigError } from "@/lib/appwrite";
import {
  createShortLink,
  deleteShortLink,
  setShortLinkActiveState,
  ShortLinkConflictError,
  ShortLinkValidationError,
} from "@/lib/short-links";

export type CreateAdminShortLinkState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
  createdLink: {
    shortCode: string;
    shortPath: string;
    destinationUrl: string;
    expiresAt: string | null;
    generatedShortCode: boolean;
  } | null;
};

export type ManageAdminShortLinkState = {
  status: "idle" | "success" | "error";
  message: string | null;
  toastKey: number;
  linkId: string | null;
  intent: "toggle" | "delete" | null;
};

function buildState(
  status: CreateAdminShortLinkState["status"],
  message: string | null,
  createdLink: CreateAdminShortLinkState["createdLink"] = null,
): CreateAdminShortLinkState {
  return {
    status,
    message,
    toastKey: Date.now(),
    createdLink,
  };
}

function buildManageState(
  status: ManageAdminShortLinkState["status"],
  message: string | null,
  options?: {
    intent?: ManageAdminShortLinkState["intent"];
    linkId?: string | null;
  },
): ManageAdminShortLinkState {
  return {
    status,
    message,
    toastKey: Date.now(),
    linkId: options?.linkId ?? null,
    intent: options?.intent ?? null,
  };
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateShortLinkPaths(shortCode?: string | null) {
  revalidatePath("/admin/link-shortener");
  revalidatePath("/admin/link-shortner");

  if (shortCode) {
    revalidatePath(`/url/${shortCode}`);
  }
}

function parseExpiryFromFormData(formData: FormData) {
  const localDateTime = readFormString(formData, "expiresAtLocal");

  if (!localDateTime) {
    return null;
  }

  const timezoneOffsetRaw = readFormString(formData, "timezoneOffsetMinutes");
  if (!/^-?\d+$/u.test(timezoneOffsetRaw)) {
    throw new ShortLinkValidationError(
      "invalid_expiry",
      "Unable to read your local timezone for the expiry date. Refresh and try again.",
    );
  }

  const match = localDateTime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u,
  );

  if (!match) {
    throw new ShortLinkValidationError(
      "invalid_expiry",
      "Enter a valid expiry date and time.",
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const timezoneOffsetMinutes = Number(timezoneOffsetRaw);

  const validationDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day ||
    validationDate.getUTCHours() !== hour ||
    validationDate.getUTCMinutes() !== minute
  ) {
    throw new ShortLinkValidationError(
      "invalid_expiry",
      "Enter a valid expiry date and time.",
    );
  }

  return new Date(
    validationDate.getTime() + timezoneOffsetMinutes * 60_000,
  ).toISOString();
}

export async function createAdminShortLinkAction(
  previousState: CreateAdminShortLinkState,
  formData: FormData,
): Promise<CreateAdminShortLinkState> {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return buildState(
      "error",
      "Your admin session has expired. Sign in again to continue.",
    );
  }

  const destinationUrl = readFormString(formData, "destinationUrl");
  const requestedShortCode = readFormString(formData, "shortCode");

  try {
    const expiresAt = parseExpiryFromFormData(formData);
    const { generatedShortCode, shortLink } = await createShortLink({
      destinationUrl,
      requestedShortCode: requestedShortCode || null,
      expiresAt,
      createdByAdminUserId: currentAdmin.user.$id,
    });

    revalidateShortLinkPaths(shortLink.shortCode);

    return buildState(
      "success",
      generatedShortCode
        ? "Short link created with an auto-generated short name."
        : "Short link created successfully.",
      {
        shortCode: shortLink.shortCode,
        shortPath: `/url/${shortLink.shortCode}`,
        destinationUrl: shortLink.destinationUrl,
        expiresAt: shortLink.expiresAt,
        generatedShortCode,
      },
    );
  } catch (error) {
    if (error instanceof ShortLinkValidationError) {
      return buildState("error", error.message, previousState.createdLink);
    }

    if (error instanceof ShortLinkConflictError) {
      return buildState("error", error.message, previousState.createdLink);
    }

    if (error instanceof AppwriteException) {
      if (error.code === 404) {
        return buildState(
          "error",
          "Short links collection was not found. Run 'appwrite push collections' first.",
          previousState.createdLink,
        );
      }

      if ([401, 403].includes(error.code ?? 0)) {
        return buildState(
          "error",
          "The Appwrite API key needs databases.read and databases.write scopes.",
          previousState.createdLink,
        );
      }

      return buildState(
        "error",
        error.message || "Unable to create the short link right now.",
        previousState.createdLink,
      );
    }

    if (error instanceof AppwriteConfigError) {
      return buildState("error", error.message, previousState.createdLink);
    }

    return buildState(
      "error",
      error instanceof Error
        ? error.message
        : "Unable to create the short link right now.",
      previousState.createdLink,
    );
  }
}

export async function manageAdminShortLinkAction(
  previousState: ManageAdminShortLinkState,
  formData: FormData,
): Promise<ManageAdminShortLinkState> {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return buildManageState(
      "error",
      "Your admin session has expired. Sign in again to continue.",
      {
        intent: previousState.intent,
        linkId: previousState.linkId,
      },
    );
  }

  const linkId = readFormString(formData, "linkId");
  const intent = readFormString(formData, "intent");

  if (!linkId) {
    return buildManageState(
      "error",
      "Short link ID is missing from this request.",
    );
  }

  if (intent !== "toggle" && intent !== "delete") {
    return buildManageState(
      "error",
      "Unsupported short link action.",
      {
        linkId,
      },
    );
  }

  try {
    if (intent === "toggle") {
      const nextActiveStateRaw = readFormString(formData, "nextActiveState");
      if (nextActiveStateRaw !== "true" && nextActiveStateRaw !== "false") {
        return buildManageState(
          "error",
          "The next active state for this short link is invalid.",
          {
            intent,
            linkId,
          },
        );
      }

      const shortLink = await setShortLinkActiveState({
        linkId,
        isActive: nextActiveStateRaw === "true",
      });

      revalidateShortLinkPaths(shortLink.shortCode);

      return buildManageState(
        "success",
        shortLink.isActive
          ? "Short link enabled. Visitors can use it again if it has not expired."
          : "Short link disabled. Visitors will now see the unavailable notice instead of being redirected.",
        {
          intent,
          linkId: shortLink.id,
        },
      );
    }

    const deletedShortLink = await deleteShortLink(linkId);
    revalidateShortLinkPaths(deletedShortLink?.shortCode ?? null);

    return buildManageState(
      "success",
      "Short link deleted permanently.",
      {
        intent,
        linkId,
      },
    );
  } catch (error) {
    if (error instanceof AppwriteException) {
      if (error.code === 404) {
        return buildManageState(
          "error",
          "That short link no longer exists.",
          {
            intent,
            linkId,
          },
        );
      }

      if ([401, 403].includes(error.code ?? 0)) {
        return buildManageState(
          "error",
          "The Appwrite API key needs databases.read and databases.write scopes.",
          {
            intent,
            linkId,
          },
        );
      }

      return buildManageState(
        "error",
        error.message || "Unable to update the short link right now.",
        {
          intent,
          linkId,
        },
      );
    }

    if (error instanceof AppwriteConfigError) {
      return buildManageState("error", error.message, {
        intent,
        linkId,
      });
    }

    return buildManageState(
      "error",
      error instanceof Error
        ? error.message
        : "Unable to update the short link right now.",
      {
        intent,
        linkId,
      },
    );
  }
}
