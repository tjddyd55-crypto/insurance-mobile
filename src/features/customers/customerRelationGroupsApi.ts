import { ApiError, apiRequest } from "../../api/client";

export type RelationGroupType = "FAMILY" | "BUSINESS" | "ETC";

export type RelationGroupMember = {
  customerId: number;
  name: string;
  phone: string;
  gender?: "male" | "female" | null;
  birthDate?: string | null;
  relationshipLabel: string;
  isCurrentCustomer: boolean;
  sortOrder?: number;
};

export type CustomerRelationGroup = {
  id: number;
  name: string;
  groupType: RelationGroupType | string;
  memo: string;
  members: RelationGroupMember[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRelationGroupPayload = {
  name: string;
  groupType?: RelationGroupType | string;
  memo?: string;
  members?: { customerId: number; relationshipLabel?: string }[];
};

type Envelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  code?: string;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

function unwrapData<T>(payload: Envelope<T> | T): T {
  if (payload && typeof payload === "object" && "data" in (payload as Envelope<T>)) {
    return (payload as Envelope<T>).data as T;
  }
  return payload as T;
}

function mapMember(raw: Record<string, unknown>): RelationGroupMember {
  return {
    customerId: Number(raw.customerId),
    name: String(raw.name ?? ""),
    phone: String(raw.phone ?? ""),
    gender: (raw.gender as RelationGroupMember["gender"]) ?? null,
    birthDate: raw.birthDate == null ? null : String(raw.birthDate),
    relationshipLabel: String(raw.relationshipLabel ?? ""),
    isCurrentCustomer: Boolean(raw.isCurrentCustomer),
    sortOrder: raw.sortOrder == null ? undefined : Number(raw.sortOrder),
  };
}

function mapGroup(raw: Record<string, unknown>): CustomerRelationGroup {
  const members = Array.isArray(raw.members)
    ? raw.members.map((item) => mapMember(item as Record<string, unknown>))
    : [];
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    groupType: String(raw.groupType ?? "FAMILY"),
    memo: String(raw.memo ?? ""),
    members,
    createdAt: raw.createdAt == null ? undefined : String(raw.createdAt),
    updatedAt: raw.updatedAt == null ? undefined : String(raw.updatedAt),
  };
}

export async function listCustomerRelationGroups(
  token: string | null,
  customerId: number,
): Promise<CustomerRelationGroup[]> {
  const auth = requireToken(token);
  const payload = await apiRequest<Envelope<CustomerRelationGroup[]> | unknown>(
    `/api/customers/${customerId}/relation-groups`,
    { token: auth },
  );
  const data = unwrapData(payload as Envelope<CustomerRelationGroup[]>);
  if (!Array.isArray(data)) return [];
  return data.map((item) => mapGroup(item as unknown as Record<string, unknown>));
}

export async function createCustomerRelationGroup(
  token: string | null,
  customerId: number,
  body: CreateRelationGroupPayload,
): Promise<CustomerRelationGroup> {
  const auth = requireToken(token);
  const payload = await apiRequest<Envelope<CustomerRelationGroup> | unknown>(
    `/api/customers/${customerId}/relation-groups`,
    {
      token: auth,
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return mapGroup(
    unwrapData(payload as Envelope<CustomerRelationGroup>) as unknown as Record<
      string,
      unknown
    >,
  );
}

export async function addCustomerRelationGroupMember(
  token: string | null,
  groupId: number,
  body: { customerId: number; relationshipLabel?: string },
): Promise<void> {
  const auth = requireToken(token);
  await apiRequest(`/api/customer-relation-groups/${groupId}/members`, {
    token: auth,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeCustomerRelationGroupMember(
  token: string | null,
  groupId: number,
  customerId: number,
): Promise<{ groupDeleted?: boolean; remainingMembers?: number }> {
  const auth = requireToken(token);
  const payload = await apiRequest<
    Envelope<{ groupDeleted?: boolean; remainingMembers?: number }> | unknown
  >(`/api/customer-relation-groups/${groupId}/members/${customerId}`, {
    token: auth,
    method: "DELETE",
  });
  return unwrapData(payload as Envelope<{ groupDeleted?: boolean; remainingMembers?: number }>) ?? {};
}

export async function deleteCustomerRelationGroup(
  token: string | null,
  groupId: number,
): Promise<void> {
  const auth = requireToken(token);
  await apiRequest(`/api/customer-relation-groups/${groupId}`, {
    token: auth,
    method: "DELETE",
  });
}
