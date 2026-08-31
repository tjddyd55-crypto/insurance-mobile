export const customerQueryKeys = {
  all: ['customers'] as const,
  detail: (customerId: number) => ['customers', 'detail', customerId] as const,
};
