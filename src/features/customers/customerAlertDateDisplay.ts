import {
  CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS,
  type CustomerSpecialDatePurposeType,
  type CustomerSpecialDateRecord,
} from "./customerSpecialDatesApi";

/** Default purpose for new alert dates — legacy-compatible, hidden in UI. */
export const DEFAULT_ALERT_DATE_PURPOSE: CustomerSpecialDatePurposeType = "NOTICE";

/** User-facing label for a stored special date row. */
export function formatCustomerAlertDateLabel(
  item: Pick<CustomerSpecialDateRecord, "title" | "purposeType">,
): string {
  const title = String(item.title ?? "").trim();
  if (title) return title;
  const purpose = item.purposeType;
  if (purpose && CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS[purpose]) {
    return CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS[purpose];
  }
  return "알림일";
}
