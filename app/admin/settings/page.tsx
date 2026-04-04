import AdminSettingsForm from "@/components/admin/AdminSettingsForm";
import {
  getSharedGoogleSheetsConnection,
  isGoogleSheetsOAuthConfigured,
} from "@/lib/google-sheets";
import { getGoogleSheetsTransferOnReconnectEnabled } from "@/lib/site-resources";

export default async function AdminSettingsPage() {
  const [googleSheetsConnection, googleSheetsTransferOnReconnectEnabled] =
    await Promise.all([
      getSharedGoogleSheetsConnection(),
      getGoogleSheetsTransferOnReconnectEnabled(),
    ]);

  return (
    <AdminSettingsForm
      googleSheetsConnection={googleSheetsConnection}
      googleSheetsOAuthConfigured={isGoogleSheetsOAuthConfigured()}
      googleSheetsTransferOnReconnectEnabled={
        googleSheetsTransferOnReconnectEnabled
      }
    />
  );
}
