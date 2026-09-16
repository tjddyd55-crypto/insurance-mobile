import type { QueryClient } from "@tanstack/react-query";

import { saveCustomerCarsForCustomer } from "./customerCarsSave";
import { saveCustomerCustomFieldsForCustomer } from "./customerCustomFieldsApi";
import { saveCustomerFireInsuranceLocationsForCustomer } from "./customerFireInsuranceLocationsApi";
import type { CustomerFormState } from "./customerForm";
import { saveCustomerSpecialDatesForCustomer } from "./customerSpecialDatesApi";

export type CustomerCreateChildResource =
  | "cars"
  | "fireInsurance"
  | "specialDates"
  | "customFields";

export type CustomerCreateChildSaveFailure = {
  resource: CustomerCreateChildResource;
  message: string;
};

export type CustomerCreateChildSaveResult = {
  failures: CustomerCreateChildSaveFailure[];
};

function toFailureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export async function persistCustomerCreateChildCollections(params: {
  token: string | null;
  customerId: number;
  draft: CustomerFormState;
  queryClient: QueryClient;
}): Promise<CustomerCreateChildSaveResult> {
  const { token, customerId, draft, queryClient } = params;
  const failures: CustomerCreateChildSaveFailure[] = [];

  try {
    await saveCustomerCarsForCustomer({
      token,
      customerId,
      formCars: draft.cars,
    });
  } catch (error) {
    failures.push({
      resource: "cars",
      message: toFailureMessage(error, "자동차 정보를 저장하지 못했습니다."),
    });
  }

  try {
    await saveCustomerFireInsuranceLocationsForCustomer({
      token,
      customerId,
      formItems: draft.fireInsuranceLocations,
    });
  } catch (error) {
    failures.push({
      resource: "fireInsurance",
      message: toFailureMessage(error, "화재보험 정보를 저장하지 못했습니다."),
    });
  }

  try {
    await saveCustomerSpecialDatesForCustomer({
      token,
      customerId,
      formItems: draft.specialDates,
    });
  } catch (error) {
    failures.push({
      resource: "specialDates",
      message: toFailureMessage(error, "알림일을 저장하지 못했습니다."),
    });
  }

  try {
    await saveCustomerCustomFieldsForCustomer({
      token,
      customerId,
      formItems: draft.customFields,
    });
  } catch (error) {
    failures.push({
      resource: "customFields",
      message: toFailureMessage(error, "추가 정보를 저장하지 못했습니다."),
    });
  }

  if (!failures.length) {
    void queryClient.invalidateQueries({ queryKey: ["customer-cars", customerId] });
    void queryClient.invalidateQueries({ queryKey: ["customer-special-dates", customerId] });
    void queryClient.invalidateQueries({ queryKey: ["customer-custom-fields", customerId] });
    void queryClient.invalidateQueries({
      queryKey: ["customer-fire-insurance-locations", customerId],
    });
  }

  return { failures };
}

export function formatCustomerCreateChildSaveMessage(params: {
  customerId: number;
  failures: CustomerCreateChildSaveFailure[];
}): string {
  const { customerId, failures } = params;
  if (!failures.length) {
    return "";
  }

  const summary = failures.map((failure) => failure.message).join("\n");
  if (__DEV__) {
    const debug = failures
      .map((failure) => `[${failure.resource}] ${failure.message}`)
      .join("\n");
    return `고객은 등록되었습니다 (ID: ${customerId}).\n일부 항목 저장에 실패했습니다.\n${summary}\n\nDEV:\n${debug}`;
  }

  return `고객은 등록되었습니다. 일부 항목 저장에 실패했습니다.\n${summary}`;
}
