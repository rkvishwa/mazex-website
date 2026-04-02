import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  buildGoogleSheetsOAuthUrl,
  isGoogleSheetsOAuthConfigured,
  normalizeGoogleSheetsReturnToPath,
} from "@/lib/google-sheets";

export const runtime = "nodejs";

const GOOGLE_SHEETS_OAUTH_STATE_COOKIE = "mazex_google_sheets_oauth_state";

function buildStateCookieValue(payload: {
  state: string;
  adminUserId: string;
  returnTo: string;
}) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export async function GET(request: NextRequest) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.redirect(new URL("/login?reason=unauthorized", request.url));
  }

  const returnTo = normalizeGoogleSheetsReturnToPath(
    request.nextUrl.searchParams.get("returnTo"),
  );
  if (!isGoogleSheetsOAuthConfigured()) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const state = crypto.randomUUID();
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = host?.includes("localhost") ? "http" : (forwardedProto === "https" ? "https" : (process.env.NODE_ENV === "production" ? "https" : (forwardedProto || "http")));
  const origin = (host ? `${protocol}://${host}` : null) || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || request.nextUrl.origin;
  const redirectUri = new URL("/api/admin/google-sheets/callback", origin).toString();
  const response = NextResponse.redirect(
    buildGoogleSheetsOAuthUrl({
      redirectUri,
      state,
    }),
  );

  response.cookies.set(
    GOOGLE_SHEETS_OAUTH_STATE_COOKIE,
    buildStateCookieValue({
      state,
      adminUserId: currentAdmin.user.$id,
      returnTo,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    },
  );

  return response;
}
