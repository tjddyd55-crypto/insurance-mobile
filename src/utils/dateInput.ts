/** Web `src/utils/dateInput.ts` parity — 저장/API용 YYYY-MM-DD */

export function normalizeDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);

  if (digits.length <= 4) {
    return year;
  }
  if (digits.length <= 6) {
    return `${year}-${month}`;
  }
  return `${year}-${month}-${day}`;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function coerceStoredDateValue(raw: string | null | undefined): string {
  const normalized = normalizeDateInput(String(raw ?? "").trim());
  return isValidDateString(normalized) ? normalized : "";
}

/** UI 표시 — `2026.09.16` */
export function formatDateForDisplay(value: string | null | undefined): string {
  const stored = coerceStoredDateValue(value);
  if (!stored) {
    return "";
  }
  const [year, month, day] = stored.split("-");
  return `${year}.${month}.${day}`;
}

export function dateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ymdToDate(value: string): Date | null {
  const stored = coerceStoredDateValue(value);
  if (!stored) {
    return null;
  }
  const [year, month, day] = stored.split("-").map(Number);
  return new Date(year, month - 1, day);
}
