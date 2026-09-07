/** Customer list responses are safe to reuse across pickers for ~60s. */
export const CUSTOMER_LIST_STALE_MS = 60_000;

export const customerQueryKeys = {
  all: ['customers'] as const,
  detail: (customerId: number) => ['customers', 'detail', customerId] as const,
  /** Same cache bucket as detail — avoids duplicate /customers/:id fetch in workspace screens. */
  workspace: (customerId: number) => customerQueryKeys.detail(customerId),
};
