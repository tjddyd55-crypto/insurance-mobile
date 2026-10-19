export const scheduleQueryKeys = {
  all: ['schedule'] as const,
  range: (from: string, to: string) => [...scheduleQueryKeys.all, 'events', from, to] as const,
  calendars: () => [...scheduleQueryKeys.all, 'writable-calendars'] as const,
};
