export const personalBinderQueryKeys = {
  all: ['personal-binders'] as const,
  detail: (binderId: string) => ['personal-binders', binderId] as const,
  pages: (binderId: string) => ['personal-binders', binderId, 'pages'] as const,
  materials: ['personal-binders', 'materials'] as const,
};
