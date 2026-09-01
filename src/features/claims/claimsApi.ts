import { ApiError, apiRequest } from "../../api/client";
import type {
  ClaimDetail,
  ClaimListItem,
  ClaimStatus,
  CustomerAppLink,
} from "./types";
function auth(token: string | null): string {
  if (!token?.trim()) throw new ApiError("로그인이 필요합니다.", 401);
  return token.trim();
}
export async function listClaims(
  token: string | null,
  params: { status?: ClaimStatus | ""; customerId?: number | null } = {},
) {
  const q = new URLSearchParams({ page: "1", pageSize: "100" });
  if (params.status) q.set("status", params.status);
  if (params.customerId) q.set("customerId", String(params.customerId));
  return apiRequest<{
    rows: ClaimListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/agent/customer-claim-requests?${q}`, { token: auth(token) });
}
export async function getClaim(token: string | null, id: number) {
  return apiRequest<ClaimDetail>(`/api/agent/customer-claim-requests/${id}`, {
    token: auth(token),
  });
}
export async function updateClaimStatus(
  token: string | null,
  id: number,
  status: ClaimStatus,
  memo: string,
) {
  return apiRequest(`/api/agent/customer-claim-requests/${id}/status`, {
    method: "PATCH",
    token: auth(token),
    body: JSON.stringify({ status, memo }),
  });
}
export async function getCustomerAppLink(
  token: string | null,
  customerId: number,
) {
  return apiRequest<CustomerAppLink | null>(
    `/api/agent/customers/${customerId}/customer-app-link`,
    { token: auth(token) },
  );
}
export async function createCustomerAppLink(
  token: string | null,
  customerId: number,
) {
  return apiRequest<CustomerAppLink>("/api/agent/customer-app-links", {
    method: "POST",
    token: auth(token),
    body: JSON.stringify({ customerId }),
  });
}
export async function sendCustomerAppAlimtalk(
  token: string | null,
  customerId: number,
  receiver?: string,
) {
  return apiRequest<{
    status: string;
    receiverMasked?: string;
    providerMessage?: string;
  }>(`/api/agent/customers/${customerId}/customer-app/alimtalk`, {
    method: "POST",
    token: auth(token),
    body: JSON.stringify(receiver?.trim() ? { receiver: receiver.trim() } : {}),
  });
}

export async function getClaimBundleDownloadUrl(
  token: string | null,
  requestId: number,
  customerId: number,
  kind: "pdf" | "zip",
): Promise<string> {
  const result = await apiRequest<{ downloadUrl: string }>(
    `/api/agent/customer-claim-requests/${requestId}/bundle-download-url`,
    {
      method: "POST",
      token: auth(token),
      body: JSON.stringify({ customerId, kind }),
    },
  );
  const url = String(result.downloadUrl ?? "").trim();
  if (!url) throw new ApiError("다운로드 URL을 받지 못했습니다.", 502);
  return url;
}
