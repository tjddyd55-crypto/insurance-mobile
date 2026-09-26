export const personalBinderQueryKeys = {
  all: ['personal-binders'] as const,
  detail: (binderId: string) => ['personal-binders', binderId] as const,
  materials: ['personal-binders', 'materials'] as const,
};
