import { ApiError, apiRequest } from "../../api/client";

export const CUSTOMER_CUSTOM_FIELD_LABEL_MAX = 100;
export const CUSTOMER_CUSTOM_FIELD_VALUE_MAX = 1000;

export type CustomerCustomFieldRecord = {
  id: number;
  customerId: number;
  label: string;
  value: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerCustomFieldInput = {
  label: string;
  value: string;
  sortOrder?: number;
};

export type CustomerCustomFieldFormItem = {
  id?: number;
  label: string;
  value: string;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

function mapCustomField(raw: Record<string, unknown>): CustomerCustomFieldRecord {
  return {
    id: Number(raw.id),
    customerId: Number(raw.customerId),
    label: String(raw.label ?? ""),
    value: String(raw.value ?? ""),
    sortOrder: Number(raw.sortOrder ?? 0),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function listCustomerCustomFields(
  token: string | null,
  customerId: number,
): Promise<CustomerCustomFieldRecord[]> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(`/api/customers/${customerId}/custom-fields`, {
    token: auth,
  });
  if (!raw || typeof raw !== "object") return [];
  const customFields = (raw as { customFields?: unknown }).customFields;
  if (!Array.isArray(customFields)) return [];
  return customFields.map((row) => mapCustomField(row as Record<string, unknown>));
}

export async function createCustomerCustomField(
  token: string | null,
  customerId: number,
  payload: CustomerCustomFieldInput,
): Promise<CustomerCustomFieldRecord> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(`/api/customers/${customerId}/custom-fields`, {
    method: "POST",
    token: auth,
    body: JSON.stringify(payload),
  });
  if (!raw || typeof raw !== "object") {
    throw new ApiError("추가 정보 등록 응답이 올바르지 않습니다.", 502);
  }
  return mapCustomField(raw as Record<string, unknown>);
}

export async function updateCustomerCustomField(
  token: string | null,
  customerId: number,
  customFieldId: number,
  payload: Partial<CustomerCustomFieldInput>,
): Promise<CustomerCustomFieldRecord> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/custom-fields/${customFieldId}`,
    {
      method: "PATCH",
      token: auth,
      body: JSON.stringify(payload),
    },
  );
  if (!raw || typeof raw !== "object") {
    throw new ApiError("추가 정보 수정 응답이 올바르지 않습니다.", 502);
  }
  return mapCustomField(raw as Record<string, unknown>);
}

export async function deleteCustomerCustomField(
  token: string | null,
  customerId: number,
  customFieldId: number,
): Promise<void> {
  const auth = requireToken(token);
  await apiRequest<unknown>(`/api/customers/${customerId}/custom-fields/${customFieldId}`, {
    method: "DELETE",
    token: auth,
  });
}

function trim(value: string | undefined): string {
  return String(value ?? "").trim();
}

export async function saveCustomerCustomFieldsForCustomer(params: {
  token: string | null;
  customerId: number;
  formItems: CustomerCustomFieldFormItem[];
}): Promise<void> {
  const { token, customerId, formItems } = params;
  const norm = formItems
    .map((item) => ({
      ...item,
      label: trim(item.label).slice(0, CUSTOMER_CUSTOM_FIELD_LABEL_MAX),
      value: trim(item.value).slice(0, CUSTOMER_CUSTOM_FIELD_VALUE_MAX),
    }))
    .filter((item) => item.label || item.value)
    .map((item, index) => ({ ...item, sortOrder: index }));

  const current = await listCustomerCustomFields(token, customerId);

  if (norm.length === 0) {
    for (const row of current) {
      await deleteCustomerCustomField(token, customerId, row.id);
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
      await deleteCustomerCustomField(token, customerId, row.id);
    }
  }

  const afterDelete = await listCustomerCustomFields(token, customerId);
  const freshById = new Map(afterDelete.map((row) => [row.id, row]));

  for (const item of norm) {
    const payload: CustomerCustomFieldInput = {
      label: item.label,
      value: item.value,
      sortOrder: item.sortOrder,
    };
    if (item.id != null && freshById.has(item.id)) {
      const rec = freshById.get(item.id)!;
      if (
        rec.label !== item.label ||
        rec.value !== item.value ||
        rec.sortOrder !== item.sortOrder
      ) {
        await updateCustomerCustomField(token, customerId, item.id, payload);
      }
      continue;
    }
    await createCustomerCustomField(token, customerId, payload);
  }
}
