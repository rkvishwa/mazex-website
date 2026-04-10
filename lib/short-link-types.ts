export type ShortLinkStatus = "active" | "expired" | "inactive";

export type ShortLinkSummary = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  expiresAt: string | null;
  isActive: boolean;
  status: ShortLinkStatus;
  visitCount: number;
  lastVisitedAt: string | null;
  createdByAdminUserId: string;
  createdAt: string;
  updatedAt: string;
};
