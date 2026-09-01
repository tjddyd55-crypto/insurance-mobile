import { ApiError, apiRequest } from "../../api/client";

export const CUSTOMER_SPECIAL_DATE_PURPOSE_TYPES = [
  "CELEBRATION",
  "THANKS",
  "NOTICE",
  "CHECKUP",
] as const;

export type CustomerSpecialDatePurposeType =
  (typeof CUSTOMER_SPECIAL_DATE_PURPOSE_TYPES)[number];

export type CustomerSpecialDateRecord = {
  id: number;
  customerId: number;
  purposeType: CustomerSpecialDatePurposeType;
  title: string;
  dateValue: string;
  memo: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerSpecialDateInput = {
  purposeType: CustomerSpecialDatePurposeType;
  title: string;
  dateValue: string;
  memo?: string;
};

export type CustomerSpecialDateFormItem = {
  id?: number;
  purposeType: CustomerSpecialDatePurposeType;
  title: string;
  dateValue: string;
  memo: string;
};

export const CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS: Record<
  CustomerSpecialDatePurposeType,
  string
> = {
  CELEBRATION: "기념",
  THANKS: "감사",
  NOTICE: "안내",
  CHECKUP: "점검",
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

function mapSpecialDate(raw: Record<string, unknown>): CustomerSpecialDateRecord {
  const purpose = String(raw.purposeType ?? "CELEBRATION")
    .trim()
    .toUpperCase() as CustomerSpecialDatePurposeType;
  return {
    id: Number(raw.id),
    customerId: Number(raw.customerId),
    purposeType: purpose,
    title: String(raw.title ?? ""),
    dateValue:
      raw.dateValue == null || raw.dateValue === ""
        ? ""
        : String(raw.dateValue).slice(0, 10),
    memo: String(raw.memo ?? ""),
    sortOrder: Number(raw.sortOrder ?? 0),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function listCustomerSpecialDates(
  token: string | null,
  customerId: number,
): Promise<CustomerSpecialDateRecord[]> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/special-dates`,
    { token: auth },
  );
  if (!raw || typeof raw !== "object") return [];
  const specialDates = (raw as { specialDates?: unknown }).specialDates;
  if (!Array.isArray(specialDates)) return [];
  return specialDates.map((row) =>
    mapSpecialDate(row as Record<string, unknown>),
  );
}

export async function createCustomerSpecialDate(
  token: string | null,
  customerId: number,
  payload: CustomerSpecialDateInput,
): Promise<CustomerSpecialDateRecord> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/special-dates`,
    {
      method: "POST",
      token: auth,
      body: JSON.stringify(payload),
    },
  );
  if (!raw || typeof raw !== "object") {
    throw new ApiError("기념일 등록 응답이 올바르지 않습니다.", 502);
  }
  return mapSpecialDate(raw as Record<string, unknown>);
}

export async function updateCustomerSpecialDate(
  token: string | null,
  customerId: number,
  specialDateId: number,
  payload: Partial<CustomerSpecialDateInput>,
): Promise<CustomerSpecialDateRecord> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/special-dates/${specialDateId}`,
    {
      method: "PATCH",
      token: auth,
      body: JSON.stringify(payload),
    },
  );
  if (!raw || typeof raw !== "object") {
    throw new ApiError("기념일 수정 응답이 올바르지 않습니다.", 502);
  }
  return mapSpecialDate(raw as Record<string, unknown>);
}

export async function deleteCustomerSpecialDate(
  token: string | null,
  customerId: number,
  specialDateId: number,
): Promise<void> {
  const auth = requireToken(token);
  await apiRequest<unknown>(
    `/api/customers/${customerId}/special-dates/${specialDateId}`,
    {
      method: "DELETE",
      token: auth,
    },
  );
}

export async function saveCustomerSpecialDatesForCustomer(params: {
  token: string | null;
  customerId: number;
  formItems: CustomerSpecialDateFormItem[];
}): Promise<void> {
  const { token, customerId, formItems } = params;
  const current = await listCustomerSpecialDates(token, customerId);
  const next = formItems.filter(
    (item) => item.title.trim() || item.dateValue.trim(),
  );
  const matched = new Set<number>();

  for (const item of next) {
    const payload: CustomerSpecialDateInput = {
      purposeType: item.purposeType,
      title: item.title.trim(),
      dateValue: item.dateValue.trim(),
      memo: item.memo.trim() || undefined,
    };
    if (item.id) {
      const existing = current.find((row) => row.id === item.id);
      if (existing) {
        await updateCustomerSpecialDate(token, customerId, item.id, payload);
        matched.add(item.id);
        continue;
      }
    }
    const created = await createCustomerSpecialDate(
      token,
      customerId,
      payload,
    );
    matched.add(created.id);
  }

  for (const row of current) {
    if (!matched.has(row.id)) {
      await deleteCustomerSpecialDate(token, customerId, row.id);
    }
  }
}
