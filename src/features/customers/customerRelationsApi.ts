import { ApiError, apiRequest } from "../../api/client";

export type CustomerRelationRow = {
  relatedCustomerId: number;
  relatedName: string;
  relatedPhone: string;
  createdAt: string;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

export async function listCustomerRelations(
  token: string | null,
  customerId: number,
): Promise<CustomerRelationRow[]> {
  const auth = requireToken(token);
  const rows = await apiRequest<unknown>(`/api/customers/${customerId}/relations`, {
    token: auth,
  });
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      relatedCustomerId: Number(item.relatedCustomerId),
      relatedName: String(item.relatedName ?? ""),
      relatedPhone: String(item.relatedPhone ?? ""),
      createdAt: String(item.createdAt ?? ""),
    };
  });
}

export async function createCustomerRelation(
  token: string | null,
  customerId: number,
  relatedCustomerId: number,
): Promise<CustomerRelationRow> {
  const auth = requireToken(token);
  const row = await apiRequest<unknown>(`/api/customers/${customerId}/relations`, {
    method: "POST",
    token: auth,
    body: JSON.stringify({ relatedCustomerId }),
  });
  if (!row || typeof row !== "object") {
    throw new ApiError("관계인 연결 응답이 올바르지 않습니다.", 502);
  }
  const item = row as Record<string, unknown>;
  return {
    relatedCustomerId: Number(item.relatedCustomerId),
    relatedName: String(item.relatedName ?? ""),
    relatedPhone: String(item.relatedPhone ?? ""),
    createdAt: String(item.createdAt ?? ""),
  };
}

export async function deleteCustomerRelation(
  token: string | null,
  customerId: number,
  relatedCustomerId: number,
): Promise<void> {
  const auth = requireToken(token);
  await apiRequest<unknown>(
    `/api/customers/${customerId}/relations/${relatedCustomerId}`,
    {
      method: "DELETE",
      token: auth,
    },
  );
}
