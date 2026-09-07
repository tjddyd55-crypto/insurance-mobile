export const customerQueryKeys = {
  all: ['customers'] as const,
  detail: (customerId: number) => ['customers', 'detail', customerId] as const,
  /** @deprecated use detail() — legacy workspace screens still share this shape */
  workspace: (customerId: number) => ['customer', customerId] as const,
};
