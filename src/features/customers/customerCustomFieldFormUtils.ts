import {
  CUSTOMER_CUSTOM_FIELD_LABEL_MAX,
  CUSTOMER_CUSTOM_FIELD_VALUE_MAX,
  type CustomerCustomFieldFormItem,
} from "./customerCustomFieldsApi";

export function createEmptyCustomerCustomField(): CustomerCustomFieldFormItem {
  return {
    label: "",
    value: "",
  };
}

function trim(value: string | undefined): string {
  return String(value ?? "").trim();
}

export function isCustomerCustomFieldEmpty(item: CustomerCustomFieldFormItem): boolean {
  return !trim(item.label) && !trim(item.value);
}

export function getCustomerCustomFieldsValidationError(
  items: CustomerCustomFieldFormItem[],
): string | null {
  for (const item of items) {
    if (isCustomerCustomFieldEmpty(item)) {
      continue;
    }
    if (!trim(item.label) || !trim(item.value)) {
      return "라벨과 내용을 모두 입력해 주세요.";
    }
    if (trim(item.label).length > CUSTOMER_CUSTOM_FIELD_LABEL_MAX) {
      return `라벨은 ${CUSTOMER_CUSTOM_FIELD_LABEL_MAX}자 이하로 입력해 주세요.`;
    }
    if (trim(item.value).length > CUSTOMER_CUSTOM_FIELD_VALUE_MAX) {
      return `내용은 ${CUSTOMER_CUSTOM_FIELD_VALUE_MAX}자 이하로 입력해 주세요.`;
    }
  }
  return null;
}
