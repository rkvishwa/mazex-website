import { AppwriteException } from "node-appwrite";
import { redirect } from "next/navigation";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { listSiteAdmins, type SiteAdminSummary } from "@/lib/admin-users";
import {
  getSharedGoogleSheetsConnection,
  isGoogleSheetsOAuthConfigured,
} from "@/lib/google-sheets";
import { AppwriteConfigError } from "@/lib/appwrite";
import { getGoogleSheetsTransferOnReconnectEnabled } from "@/lib/site-resources";

type SearchParamsValue = string | string[] | undefined;
type GoogleSheetsNoticeStatus = "error" | "warning";

function readQuery(value: SearchParamsValue) {
  return Array.isArray(value) ? value[0] : value;
}

function mapAdminDirectoryError(error: unknown) {
  if (error instanceof AppwriteException) {
    if ([401, 403].includes(error.code ?? 0)) {
      return "The Appwrite API key needs users.read and users.write scopes to load admin accounts.";
    }

    return error.message || "Unable to load the admin account list right now.";
  }

  if (error instanceof AppwriteConfigError) {
    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "Unable to load the admin account list right now.";
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamsValue>>;
}) {
  const params = await searchParams;
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/login?reason=unauthorized");
  }

  const [googleSheetsConnection, googleSheetsTransferOnReconnectEnabled] =
    await Promise.all([
      getSharedGoogleSheetsConnection(),
      getGoogleSheetsTransferOnReconnectEnabled(),
    ]);
  const googleSheetsStatus = readQuery(params.googleSheetsStatus);
  const googleSheetsMessage = readQuery(params.googleSheetsMessage)?.trim() || "";
  const googleSheetsNoticeStatus: GoogleSheetsNoticeStatus | null =
    googleSheetsStatus === "error" || googleSheetsStatus === "warning"
      ? googleSheetsStatus
      : null;
  const googleSheetsNotice: {
    status: GoogleSheetsNoticeStatus;
    message: string;
  } | null =
    googleSheetsNoticeStatus && googleSheetsMessage
      ? {
          status: googleSheetsNoticeStatus,
          message: googleSheetsMessage,
        }
      : null;
  let siteAdmins: SiteAdminSummary[] = [];
  let adminDirectoryNotice: {
    status: "error";
    message: string;
  } | null = null;

  try {
    siteAdmins = await listSiteAdmins();
  } catch (error) {
    adminDirectoryNotice = {
      status: "error",
      message: mapAdminDirectoryError(error),
    };
  }

  return (
    <AdminSettingsForm
      adminDirectoryNotice={adminDirectoryNotice}
      canDeleteAdmins={currentAdmin.canDeleteAdmins}
      canManageAdmins={currentAdmin.canManageAdmins}
      currentAdminUserId={currentAdmin.user.$id}
      googleSheetsConnection={googleSheetsConnection}
      googleSheetsOAuthConfigured={isGoogleSheetsOAuthConfigured()}
      googleSheetsTransferOnReconnectEnabled={
        googleSheetsTransferOnReconnectEnabled
      }
      googleSheetsNotice={googleSheetsNotice}
      siteAdmins={siteAdmins}
    />
  );
}
