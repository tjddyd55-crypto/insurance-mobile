export const consultationLeadQueryKeys = {
  all: ['consultation-leads'] as const,
  list: () => [...consultationLeadQueryKeys.all, 'list'] as const,
  detail: (leadId: string) => [...consultationLeadQueryKeys.all, 'detail', leadId] as const,
};
