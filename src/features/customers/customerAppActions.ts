/** Customer Workspace 고객앱 compact actions SSOT (UI labels). */
export const CUSTOMER_APP_COMPACT_ACTIONS = ["링크 복사", "알림톡"] as const;

export function listCustomerAppCompactActions(): readonly string[] {
  return CUSTOMER_APP_COMPACT_ACTIONS;
}
