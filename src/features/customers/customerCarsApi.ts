import { ApiError, apiRequest } from "../../api/client";

export type CustomerCarRecord = {
  id: number;
  customerId: number;
  carType: string;
  carNumber: string;
  carModel: string;
  carYear: string;
  renewalDate: string | null;
  memo: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerCarInput = {
  carType?: string;
  carNumber: string;
  carModel: string;
  carYear: string;
  renewalDate: string;
  memo?: string;
  isPrimary?: boolean;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

function mapCar(raw: Record<string, unknown>): CustomerCarRecord {
  return {
    id: Number(raw.id),
    customerId: Number(raw.customerId),
    carType: String(raw.carType ?? ""),
    carNumber: String(raw.carNumber ?? ""),
    carModel: String(raw.carModel ?? ""),
    carYear: String(raw.carYear ?? ""),
    renewalDate:
      raw.renewalDate == null || raw.renewalDate === ""
        ? null
        : String(raw.renewalDate),
    memo: String(raw.memo ?? ""),
    isPrimary: raw.isPrimary === true,
    sortOrder: Number(raw.sortOrder ?? 0),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function listCustomerCars(
  token: string | null,
  customerId: number,
): Promise<CustomerCarRecord[]> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(`/api/customers/${customerId}/cars`, {
    token: auth,
  });
  if (!raw || typeof raw !== "object") return [];
  const cars = (raw as { cars?: unknown }).cars;
  if (!Array.isArray(cars)) return [];
  return cars.map((row) => mapCar(row as Record<string, unknown>));
}

export async function createCustomerCar(
  token: string | null,
  customerId: number,
  payload: CustomerCarInput,
): Promise<CustomerCarRecord> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(`/api/customers/${customerId}/cars`, {
    method: "POST",
    token: auth,
    body: JSON.stringify(payload),
  });
  if (!raw || typeof raw !== "object") {
    throw new ApiError("자동차 등록 응답이 올바르지 않습니다.", 502);
  }
  return mapCar(raw as Record<string, unknown>);
}

export async function updateCustomerCar(
  token: string | null,
  customerId: number,
  carId: number,
  payload: Partial<CustomerCarInput>,
): Promise<CustomerCarRecord> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/cars/${carId}`,
    {
      method: "PATCH",
      token: auth,
      body: JSON.stringify(payload),
    },
  );
  if (!raw || typeof raw !== "object") {
    throw new ApiError("자동차 수정 응답이 올바르지 않습니다.", 502);
  }
  return mapCar(raw as Record<string, unknown>);
}

export async function deleteCustomerCar(
  token: string | null,
  customerId: number,
  carId: number,
): Promise<void> {
  const auth = requireToken(token);
  await apiRequest<unknown>(`/api/customers/${customerId}/cars/${carId}`, {
    method: "DELETE",
    token: auth,
  });
}
