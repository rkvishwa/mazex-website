import AdminEventsForm from "@/components/admin/AdminEventsForm";
import { listRegistrationForms } from "@/lib/registrations";
import { getResolvedSiteEvents } from "@/lib/site-events";

export default async function AdminEventsPage() {
  const [forms, siteEvents] = await Promise.all([
    listRegistrationForms({ skipSiteEventAutoSync: true }),
    getResolvedSiteEvents(),
  ]);

  return (
    <AdminEventsForm
      forms={forms.map((form) => ({
        id: form.id,
        title: form.title,
        slug: form.slug,
        status: form.status,
        kind: form.kind,
      }))}
      events={siteEvents.adminItems}
    />
  );
}
