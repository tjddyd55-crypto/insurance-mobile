import type { CompanyDirectoryEntry, InsuranceCategory } from './types';

export function normalizeCompanyDirectoryEntry(value: unknown): CompanyDirectoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  const name = String(row.name ?? '').trim();
  if (!Number.isFinite(id) || !name) return null;
  return {
    id, name, companyCode: String(row.companyCode ?? row.company_code ?? ''), category: String(row.category ?? ''),
    customerCenter: String(row.customerCenter ?? row.customer_center ?? '').trim(),
    systemPhone: String(row.systemPhone ?? row.system_phone ?? '').trim(),
    incallNumber: String(row.incallNumber ?? row.incall_number ?? '').trim(),
    visitInfo: String(row.visitInfo ?? row.visit_info ?? '').trim(),
    contacts: Array.isArray(row.contacts) ? row.contacts.map((item) => {
      const contact = item as Record<string, unknown>;
      return { id: Number(contact.id) || 0, name: String(contact.name ?? '').trim(), position: String(contact.position ?? '').trim(), phone: String(contact.phone ?? '').trim() };
    }) : [],
  };
}

export function normalizePhone(value: string): string {
  return value.replace(/[^0-9+]/g, '');
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  if (digits.length === 10 && digits.startsWith('02')) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  if (digits.length === 9 && digits.startsWith('02')) return digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
  return value.trim();
}

export function categoryOf(entry: CompanyDirectoryEntry): InsuranceCategory {
  const raw = entry.category.toUpperCase();
  if (raw === 'NON_LIFE' || raw.includes('손해')) return 'NON_LIFE';
  if (raw === 'GENERAL' || raw.includes('일반')) return 'GENERAL';
  return 'LIFE';
}

export function companyMatches(entry: CompanyDirectoryEntry, query: string): boolean {
  const keyword = query.trim().toLowerCase().replace(/\s/g, '');
  if (!keyword) return true;
  return [entry.name, entry.customerCenter, entry.systemPhone, entry.incallNumber, ...entry.contacts.flatMap((contact) => [contact.name, contact.position, contact.phone])]
    .some((value) => value.toLowerCase().replace(/\s/g, '').includes(keyword));
}
