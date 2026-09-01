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
  variant?: "primary" | "secondary";
};

export function buildCustomerWorkspaceActions(
  customerName: string,
): CustomerWorkspaceAction[] {
  return [
    {
      id: "map",
      label: "지도에서 보기",
      accessibilityLabel: `${customerName} 고객 지도에서 보기`,
      variant: "primary",
    },
    {
      id: "files",
      label: "고객 파일",
      accessibilityLabel: `${customerName} 고객 파일`,
      variant: "primary",
    },
    {
      id: "consultations",
      label: "상담 내역",
      accessibilityLabel: `${customerName} 고객 상담 내역`,
      variant: "primary",
    },
    {
      id: "applications",
      label: "신청서",
      accessibilityLabel: `${customerName} 고객 신청서`,
      variant: "secondary",
    },
    {
      id: "gaData",
      label: "GA 데이터 보기",
      accessibilityLabel: `${customerName} 고객 GA 데이터 보기`,
      variant: "secondary",
    },
    {
      id: "personalMessage",
      label: "개인메시지",
      accessibilityLabel: `${customerName} 고객 개인메시지`,
      variant: "secondary",
    },
    {
      id: "claims",
      label: "청구",
      accessibilityLabel: `${customerName} 고객 청구`,
      variant: "primary",
    },
    {
      id: "memos",
      label: "메모",
      accessibilityLabel: `${customerName} 고객 메모`,
      variant: "secondary",
    },
    {
      id: "copy",
      label: "복사",
      accessibilityLabel: `${customerName} 고객 정보 복사`,
      variant: "secondary",
    },
    {
      id: "premiumPayments",
      label: "카드 수납",
      accessibilityLabel: `${customerName} 고객 카드 수납`,
      variant: "secondary",
    },
  ];
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
