import type { CustomerRecord } from './types';
import { customerMatchesSearch } from './customerModel';

export type CustomerListFilters = {
  favoritesOnly: boolean;
};

export const DEFAULT_CUSTOMER_LIST_FILTERS: CustomerListFilters = {
  favoritesOnly: false,
};

export function customerMatchesListFilters(
  customer: CustomerRecord,
  filters: CustomerListFilters,
): boolean {
  if (filters.favoritesOnly && !customer.isFavorite) {
    return false;
  }
  return true;
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

export function sortCustomerList(customers: CustomerRecord[]): CustomerRecord[] {
  return [...customers].sort((a, b) => {
    const favoriteDiff = Number(b.isFavorite) - Number(a.isFavorite);
    if (favoriteDiff) return favoriteDiff;
    return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
  });
}

export function hasActiveCustomerListFilters(filters: CustomerListFilters): boolean {
  return filters.favoritesOnly;
}
