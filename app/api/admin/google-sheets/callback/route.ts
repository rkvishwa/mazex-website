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

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
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

function createRedirectResponse(request: NextRequest, returnTo: string) {
  const response = NextResponse.redirect(buildAppUrl(request, returnTo));
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
    return createRedirectResponse(request, fallbackReturnTo);
  }

  const googleError = request.nextUrl.searchParams.get("error")?.trim();
  if (googleError) {
    return createRedirectResponse(request, fallbackReturnTo);
  }

  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return createRedirectResponse(request, fallbackReturnTo);
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
  } catch (error) {
    console.error("Google Sheets OAuth callback failed:", error);
  }

  return createRedirectResponse(request, fallbackReturnTo);
}
