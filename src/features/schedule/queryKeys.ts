export const scheduleQueryKeys = {
  all: ['schedule'] as const,
  range: (from: string, to: string) => [...scheduleQueryKeys.all, 'events', from, to] as const,
  viewPrefs: (userId: string) => ['schedule', 'view-prefs', userId] as const,
};
