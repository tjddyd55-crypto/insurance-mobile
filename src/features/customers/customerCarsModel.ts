import type { CustomerCarRecord } from "./customerCarsApi";
import type { CustomerRecord } from "./types";

export type CustomerCarFormItem = {
  id?: number;
  carType: string;
  carNumber: string;
  carModel: string;
  carYear: string;
  renewalDate: string;
  memo: string;
  isPrimary: boolean;
};

export function createEmptyCustomerCar(): CustomerCarFormItem {
  return {
    carType: "",
    carNumber: "",
    carModel: "",
    carYear: "",
    renewalDate: "",
    memo: "",
    isPrimary: false,
  };
}

export function isCustomerCarEmpty(car: CustomerCarFormItem): boolean {
  const text = (value: string) => String(value ?? "").trim();
  return (
    !text(car.carNumber) &&
    !text(car.carModel) &&
    !text(car.carYear) &&
    !text(car.renewalDate) &&
    !text(car.carType) &&
    !text(car.memo)
  );
}

export function normalizeCustomerCarsForSave(
  cars: CustomerCarFormItem[],
): CustomerCarFormItem[] {
  return cars.filter((car) => !isCustomerCarEmpty(car));
}

function ensurePrimary(cars: CustomerCarFormItem[]): CustomerCarFormItem[] {
  if (!cars.length) return [{ ...createEmptyCustomerCar(), isPrimary: true }];
  const hasPrimary = cars.some((car) => car.isPrimary);
  if (hasPrimary) {
    let seen = false;
    return cars.map((car) => {
      if (car.isPrimary) {
        if (seen) return { ...car, isPrimary: false };
        seen = true;
      }
      return car;
    });
  }
  return cars.map((car, index) => ({ ...car, isPrimary: index === 0 }));
}

export function customerCarRecordToFormItem(
  record: CustomerCarRecord,
): CustomerCarFormItem {
  return {
    id: record.id,
    carType: record.carType,
    carNumber: record.carNumber,
    carModel: record.carModel,
    carYear: record.carYear,
    renewalDate: record.renewalDate ? record.renewalDate.slice(0, 10) : "",
    memo: record.memo,
    isPrimary: record.isPrimary,
  };
}

export function customerRecordToCarFormItems(
  customer: CustomerRecord,
): CustomerCarFormItem[] {
  return [
    {
      carType: customer.carType,
      carNumber: customer.carNumber,
      carModel: customer.carModel,
      carYear: customer.carYear,
      renewalDate: customer.renewalDate ? customer.renewalDate.slice(0, 10) : "",
      memo: "",
      isPrimary: true,
    },
  ];
}

export function prepareCustomerCarsForEditor(
  cars: CustomerCarFormItem[],
): CustomerCarFormItem[] {
  return ensurePrimary(cars.length ? cars : [createEmptyCustomerCar()]);
}
