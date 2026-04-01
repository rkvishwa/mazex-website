import AdminRegistrationsManager from "@/components/admin/AdminRegistrationsManager";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  getGoogleSheetsConnectionForAdmin,
  isGoogleSheetsOAuthConfigured,
} from "@/lib/google-sheets";
import {
  getFormBannerUrl,
  getRegistrationFormBySlug,
  listRegistrationFormCards,
} from "@/lib/registrations";
import { getSiteEventConfigs } from "@/lib/site-events";
import { COMPETITION_SITE_EVENT, WORKSHOP_SITE_EVENTS } from "@/lib/site-event-types";

type SearchParamsValue = string | string[] | undefined;

function readQuery(val: SearchParamsValue) {
  return Array.isArray(val) ? val[0] : val;
}

export default async function AdminFormBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamsValue>>;
}) {
  const params = await searchParams;
  const formCards = await listRegistrationFormCards();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const forms = formCards.map(({ availability, ...form }) => form);
  const currentAdmin = await getCurrentAdmin();

  const slugParam = readQuery(params.form) ?? forms[0]?.slug ?? "";
  const selectedForm = slugParam ? await getRegistrationFormBySlug(slugParam) : null;
  const googleSheetsConnection = currentAdmin
    ? await getGoogleSheetsConnectionForAdmin(currentAdmin.user.$id)
    : null;

  const bannerUrl =
    selectedForm?.bannerFileId ? getFormBannerUrl(selectedForm.bannerFileId) : null;

  let linkedEventTitle: string | null = null;
  if (selectedForm) {
    const siteEventConfigs = await getSiteEventConfigs();
    const competitionConfig = siteEventConfigs[COMPETITION_SITE_EVENT.key] as { formId?: string };
    if (competitionConfig?.formId === selectedForm.id) {
      linkedEventTitle = COMPETITION_SITE_EVENT.title;
    } else {
      for (const event of WORKSHOP_SITE_EVENTS) {
        const config = siteEventConfigs[event.key] as { formId?: string };
        if (config?.formId === selectedForm.id) {
          linkedEventTitle = event.title;
          break;
        }
      }
    }
  }

  return (
    <AdminRegistrationsManager
      forms={forms}
      selectedForm={selectedForm}
      bannerUrl={bannerUrl}
      googleSheetsConnection={googleSheetsConnection}
      googleSheetsOAuthConfigured={isGoogleSheetsOAuthConfigured()}
      linkedEventTitle={linkedEventTitle}
    />
  );
}
