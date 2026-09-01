import {
  createCustomerCar,
  deleteCustomerCar,
  listCustomerCars,
  updateCustomerCar,
  type CustomerCarInput,
  type CustomerCarRecord,
} from "./customerCarsApi";
import {
  customerCarRecordToFormItem,
  isCustomerCarEmpty,
  normalizeCustomerCarsForSave,
  type CustomerCarFormItem,
} from "./customerCarsModel";

function trim(value: string | undefined): string {
  return String(value ?? "").trim();
}

function formItemToInput(
  car: CustomerCarFormItem,
  isPrimary: boolean,
): CustomerCarInput {
  return {
    carType: trim(car.carType),
    carNumber: trim(car.carNumber),
    carModel: trim(car.carModel),
    carYear: trim(car.carYear),
    renewalDate: trim(car.renewalDate),
    memo: trim(car.memo),
    isPrimary,
  };
}

function recordEqualsForm(
  record: CustomerCarRecord,
  car: CustomerCarFormItem,
  isPrimary: boolean,
): boolean {
  const renewal = record.renewalDate ? record.renewalDate.slice(0, 10) : "";
  return (
    trim(record.carType) === trim(car.carType) &&
    trim(record.carNumber) === trim(car.carNumber) &&
    trim(record.carModel) === trim(car.carModel) &&
    trim(record.carYear) === trim(car.carYear) &&
    renewal === trim(car.renewalDate) &&
    trim(record.memo) === trim(car.memo) &&
    record.isPrimary === isPrimary
  );
}

function primaryFormIndex(cars: CustomerCarFormItem[]): number {
  const marked = cars.findIndex((car) => car.isPrimary);
  if (marked >= 0) return marked;
  const first = cars.findIndex((car) => !isCustomerCarEmpty(car));
  return first >= 0 ? first : 0;
}

export async function saveCustomerCarsForCustomer(params: {
  token: string | null;
  customerId: number;
  formCars: CustomerCarFormItem[];
}): Promise<void> {
  const { token, customerId, formCars } = params;
  const normalized = normalizeCustomerCarsForSave(formCars);
  const current = await listCustomerCars(token, customerId);
  const primaryIndex = primaryFormIndex(normalized);

  if (!normalized.length) {
    for (const record of current) {
      await deleteCustomerCar(token, customerId, record.id);
    }
    return;
  }

  const matched = new Set<number>();

  for (let index = 0; index < normalized.length; index += 1) {
    const car = normalized[index];
    const isPrimary = index === primaryIndex;
    const existing = current.find(
      (record) =>
        !matched.has(record.id) && recordEqualsForm(record, car, isPrimary),
    );
    if (existing) {
      matched.add(existing.id);
      continue;
    }
    const byId = car.id
      ? current.find((record) => record.id === car.id)
      : undefined;
    if (byId && !matched.has(byId.id)) {
      await updateCustomerCar(
        token,
        customerId,
        byId.id,
        formItemToInput(car, isPrimary),
      );
      matched.add(byId.id);
      continue;
    }
    const created = await createCustomerCar(
      token,
      customerId,
      formItemToInput(car, isPrimary),
    );
    matched.add(created.id);
  }

  for (const record of current) {
    if (!matched.has(record.id)) {
      await deleteCustomerCar(token, customerId, record.id);
    }
  }
}

export async function loadCustomerCarFormItems(
  token: string | null,
  customerId: number,
  fallback: CustomerCarFormItem[],
): Promise<CustomerCarFormItem[]> {
  const rows = await listCustomerCars(token, customerId);
  if (!rows.length) return fallback;
  return rows.map(customerCarRecordToFormItem);
}
