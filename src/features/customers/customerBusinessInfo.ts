export type CustomerBusinessInfo = {
  representativeName: string;
  businessNumber: string;
  businessAddress: string;
  memo: string;
};

export function emptyCustomerBusinessInfo(): CustomerBusinessInfo {
  return {
    representativeName: "",
    businessNumber: "",
    businessAddress: "",
    memo: "",
  };
}

export function normalizeCustomerBusinessInfo(raw: unknown): CustomerBusinessInfo | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const info: CustomerBusinessInfo = {
    representativeName: String(row.representativeName ?? row.representative_name ?? "").trim(),
    businessNumber: String(row.businessNumber ?? row.business_number ?? "").trim(),
    businessAddress: String(row.businessAddress ?? row.business_address ?? "").trim(),
    memo: String(row.memo ?? "").trim(),
  };
  if (
    !info.representativeName &&
    !info.businessNumber &&
    !info.businessAddress &&
    !info.memo
  ) {
    return null;
  }
  return info;
}

export function customerBusinessInfoToForm(
  info: CustomerBusinessInfo | null | undefined,
): CustomerBusinessInfo {
  if (!info) {
    return emptyCustomerBusinessInfo();
  }
  return { ...info };
}

export function isCustomerBusinessInfoEmpty(info: CustomerBusinessInfo): boolean {
  return (
    !info.representativeName.trim() &&
    !info.businessNumber.trim() &&
    !info.businessAddress.trim() &&
    !info.memo.trim()
  );
}

export function formatBusinessNumberDisplay(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
}
