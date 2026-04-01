import { Suspense } from "react";
import AdminRegistrationsOverview from "@/components/admin/AdminRegistrationsOverview";
import { DashboardSkeleton } from "@/components/admin/AdminSkeletons";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminRegistrationsOverview />
    </Suspense>
  );
}
