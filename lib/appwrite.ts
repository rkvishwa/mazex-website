import "server-only";

import { Client } from "node-appwrite";

export const ADMIN_SESSION_COOKIE_NAME = "mazex_admin_session";

export class AppwriteConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppwriteConfigError";
  }
}

export type AppwriteConfig = {
  endpoint: string;
  projectId: string;
  apiKey: string;
  adminLabel: string;
  superAdminLabel: string;
};

export function getAdminLabel() {
  return process.env.APPWRITE_ADMIN_LABEL?.trim() || "admin";
}

export function getSuperAdminLabel() {
  return process.env.APPWRITE_SUPER_ADMIN_LABEL?.trim() || "superadmin";
}

function normalizeEndpoint(endpoint: string) {
  const trimmedEndpoint = endpoint.trim().replace(/\/+$/, "");

  if (trimmedEndpoint.endsWith("/v1")) {
    return trimmedEndpoint;
  }

  return `${trimmedEndpoint}/v1`;
}

export function getAppwriteConfig(): AppwriteConfig {
  const endpoint = process.env.APPWRITE_ENDPOINT?.trim();
  const projectId = process.env.APPWRITE_PROJECT_ID?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();

  const missingVariables = [
    !endpoint && "APPWRITE_ENDPOINT",
    !projectId && "APPWRITE_PROJECT_ID",
    !apiKey && "APPWRITE_API_KEY",
  ].filter(Boolean) as string[];

  if (missingVariables.length > 0) {
    throw new AppwriteConfigError(
      `Missing required Appwrite environment variables: ${missingVariables.join(", ")}`,
    );
  }

  return {
    endpoint: normalizeEndpoint(endpoint!),
    projectId: projectId!,
    apiKey: apiKey!,
    adminLabel: getAdminLabel(),
    superAdminLabel: getSuperAdminLabel(),
  };
}

export function isAppwriteConfigured() {
  try {
    getAppwriteConfig();
    return true;
  } catch {
    return false;
  }
}

function createBaseClient(config: AppwriteConfig, userAgent?: string) {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

  if (userAgent) {
    client.setForwardedUserAgent(userAgent);
  }

  return client;
}

export function createAppwriteAdminClient(userAgent?: string) {
  const config = getAppwriteConfig();

  return createBaseClient(config, userAgent).setKey(config.apiKey);
}

export function createAppwriteSessionClient(
  sessionSecret: string,
  userAgent?: string,
) {
  const config = getAppwriteConfig();

  return createBaseClient(config, userAgent).setSession(sessionSecret);
}
