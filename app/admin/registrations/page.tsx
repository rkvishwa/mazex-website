import AdminRegistrationSubmissionsPanel from "@/components/admin/AdminRegistrationSubmissionsPanel";
import {
  getRegistrationFormBySlug,
  getRegistrationSubmissionById,
  listRegistrationFormCards,
  listRegistrationForms,
  listRegistrationSubmissions,
} from "@/lib/registrations";

type SearchParamsValue = string | string[] | undefined;

function readQuery(val: SearchParamsValue) {
  return Array.isArray(val) ? val[0] : val;
}

function readQueryList(val: SearchParamsValue) {
  const values = Array.isArray(val) ? val : typeof val === "string" ? [val] : [];

  return Array.from(
    new Set(
      values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamsValue>>;
}) {
  const params = await searchParams;
  const formCards = await listRegistrationFormCards();
  const forms = formCards;
  const mode = readQuery(params.mode) === "common" ? "common" : "single";
  const commonFormSlugs = readQueryList(params.commonForms);

  if (forms.length === 0) {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          No registration forms yet.
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Go to Form Builder to create your first form.
        </p>
      </div>
    );
  }

  const fallbackForm = await getRegistrationFormBySlug(forms[0].slug);

  if (!fallbackForm) {
    const fallbackForms = await listRegistrationForms();

    return (
      <AdminRegistrationSubmissionsPanel
        forms={fallbackForms}
        contextForms={[]}
        form={null}
        submissionPage={{
          submissions: [],
          total: 0,
          page: 1,
          pageSize: 15,
        }}
        selectedSubmission={null}
      />
    );
  }

  const slugParam = readQuery(params.form) ?? fallbackForm.slug;
  const selectedForm = slugParam ? await getRegistrationFormBySlug(slugParam) : fallbackForm;

  const from = readQuery(params.from) ?? "";
  const to = readQuery(params.to) ?? "";
  const page = Number(readQuery(params.page) ?? "1");
  const submissionId = readQuery(params.submission) ?? "";
  const pageSizeParam = readQuery(params.pageSize);
  const pageSize = pageSizeParam === "all" ? "all" : Number(pageSizeParam ?? "15");
  const searchField = mode === "common" ? "" : readQuery(params.searchField) ?? "";
  const searchQuery = readQuery(params.searchQuery) ?? "";
  const commonForms = (
    await Promise.all(commonFormSlugs.map((slug) => getRegistrationFormBySlug(slug)))
  ).filter((form): form is NonNullable<typeof form> => form !== null);
  const activeForm = mode === "common" ? commonForms[0] ?? selectedForm ?? fallbackForm : selectedForm ?? fallbackForm;
  const contextForms =
    mode === "common"
      ? commonForms.length > 0
        ? commonForms
        : [activeForm]
      : activeForm
      ? [activeForm]
      : [];

  const [submissionPage] = await Promise.all([
    listRegistrationSubmissions({
      formId: mode === "common" ? undefined : activeForm.id,
      commonFormIds: mode === "common" ? commonForms.map((form) => form.id) : null,
      from,
      to,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: pageSize === "all" ? "all" : (Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 15),
      searchField,
      searchQuery,
    })
  ]);

  let selectedSubmission = submissionId
    ? submissionPage.submissions.find(s => s.id === submissionId) || null
    : null;

  if (submissionId && !selectedSubmission) {
    selectedSubmission = await getRegistrationSubmissionById(submissionId);
  }

  const allowedFormIds = new Set(contextForms.map((form) => form.id));
  const safeSelectedSubmission =
    selectedSubmission && allowedFormIds.has(selectedSubmission.formId)
      ? selectedSubmission
      : null;

  return (
    <AdminRegistrationSubmissionsPanel
      forms={forms}
      contextForms={contextForms}
      form={activeForm}
      submissionPage={submissionPage}
      selectedSubmission={safeSelectedSubmission}
      from={from}
      to={to}
      pageSize={pageSize}
      searchField={searchField}
      searchQuery={searchQuery}
      mode={mode}
      commonFormSlugs={commonForms.map((form) => form.slug)}
    />
  );
}
