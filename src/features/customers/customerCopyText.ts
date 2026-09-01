import { formatCustomerMobileCarrierDisplay } from "./customerCarrier";
import type { CustomerRecord } from "./types";

const MEDICAL_QUESTION_TEXT =
  "최근 5년 이내에 수술·입원·치료를 받은 적이 있습니까?";
const MEDICAL_QUESTION_HINT = "(질병명, 치료기간, 현재 상태를 적어 주세요)";

function medicalDisplay(customer: CustomerRecord): string {
  const parts = [
    customer.notes.treatmentHistoryNote,
    customer.notes.medicationHistoryNote,
    customer.medical,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return parts.join("\n");
}

/** Web `buildKakaoCustomerCopyText` parity */
export function buildKakaoCustomerCopyText(
  customer: CustomerRecord | Partial<CustomerRecord>,
): string {
  const name = String(customer.name ?? "");
  const ssn = String(customer.ssn ?? "");
  const phone = String(customer.phone ?? "");
  const carrier = formatCustomerMobileCarrierDisplay(customer.carrier);
  const address = String(customer.address ?? "");
  const height = String(customer.height ?? "").trim();
  const weight = String(customer.weight ?? "").trim();
  const job = String(customer.job ?? "");
  const isDriver = customer.isDriver;
  const carType = String(customer.carType ?? "").trim();
  const drivingLine =
    isDriver === true
      ? "운전함"
      : isDriver === false
        ? "운전 안함"
        : String(customer.driving ?? "").trim() || "—";
  const heightWeight =
    height || weight ? `${height || "—"}/${weight || "—"}` : "—";

  return [
    `이름: ${name}`,
    `주민번호: ${ssn}`,
    `핸드폰번호: ${phone}`,
    `통신사: ${carrier || "—"}`,
    `주소: ${address || "—"}`,
    `키/몸무게: ${heightWeight}`,
    `직업/회사명/하는일/지역: ${job || "—"}`,
    `운전여부: ${drivingLine}`,
    `차종: ${carType || "—"}`,
    MEDICAL_QUESTION_TEXT,
    MEDICAL_QUESTION_HINT,
    medicalDisplay(customer as CustomerRecord) || "—",
  ]
    .join("\n")
    .trim();
}
