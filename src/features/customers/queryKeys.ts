/** Customer list responses are safe to reuse across pickers for ~60s. */
export const CUSTOMER_LIST_STALE_MS = 60_000;

import type { ListCustomersOptions } from './customersApi';

export const customerQueryKeys = {
  all: ['customers'] as const,
  /** Prefix of every customer list query (CustomersScreen uses list(options)). */
  lists: ['customers', 'list'] as const,
  list: (options: ListCustomersOptions) => ['customers', 'list', options] as const,
  detail: (customerId: number) => ['customers', 'detail', customerId] as const,
  /** Same cache bucket as detail — avoids duplicate /customers/:id fetch in workspace screens. */
  workspace: (customerId: number) => customerQueryKeys.detail(customerId),
};

type QueryInvalidator = {
  invalidateQueries: (filters: { queryKey: readonly unknown[]; exact?: boolean }) => Promise<unknown>;
};

/**
 * Customer create/delete: re-read customer lists from the server (SSOT).
 * Only list caches — `customers.list(*)` and the full picker list `customers` (exact).
 * Detail caches and unrelated queries are untouched.
 */
export function invalidateCustomerListQueries(queryClient: QueryInvalidator): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists }),
    queryClient.invalidateQueries({ queryKey: customerQueryKeys.all, exact: true }),
  ]);
}
