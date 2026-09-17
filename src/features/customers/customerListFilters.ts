import type {
  CustomerConsultationFilterValue,
  CustomerListSortValue,
  CustomerQuickSortType,
} from './customerListFilterConfig';
import type { CustomerRecord } from './types';
import { customerMatchesSearch } from './customerModel';

export type CustomerListFilters = {
  favoritesOnly: boolean;
  gender: '' | 'male' | 'female';
  minInsuranceAge: string;
  maxInsuranceAge: string;
  inflowSource: string;
  consultationFilter: CustomerConsultationFilterValue;
  consultationCutoff: string;
  listSort: CustomerListSortValue;
  quickSort: CustomerQuickSortType;
};

export const DEFAULT_CUSTOMER_LIST_FILTERS: CustomerListFilters = {
  favoritesOnly: false,
  gender: '',
  minInsuranceAge: '',
  maxInsuranceAge: '',
  inflowSource: '',
  consultationFilter: '',
  consultationCutoff: '',
  listSort: '',
  quickSort: null,
};

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function customerRenewalYmd(customer: CustomerRecord): string | null {
  const raw = (customer.renewalDate ?? '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function parseCreatedAtMs(iso: string | undefined | null): number {
  const parsed = Date.parse(String(iso ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseYmdMs(ymd: string | null | undefined): number {
  const value = String(ymd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 0;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function customerMatchesAdvancedFilters(
  customer: CustomerRecord,
  filters: CustomerListFilters,
): boolean {
  if (filters.gender === 'male' || filters.gender === 'female') {
    if (customer.gender !== filters.gender) return false;
  }

  const minAge = parseOptionalInt(filters.minInsuranceAge);
  if (minAge != null) {
    if (customer.insuranceAge == null || customer.insuranceAge < minAge) return false;
  }

  const maxAge = parseOptionalInt(filters.maxInsuranceAge);
  if (maxAge != null) {
    if (customer.insuranceAge == null || customer.insuranceAge > maxAge) return false;
  }

  return true;
}

export function customerMatchesListFilters(
  customer: CustomerRecord,
  filters: CustomerListFilters,
): boolean {
  if (filters.favoritesOnly && !customer.isFavorite) return false;
  return customerMatchesAdvancedFilters(customer, filters);
}

export function filterCustomerList(
  customers: CustomerRecord[],
  search: string,
  filters: CustomerListFilters,
): CustomerRecord[] {
  return customers
    .filter((customer) => customerMatchesSearch(customer, search))
    .filter((customer) => customerMatchesListFilters(customer, filters));
}

export function sortCustomerList(
  customers: CustomerRecord[],
  filters: CustomerListFilters,
): CustomerRecord[] {
  const copy = [...customers];
  const favoriteFirst = (a: CustomerRecord, b: CustomerRecord) =>
    Number(b.isFavorite) - Number(a.isFavorite);
  const tieName = (a: CustomerRecord, b: CustomerRecord) => a.name.localeCompare(b.name, 'ko');

  if (filters.quickSort === 'age') {
    copy.sort((a, b) => {
      const favoriteDiff = favoriteFirst(a, b);
      if (favoriteDiff) return favoriteDiff;
      const ageA = a.insuranceAge ?? 999;
      const ageB = b.insuranceAge ?? 999;
      const cmp = ageA - ageB;
      return cmp !== 0 ? cmp : tieName(a, b);
    });
    return copy;
  }

  if (filters.quickSort === 'car') {
    copy.sort((a, b) => {
      const favoriteDiff = favoriteFirst(a, b);
      if (favoriteDiff) return favoriteDiff;
      const renewalA = customerRenewalYmd(a) ?? '9999-12-31';
      const renewalB = customerRenewalYmd(b) ?? '9999-12-31';
      const cmp = renewalA.localeCompare(renewalB);
      return cmp !== 0 ? cmp : tieName(a, b);
    });
    return copy;
  }

  if (filters.quickSort === 'recent') {
    copy.sort((a, b) => {
      const favoriteDiff = favoriteFirst(a, b);
      if (favoriteDiff) return favoriteDiff;
      const consultA =
        parseYmdMs(a.lastConsultDate ?? a.lastConsultationAt) || parseCreatedAtMs(a.createdAt);
      const consultB =
        parseYmdMs(b.lastConsultDate ?? b.lastConsultationAt) || parseCreatedAtMs(b.createdAt);
      if (consultB !== consultA) return consultB - consultA;
      return tieName(a, b);
    });
    return copy;
  }

  if (filters.listSort) {
    return copy.sort((a, b) => {
      const favoriteDiff = favoriteFirst(a, b);
      if (favoriteDiff) return favoriteDiff;
      return tieName(a, b);
    });
  }

  copy.sort((a, b) => {
    const favoriteDiff = favoriteFirst(a, b);
    if (favoriteDiff) return favoriteDiff;
    const consultA =
      parseYmdMs(a.lastConsultDate ?? a.lastConsultationAt) || parseCreatedAtMs(a.createdAt);
    const consultB =
      parseYmdMs(b.lastConsultDate ?? b.lastConsultationAt) || parseCreatedAtMs(b.createdAt);
    if (consultB !== consultA) return consultB - consultA;
    return tieName(a, b);
  });
  return copy;
}

export function hasActiveCustomerListFilters(filters: CustomerListFilters): boolean {
  return (
    filters.favoritesOnly ||
    Boolean(filters.gender) ||
    Boolean(filters.minInsuranceAge.trim()) ||
    Boolean(filters.maxInsuranceAge.trim()) ||
    Boolean(filters.inflowSource.trim()) ||
    Boolean(filters.consultationFilter) ||
    Boolean(filters.listSort) ||
    filters.quickSort != null
  );
}

export function countActiveCustomerListFilters(filters: CustomerListFilters): number {
  let count = 0;
  if (filters.favoritesOnly) count += 1;
  if (filters.gender) count += 1;
  if (filters.minInsuranceAge.trim() || filters.maxInsuranceAge.trim()) count += 1;
  if (filters.inflowSource.trim()) count += 1;
  if (filters.consultationFilter) count += 1;
  if (filters.listSort) count += 1;
  if (filters.quickSort != null) count += 1;
  return count;
}

export function buildCustomerListQueryOptions(filters: CustomerListFilters) {
  const options: {
    limit: number;
    consultationStatus?: 'none' | 'has' | 'no_since';
    noConsultationSince?: string;
    inflowSource?: string;
    sort?: string;
  } = { limit: 2000 };

  if (
    filters.consultationFilter === 'none' ||
    filters.consultationFilter === 'has' ||
    filters.consultationFilter === 'no_since'
  ) {
    options.consultationStatus = filters.consultationFilter;
    if (filters.consultationFilter === 'no_since' && filters.consultationCutoff.trim()) {
      options.noConsultationSince = filters.consultationCutoff.trim();
    }
  }

  if (filters.inflowSource.trim()) {
    options.inflowSource = filters.inflowSource.trim();
  }

  if (filters.listSort) {
    options.sort = filters.listSort;
  }

  return options;
}
