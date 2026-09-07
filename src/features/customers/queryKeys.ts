export const customerQueryKeys = {
  all: ['customers'] as const,
  detail: (customerId: number) => ['customers', 'detail', customerId] as const,
  /** Same cache bucket as detail — avoids duplicate /customers/:id fetch in workspace screens. */
  workspace: (customerId: number) => customerQueryKeys.detail(customerId),
};
