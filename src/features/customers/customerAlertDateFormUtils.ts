import type { CustomerSpecialDateFormItem } from "./customerSpecialDatesApi";

function trim(value: string | undefined): string {
  return String(value ?? "").trim();
}

export function isCustomerAlertDateEmpty(item: CustomerSpecialDateFormItem): boolean {
  return !trim(item.title) && !trim(item.dateValue) && !trim(item.memo);
}

export function normalizeCustomerAlertDatesForSave(
  items: CustomerSpecialDateFormItem[],
): CustomerSpecialDateFormItem[] {
  return items.filter((item) => !isCustomerAlertDateEmpty(item));
}

export function getCustomerAlertDatesValidationError(
  items: CustomerSpecialDateFormItem[],
): string | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (isCustomerAlertDateEmpty(item)) {
      continue;
    }
    if (!trim(item.title)) {
      return `알림일 ${index + 1}: 알림명을 입력해 주세요.`;
    }
    const dateValue = trim(item.dateValue).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return `알림일 ${index + 1}: 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.`;
    }
  }
  return null;
}
