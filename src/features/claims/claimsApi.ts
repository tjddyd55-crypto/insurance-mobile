import { ApiError, apiRequest, resolveApiUrl } from "../../api/client";
import {
  normalizeCustomerAppAlimtalkResult,
  type CustomerAppAlimtalkResult,
} from "../customers/customerAppShareModel";
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
  try {
    const data = await apiRequest<CustomerAppAlimtalkResult>(
      `/api/agent/customers/${customerId}/customer-app/alimtalk`,
      {
        method: "POST",
        token: auth(token),
        body: JSON.stringify(receiver?.trim() ? { receiver: receiver.trim() } : {}),
      },
    );
    return normalizeCustomerAppAlimtalkResult(data);
  } catch (error) {
    if (error instanceof ApiError && error.data && typeof error.data === "object") {
      const status = String((error.data as { status?: string }).status ?? "").trim();
      if (status === "blocked" || status === "missing_receiver" || status === "failed") {
        return normalizeCustomerAppAlimtalkResult({
          ...(error.data as CustomerAppAlimtalkResult),
          status: status as CustomerAppAlimtalkResult["status"],
        });
      }
    }
    throw error;
  }
}

/**
 * PC `fetchClaimRequestBundleBlob`와 같은 GET.
 * 서명된 절대 downloadUrl은 Railway 뒤에서 http://가 되므로 쓰지 않는다.
 */
export function claimBundleDownloadPath(
  requestId: number,
  customerId: number,
  kind: "pdf" | "zip",
): string {
  const suffix = kind === "zip" ? "files.zip" : "files.pdf";
  const customer = encodeURIComponent(String(customerId));
  return `/api/agent/customer-claim-requests/${requestId}/${suffix}?customerId=${customer}`;
}

export function claimBundleRequest(
  token: string | null,
  requestId: number,
  customerId: number,
  kind: "pdf" | "zip",
): { url: string; headers: { Authorization: string } } {
  return {
    url: resolveApiUrl(claimBundleDownloadPath(requestId, customerId, kind)),
    headers: { Authorization: `Bearer ${auth(token)}` },
  };
}
