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
  sortOrder?: number;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

function trim(value: string | undefined): string {
  return String(value ?? "").trim();
}

/** Coerce form/record ids so string "14" still PATCH-updates instead of recreate. */
export function resolveFireInsuranceLocationId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) return null;
  return id;
}

function mapLocation(raw: Record<string, unknown>): CustomerFireInsuranceLocationRecord {
  return {
    id: Number(raw.id),
    customerId: Number(raw.customerId ?? raw.customer_id),
    address: String(raw.address ?? ""),
    memo: String(raw.memo ?? ""),
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
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

export function customerFireInsuranceLocationRecordToFormItem(
  record: Pick<CustomerFireInsuranceLocationRecord, "id" | "address" | "memo" | "sortOrder">,
): CustomerFireInsuranceLocationFormItem {
  return {
    id: record.id,
    address: record.address ?? "",
    memo: record.memo ?? "",
    sortOrder: record.sortOrder,
  };
}

export function normalizeFireInsuranceLocationsForSave(
  items: CustomerFireInsuranceLocationFormItem[],
): CustomerFireInsuranceLocationFormItem[] {
  return items
    .map((item) => ({
      id: resolveFireInsuranceLocationId(item.id) ?? undefined,
      address: trim(item.address),
      memo: trim(item.memo),
      sortOrder: item.sortOrder,
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

export type FireInsuranceLocationSyncPlan = {
  toUpdate: Array<{ id: number; payload: CustomerFireInsuranceLocationInput }>;
  toCreate: CustomerFireInsuranceLocationInput[];
  toDelete: number[];
};

/**
 * Pure diff used by save + unit tests.
 * Existing rows with a resolvable id are PATCH/updated; new rows POST; removed ids soft-delete.
 */
export function planFireInsuranceLocationSync(
  formItems: CustomerFireInsuranceLocationFormItem[],
  current: CustomerFireInsuranceLocationRecord[],
): FireInsuranceLocationSyncPlan {
  const norm = normalizeFireInsuranceLocationsForSave(formItems);
  const toUpdate: FireInsuranceLocationSyncPlan["toUpdate"] = [];
  const toCreate: FireInsuranceLocationSyncPlan["toCreate"] = [];
  const matched = new Set<number>();

  if (norm.length === 0) {
    return {
      toUpdate: [],
      toCreate: [],
      toDelete: current.map((row) => row.id),
    };
  }

  const currentById = new Map(current.map((row) => [row.id, row]));

  for (const item of norm) {
    const payload = { address: trim(item.address), memo: trim(item.memo) };
    const id = resolveFireInsuranceLocationId(item.id);
    if (id != null && currentById.has(id)) {
      matched.add(id);
      const rec = currentById.get(id)!;
      if (!recordEqualsForm(rec, item)) {
        toUpdate.push({ id, payload });
      }
      continue;
    }
    toCreate.push(payload);
  }

  const toDelete = current.filter((row) => !matched.has(row.id)).map((row) => row.id);
  return { toUpdate, toCreate, toDelete };
}

export async function saveCustomerFireInsuranceLocationsForCustomer(params: {
  token: string | null;
  customerId: number;
  formItems: CustomerFireInsuranceLocationFormItem[];
}): Promise<void> {
  const auth = requireToken(params.token);
  const current = await listCustomerFireInsuranceLocations(auth, params.customerId);
  const plan = planFireInsuranceLocationSync(params.formItems, current);

  // Update + create first (Web/special-dates parity), then soft-delete removed ids.
  for (const row of plan.toUpdate) {
    await updateCustomerFireInsuranceLocation(auth, params.customerId, row.id, row.payload);
  }
  for (const payload of plan.toCreate) {
    await createCustomerFireInsuranceLocation(auth, params.customerId, payload);
  }
  for (const locationId of plan.toDelete) {
    await deleteCustomerFireInsuranceLocation(auth, params.customerId, locationId);
  }
}
