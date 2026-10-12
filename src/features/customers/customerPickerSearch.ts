/** Name/phone match for local customer pickers. Empty digit query must not match every phone. */
export function matchesCustomerPickerQuery(
  row: { name: string; phone: string },
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const phoneQuery = query.replace(/\D/g, "");
  return (
    row.name.toLowerCase().includes(query) ||
    (phoneQuery !== "" && row.phone.replace(/\D/g, "").includes(phoneQuery))
  );
}
