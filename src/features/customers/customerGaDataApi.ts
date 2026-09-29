import { ApiError, apiRequest } from "../../api/client";

export type GaExcelColumn = {
  key: string;
  label: string;
};

export type GaExcelRow = Record<string, string | number | null>;

export type GaExcelData = {
  columns: GaExcelColumn[];
  rows: GaExcelRow[];
  useGaExcel: boolean;
};

function requireToken(token: string | null): string {
  const value = token?.trim();
  if (!value) throw new ApiError("로그인이 필요합니다.", 401);
  return value;
}

export async function getCustomerGaExcelData(
  token: string | null,
  customerId: number,
): Promise<GaExcelData> {
  const auth = requireToken(token);
  const raw = await apiRequest<unknown>(
    `/api/customers/${customerId}/ga-excel-data`,
    { token: auth },
  );
  if (!raw || typeof raw !== "object") {
    return { columns: [], rows: [], useGaExcel: false };
  }
  const body = raw as Record<string, unknown>;
  const columns = Array.isArray(body.columns)
    ? body.columns.map((column) => {
        const row = column as Record<string, unknown>;
        return {
          key: String(row.key ?? ""),
          label: String(row.label ?? row.key ?? ""),
        };
      })
    : [];
  const rows = Array.isArray(body.rows)
    ? (body.rows as GaExcelRow[])
    : Array.isArray(body.data)
      ? (body.data as GaExcelRow[])
      : [];
  return {
    columns,
    rows,
    useGaExcel: body.useGaExcel === true || body.use_ga_excel === true,
  };
}
