export const taCallQueryKeys = {
  all: ['ta-call'] as const,
  week: (startDate?: string) => ['ta-call', 'week', startDate ?? 'current'] as const,
  settings: ['ta-call', 'settings'] as const,
};
