import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  ensureGoogleSpreadsheetForAdmin,
  exchangeGoogleOAuthCode,
  fetchGoogleUserInfo,
  getGoogleSheetsConnectionRecordForAdmin,
  isGoogleSheetsOAuthConfigured,
  normalizeGoogleSheetsReturnToPath,
  upsertGoogleSheetsConnection,
} from "@/lib/google-sheets";

export const runtime = "nodejs";

const GOOGLE_SHEETS_OAUTH_STATE_COOKIE = "mazex_google_sheets_oauth_state";

type OAuthStateCookie = {
  state: string;
  adminUserId: string;
  returnTo: string;
};

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
  const response = NextResponse.redirect(new URL(returnTo, request.url));
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
    return NextResponse.redirect(new URL("/login?reason=unauthorized", request.url));
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
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = host?.includes("localhost") ? "http" : (forwardedProto === "https" ? "https" : (process.env.NODE_ENV === "production" ? "https" : (forwardedProto || "http")));
    const origin = (host ? `${protocol}://${host}` : null) || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || request.nextUrl.origin;
    const redirectUri = new URL("/api/admin/google-sheets/callback", origin).toString();
    const existingConnection = await getGoogleSheetsConnectionRecordForAdmin(
      currentAdmin.user.$id,
    );
    const tokenResponse = await exchangeGoogleOAuthCode({
      code,
      redirectUri,
    });
    const refreshToken =
      tokenResponse.refresh_token?.trim() || existingConnection?.refreshToken || "";

    if (!refreshToken) {
      throw new Error("Google did not return a refresh token for Sheets access.");
    }

    const accessToken = tokenResponse.access_token?.trim();
    if (!accessToken) {
      throw new Error("Google did not return an access token.");
    }

    const [userInfo, spreadsheet] = await Promise.all([
      fetchGoogleUserInfo(accessToken),
      ensureGoogleSpreadsheetForAdmin(accessToken, existingConnection?.spreadsheetId),
    ]);

    await upsertGoogleSheetsConnection({
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
