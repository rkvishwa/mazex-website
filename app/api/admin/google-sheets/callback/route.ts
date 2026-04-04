import { NextRequest, NextResponse } from "next/server";
import { buildAppUrl } from "@/lib/app-url";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  exchangeGoogleOAuthCode,
  fetchGoogleUserInfo,
  getSharedGoogleSheetsConnectionDocumentId,
  getSharedGoogleSheetsConnectionRecord,
  isGoogleSheetsOAuthConfigured,
  normalizeGoogleSheetsReturnToPath,
  resolveGoogleSpreadsheetForReconnectedAccount,
  upsertGoogleSheetsConnection,
} from "@/lib/google-sheets";
import { getGoogleSheetsTransferOnReconnectEnabled } from "@/lib/site-resources";

export const runtime = "nodejs";

const GOOGLE_SHEETS_OAUTH_STATE_COOKIE = "mazex_google_sheets_oauth_state";

type OAuthStateCookie = {
  state: string;
  adminUserId: string;
  returnTo: string;
};

type GoogleSheetsNotice = {
  status: "error" | "success" | "warning";
  message: string;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function normalizeGoogleSheetsNoticeMessage(
  value: string | null | undefined,
  fallback: string,
) {
  const normalized = value?.trim().replace(/\s+/gu, " ") || "";
  return (normalized || fallback).slice(0, 300);
}

function buildReturnToWithGoogleSheetsNotice(
  returnTo: string,
  notice?: GoogleSheetsNotice,
) {
  const normalizedReturnTo = normalizeGoogleSheetsReturnToPath(returnTo);
  if (!notice) {
    return normalizedReturnTo;
  }

  const url = new URL(normalizedReturnTo, "https://mazex.local");
  url.searchParams.set("googleSheetsStatus", notice.status);
  url.searchParams.set("googleSheetsMessage", notice.message);

  return `${url.pathname}${url.search}${url.hash}`;
}

function parseStateCookie(value: string | undefined): OAuthStateCookie | null {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as OAuthStateCookie;

    if (
      typeof parsed.state !== "string" ||
      typeof parsed.adminUserId !== "string" ||
      typeof parsed.returnTo !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function createRedirectResponse(
  request: NextRequest,
  returnTo: string,
  notice?: GoogleSheetsNotice,
) {
  const response = NextResponse.redirect(
    buildAppUrl(request, buildReturnToWithGoogleSheetsNotice(returnTo, notice)),
  );
  response.cookies.set(GOOGLE_SHEETS_OAUTH_STATE_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const stateCookie = parseStateCookie(
    request.cookies.get(GOOGLE_SHEETS_OAUTH_STATE_COOKIE)?.value,
  );
  const fallbackReturnTo = normalizeGoogleSheetsReturnToPath(stateCookie?.returnTo);

  if (!isGoogleSheetsOAuthConfigured()) {
    return createRedirectResponse(request, fallbackReturnTo);
  }

  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.redirect(buildAppUrl(request, "/login?reason=unauthorized"));
  }

  const requestState = request.nextUrl.searchParams.get("state")?.trim() || "";
  if (
    !stateCookie ||
    stateCookie.state !== requestState ||
    stateCookie.adminUserId !== currentAdmin.user.$id
  ) {
    return createRedirectResponse(request, fallbackReturnTo, {
      status: "error",
      message: "Google sign-in session expired. Try reconnecting again.",
    });
  }

  const googleError = request.nextUrl.searchParams.get("error")?.trim();
  if (googleError) {
    return createRedirectResponse(request, fallbackReturnTo, {
      status: "error",
      message: normalizeGoogleSheetsNoticeMessage(
        request.nextUrl.searchParams.get("error_description"),
        googleError === "access_denied"
          ? "Google sign-in was cancelled."
          : "Google sign-in failed.",
      ),
    });
  }

  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return createRedirectResponse(request, fallbackReturnTo, {
      status: "error",
      message: "Google did not return an authorization code.",
    });
  }

  try {
    const redirectUri = buildAppUrl(
      request,
      "/api/admin/google-sheets/callback",
    ).toString();
    const existingConnection = await getSharedGoogleSheetsConnectionRecord();
    const tokenResponse = await exchangeGoogleOAuthCode({
      code,
      redirectUri,
    });
    const accessToken = tokenResponse.access_token?.trim();
    if (!accessToken) {
      throw new Error("Google did not return an access token.");
    }

    const [userInfo, transferExistingData] = await Promise.all([
      fetchGoogleUserInfo(accessToken),
      getGoogleSheetsTransferOnReconnectEnabled(),
    ]);
    const hasGoogleAccountChanged =
      Boolean(normalizeEmail(userInfo.email)) &&
      Boolean(normalizeEmail(existingConnection?.email)) &&
      normalizeEmail(userInfo.email) !== normalizeEmail(existingConnection?.email);
    const refreshToken =
      tokenResponse.refresh_token?.trim() ||
      (!hasGoogleAccountChanged ? existingConnection?.refreshToken : "") ||
      "";

    if (!refreshToken) {
      throw new Error("Google did not return a refresh token for Sheets access.");
    }
    const spreadsheet = await resolveGoogleSpreadsheetForReconnectedAccount({
      targetAccessToken: accessToken,
      existingConnection,
      transferExistingData,
      targetEmail: userInfo.email,
    });

    await upsertGoogleSheetsConnection({
      connectionDocumentId: getSharedGoogleSheetsConnectionDocumentId(),
      adminUserId: currentAdmin.user.$id,
      email: userInfo.email,
      refreshToken,
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl,
    });

    if (spreadsheet.transferWarning) {
      return createRedirectResponse(request, fallbackReturnTo, {
        status: "warning",
        message: normalizeGoogleSheetsNoticeMessage(
          spreadsheet.transferWarning,
          "Google account connected, but the existing spreadsheet could not be transferred.",
        ),
      });
    }
  } catch (error) {
    console.error("Google Sheets OAuth callback failed:", error);
    return createRedirectResponse(request, fallbackReturnTo, {
      status: "error",
      message: normalizeGoogleSheetsNoticeMessage(
        error instanceof Error ? error.message : null,
        "Google Sheets reconnect failed.",
      ),
    });
  }

  return createRedirectResponse(request, fallbackReturnTo);
}
