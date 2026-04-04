import "server-only";

import { ID, Models, Query, Users } from "node-appwrite";
import { createAppwriteAdminClient, getAppwriteConfig } from "@/lib/appwrite";

export type SiteAdminSummary = {
  id: string;
  email: string | null;
  name: string | null;
  labels: string[];
  status: boolean;
  emailVerification: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

function createUsersService() {
  return new Users(createAppwriteAdminClient());
}

function isSiteAdminUser(
  user: Models.User,
  adminLabel: string,
  superAdminLabel: string,
) {
  return (
    user.labels.includes(adminLabel) || user.labels.includes(superAdminLabel)
  );
}

function mapSiteAdminSummary(
  user: Models.User,
  adminLabel: string,
  superAdminLabel: string,
): SiteAdminSummary {
  return {
    id: user.$id,
    email: user.email?.trim() || null,
    name: user.name?.trim() || null,
    labels: [...user.labels],
    status: user.status,
    emailVerification: user.emailVerification,
    isAdmin: user.labels.includes(adminLabel),
    isSuperAdmin: user.labels.includes(superAdminLabel),
  };
}

function compareAdmins(a: SiteAdminSummary, b: SiteAdminSummary) {
  if (a.isSuperAdmin !== b.isSuperAdmin) {
    return a.isSuperAdmin ? -1 : 1;
  }

  const left = (a.email || a.name || a.id).toLowerCase();
  const right = (b.email || b.name || b.id).toLowerCase();

  return left.localeCompare(right);
}

export async function listSiteAdmins() {
  const { adminLabel, superAdminLabel } = getAppwriteConfig();
  const users = createUsersService();
  const response = await users.list({
    queries: [
      Query.containsAny("labels", [adminLabel, superAdminLabel]),
      Query.limit(100),
    ],
  });

  return response.users
    .filter((user) => isSiteAdminUser(user, adminLabel, superAdminLabel))
    .map((user) => mapSiteAdminSummary(user, adminLabel, superAdminLabel))
    .sort(compareAdmins);
}

export async function createSiteAdmin(params: {
  email: string;
  password: string;
  name?: string;
}) {
  const { adminLabel } = getAppwriteConfig();
  const users = createUsersService();
  const user = await users.create({
    userId: ID.unique(),
    email: params.email,
    password: params.password,
    name: params.name,
  });

  try {
    await users.updateLabels({
      userId: user.$id,
      labels: [adminLabel],
    });

    return await users.updateEmailVerification({
      userId: user.$id,
      emailVerification: true,
    });
  } catch (error) {
    try {
      await users.delete({ userId: user.$id });
    } catch {
      // Best-effort cleanup if role assignment fails after user creation.
    }

    throw error;
  }
}

export async function deleteSiteAdmin(userId: string) {
  return createUsersService().delete({ userId });
}
