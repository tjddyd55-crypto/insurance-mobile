import type { Href } from "expo-router";

export type CustomerWorkspaceActionId =
  | "map"
  | "files"
  | "consultations"
  | "applications"
  | "gaData"
  | "personalMessage"
  | "claims"
  | "memos"
  | "copy"
  | "premiumPayments";

export type CustomerWorkspaceAction = {
  id: CustomerWorkspaceActionId;
  label: string;
  accessibilityLabel: string;
};

/** Native 고객 상세에서 숨기는 action (route/handler는 유지). */
export const CUSTOMER_WORKSPACE_ACTIONS_HIDDEN_ON_MOBILE: CustomerWorkspaceActionId[] = [
  "map",
  "premiumPayments",
];

type CustomerWorkspaceActionTemplate = {
  id: CustomerWorkspaceActionId;
  label: string;
  accessibilitySuffix: string;
};

const CUSTOMER_WORKSPACE_ACTION_TEMPLATES: CustomerWorkspaceActionTemplate[] = [
  { id: "map", label: "지도에서 보기", accessibilitySuffix: "지도에서 보기" },
  { id: "files", label: "고객 파일", accessibilitySuffix: "고객 파일" },
  { id: "consultations", label: "상담 내역", accessibilitySuffix: "상담 내역" },
  { id: "applications", label: "신청서", accessibilitySuffix: "신청서" },
  { id: "gaData", label: "GA 데이터 보기", accessibilitySuffix: "GA 데이터 보기" },
  { id: "personalMessage", label: "개인메시지", accessibilitySuffix: "개인메시지" },
  { id: "claims", label: "청구", accessibilitySuffix: "청구" },
  { id: "memos", label: "메모", accessibilitySuffix: "메모" },
  { id: "copy", label: "복사", accessibilitySuffix: "정보 복사" },
  { id: "premiumPayments", label: "카드 수납", accessibilitySuffix: "카드 수납" },
];

function buildAction(
  customerName: string,
  template: CustomerWorkspaceActionTemplate,
): CustomerWorkspaceAction {
  return {
    id: template.id,
    label: template.label,
    accessibilityLabel: `${customerName} 고객 ${template.accessibilitySuffix}`,
  };
}

export function buildCustomerWorkspaceActions(
  customerName: string,
  options?: { includeMobileHidden?: boolean },
): CustomerWorkspaceAction[] {
  const includeMobileHidden = options?.includeMobileHidden ?? false;
  const hidden = new Set(
    includeMobileHidden ? [] : CUSTOMER_WORKSPACE_ACTIONS_HIDDEN_ON_MOBILE,
  );

  return CUSTOMER_WORKSPACE_ACTION_TEMPLATES.filter((template) => !hidden.has(template.id)).map(
    (template) => buildAction(customerName, template),
  );
}

export function resolveCustomerWorkspaceActionHref(
  customerId: number,
  actionId: CustomerWorkspaceActionId,
): Href | null {
  switch (actionId) {
    case "map":
      return {
        pathname: "/customers/[customerId]/map",
        params: { customerId: String(customerId) },
      };
    case "files":
      return `/customers/${customerId}/files`;
    case "consultations":
      return `/customers/${customerId}/consultations`;
    case "applications":
      return {
        pathname: "/customers/[customerId]/application-documents",
        params: { customerId: String(customerId) },
      };
    case "personalMessage":
      return {
        pathname: "/customers/[customerId]/news",
        params: { customerId: String(customerId) },
      };
    case "claims":
      return {
        pathname: "/customers/[customerId]/claim-requests",
        params: { customerId: String(customerId) },
      };
    case "memos":
      return `/customers/${customerId}/memos`;
    case "premiumPayments":
      return {
        pathname: "/customers/[customerId]/premium-payments",
        params: { customerId: String(customerId) },
      };
    case "copy":
    case "gaData":
      return null;
    default:
      return null;
  }
}
