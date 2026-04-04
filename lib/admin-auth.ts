import "server-only";

import { Account, AppwriteException, Models } from "node-appwrite";
import { cookies, headers } from "next/headers";
import {
  ADMIN_SESSION_COOKIE_NAME,
  AppwriteConfigError,
  createAppwriteAdminClient,
  createAppwriteSessionClient,
  getAppwriteConfig,
  isAppwriteConfigured,
} from "@/lib/appwrite";

const invalidLoginMessage = "Enter a valid email and password.";
const unauthorizedMessage =
  "Only verified admin users can access this dashboard.";
const misconfiguredMessage =
  "Admin authentication is not configured yet. Add the required environment variables first.";
const loginFailedMessage = "Unable to sign in right now.";

type AuthenticatedAdmin = {
  adminLabel: string;
  superAdminLabel: string;
  isSuperAdmin: boolean;
  canManageAdmins: boolean;
  canDeleteAdmins: boolean;
  user: Models.User;
};

type AuthenticateAdminResult =
  | {
      ok: true;
      adminLabel: string;
      superAdminLabel: string;
      isSuperAdmin: boolean;
      sessionExpiresAt: string;
      sessionSecret: string;
      user: Models.User;
    }
  | {
      ok: false;
      message: string;
    };

function hasAnyAdminLabel(
  user: Models.User,
  adminLabel: string,
  superAdminLabel: string,
) {
  return (
    user.labels.includes(adminLabel) || user.labels.includes(superAdminLabel)
  );
}

function isSuperAdmin(user: Models.User, superAdminLabel: string) {
  return user.labels.includes(superAdminLabel);
}

function isAuthorizedAdmin(
  user: Models.User,
  adminLabel: string,
  superAdminLabel: string,
) {
  return (
    user.status &&
    user.emailVerification &&
    hasAnyAdminLabel(user, adminLabel, superAdminLabel)
  );
}

async function getRequestUserAgent() {
  return (await headers()).get("user-agent") ?? "MazeX Admin";
}

function getExpiredCookieOptions() {
  return {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function getSessionCookieOptions(expiresAt: string) {
  return {
    expires: new Date(expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

async function revokeSession(sessionSecret: string, userAgent?: string) {
  try {
    const sessionAccount = new Account(
      createAppwriteSessionClient(sessionSecret, userAgent),
    );

    await sessionAccount.deleteSession({ sessionId: "current" });
  } catch {
    // Ignore cleanup failures so auth handling can finish gracefully.
  }
}

export async function persistAdminSessionCookie(
  sessionSecret: string,
  expiresAt: string,
) {
  const cookieStore = await cookies();

  cookieStore.set(
    ADMIN_SESSION_COOKIE_NAME,
    sessionSecret,
    getSessionCookieOptions(expiresAt),
  );
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, "", getExpiredCookieOptions());
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AuthenticateAdminResult> {
  let config;

  try {
    config = getAppwriteConfig();
  } catch (error) {
    if (error instanceof AppwriteConfigError) {
      return {
        ok: false,
        message: misconfiguredMessage,
      };
    }

    throw error;
  }

  const userAgent = await getRequestUserAgent();

  try {
    const adminAccount = new Account(createAppwriteAdminClient(userAgent));
    const session = await adminAccount.createEmailPasswordSession({
      email,
      password,
    });

    if (!session.secret) {
      return {
        ok: false,
        message: "Unable to start a valid session for this login.",
      };
    }

    const sessionAccount = new Account(
      createAppwriteSessionClient(session.secret, userAgent),
    );
    const user = await sessionAccount.get();

    if (!isAuthorizedAdmin(user, config.adminLabel, config.superAdminLabel)) {
      await revokeSession(session.secret, userAgent);

      return {
        ok: false,
        message: user.emailVerification
          ? unauthorizedMessage
          : "Verify your email before accessing the admin dashboard.",
      };
    }

    return {
      ok: true,
      adminLabel: config.adminLabel,
      superAdminLabel: config.superAdminLabel,
      isSuperAdmin: isSuperAdmin(user, config.superAdminLabel),
      sessionExpiresAt: session.expire,
      sessionSecret: session.secret,
      user,
    };
  } catch (error) {
    if (error instanceof AppwriteException) {
      if ([401, 403, 404].includes(error.code ?? 0)) {
        return {
          ok: false,
          message: invalidLoginMessage,
        };
      }

      return {
        ok: false,
        message: loginFailedMessage,
      };
    }

    return {
      ok: false,
      message: loginFailedMessage,
    };
  }
}

export async function getCurrentAdmin(): Promise<AuthenticatedAdmin | null> {
  if (!isAppwriteConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionSecret) {
    return null;
  }

  const { adminLabel, superAdminLabel } = getAppwriteConfig();
  const userAgent = await getRequestUserAgent();

  try {
    const sessionAccount = new Account(
      createAppwriteSessionClient(sessionSecret, userAgent),
    );
    const user = await sessionAccount.get();

    if (!isAuthorizedAdmin(user, adminLabel, superAdminLabel)) {
      return null;
    }

    const currentAdminIsSuperAdmin = isSuperAdmin(user, superAdminLabel);

    return {
      adminLabel,
      superAdminLabel,
      isSuperAdmin: currentAdminIsSuperAdmin,
      canManageAdmins: currentAdminIsSuperAdmin,
      canDeleteAdmins: currentAdminIsSuperAdmin,
      user,
    };
  } catch {
    return null;
  }
}

export async function getCurrentAdminPasswordClient() {
  if (!isAppwriteConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionSecret) {
    return null;
  }

  const { adminLabel, superAdminLabel } = getAppwriteConfig();
  const userAgent = await getRequestUserAgent();

  try {
    const sessionAccount = new Account(
      createAppwriteSessionClient(sessionSecret, userAgent),
    );
    const user = await sessionAccount.get();

    if (!isAuthorizedAdmin(user, adminLabel, superAdminLabel)) {
      return null;
    }

    return sessionAccount;
  } catch {
    return null;
  }
}

export async function destroyCurrentAdminSession() {
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const userAgent = await getRequestUserAgent();

  if (sessionSecret && isAppwriteConfigured()) {
    await revokeSession(sessionSecret, userAgent);
  }

  await clearAdminSessionCookie();
}
