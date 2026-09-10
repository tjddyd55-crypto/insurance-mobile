import { ApiError, apiRequest } from "../../api/client";

export type CustomerFireInsuranceLocationRecord = {
  id: number;
  customerId: number;
  address: string;
  memo: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFireInsuranceLocationInput = {
  address: string;
  memo?: string;
};

export type CustomerFireInsuranceLocationFormItem = {
  id?: number;
  address: string;
  memo: string;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

function trim(value: string | undefined): string {
  return String(value ?? "").trim();
}

function mapLocation(raw: Record<string, unknown>): CustomerFireInsuranceLocationRecord {
  return {
    id: Number(raw.id),
    customerId: Number(raw.customerId),
    address: String(raw.address ?? ""),
    memo: String(raw.memo ?? ""),
    sortOrder: Number(raw.sortOrder ?? 0),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export function createEmptyFireInsuranceLocation(): CustomerFireInsuranceLocationFormItem {
  return { address: "", memo: "" };
}

export function ensureFireInsuranceLocationFormItems(
  items: CustomerFireInsuranceLocationFormItem[],
): CustomerFireInsuranceLocationFormItem[] {
  return items.length > 0 ? items : [createEmptyFireInsuranceLocation()];
}

function normalizeForSave(
  items: CustomerFireInsuranceLocationFormItem[],
): CustomerFireInsuranceLocationFormItem[] {
  return items
    .map((item) => ({
      id: item.id,
      address: trim(item.address),
      memo: trim(item.memo),
    }))
    .filter((item) => item.address || item.memo);
}

export async function listCustomerFireInsuranceLocations(
  token: string | null,
  customerId: number,
): Promise<CustomerFireInsuranceLocationRecord[]> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/fire-insurance-locations`,
    { token: auth },
  );
  if (!raw || typeof raw !== "object") return [];
  const locations = (raw as { fireInsuranceLocations?: unknown }).fireInsuranceLocations;
  if (!Array.isArray(locations)) return [];
  return locations.map((row) => mapLocation(row as Record<string, unknown>));
}

async function createCustomerFireInsuranceLocation(
  token: string,
  customerId: number,
  payload: CustomerFireInsuranceLocationInput,
): Promise<CustomerFireInsuranceLocationRecord> {
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/fire-insurance-locations`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
  if (!raw || typeof raw !== "object") {
    throw new ApiError("화재보험 소재지 등록 응답이 올바르지 않습니다.", 502);
  }
  return mapLocation(raw as Record<string, unknown>);
}

async function updateCustomerFireInsuranceLocation(
  token: string,
  customerId: number,
  locationId: number,
  payload: CustomerFireInsuranceLocationInput,
): Promise<CustomerFireInsuranceLocationRecord> {
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/fire-insurance-locations/${locationId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
  if (!raw || typeof raw !== "object") {
    throw new ApiError("화재보험 소재지 수정 응답이 올바르지 않습니다.", 502);
  }
  return mapLocation(raw as Record<string, unknown>);
}

async function deleteCustomerFireInsuranceLocation(
  token: string,
  customerId: number,
  locationId: number,
): Promise<void> {
  await apiRequest(`/api/customers/${customerId}/fire-insurance-locations/${locationId}`, {
    method: "DELETE",
    token,
  });
}

function recordEqualsForm(
  rec: CustomerFireInsuranceLocationRecord,
  item: CustomerFireInsuranceLocationFormItem,
): boolean {
  return trim(rec.address) === trim(item.address) && trim(rec.memo) === trim(item.memo);
}

export async function saveCustomerFireInsuranceLocationsForCustomer(params: {
  token: string | null;
  customerId: number;
  formItems: CustomerFireInsuranceLocationFormItem[];
}): Promise<void> {
  const auth = requireToken(params.token);
  const norm = normalizeForSave(params.formItems);
  const current = await listCustomerFireInsuranceLocations(auth, params.customerId);

  if (norm.length === 0) {
    for (const row of current) {
      await deleteCustomerFireInsuranceLocation(auth, params.customerId, row.id);
    }
    return;
  }

  const formIds = new Set(
    norm
      .map((item) => item.id)
      .filter((id): id is number => id != null && Number.isInteger(id) && id > 0),
  );

  for (const row of current) {
    if (!formIds.has(row.id)) {
      await deleteCustomerFireInsuranceLocation(auth, params.customerId, row.id);
    }
  }

  const afterDelete = await listCustomerFireInsuranceLocations(auth, params.customerId);
  const freshById = new Map(afterDelete.map((row) => [row.id, row]));

  for (const item of norm) {
    const payload = { address: trim(item.address), memo: trim(item.memo) };
    if (item.id != null && freshById.has(item.id)) {
      const rec = freshById.get(item.id)!;
      if (!recordEqualsForm(rec, item)) {
        await updateCustomerFireInsuranceLocation(auth, params.customerId, item.id, payload);
      }
      continue;
    }
    await createCustomerFireInsuranceLocation(auth, params.customerId, payload);
  }
}
