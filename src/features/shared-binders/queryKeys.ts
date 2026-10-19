export const sharedBinderQueryKeys = {
  all: ['shared-binders'] as const,
  list: () => [...sharedBinderQueryKeys.all, 'list'] as const,
  detail: (shareId: string) => [...sharedBinderQueryKeys.all, 'detail', shareId] as const,
  shareStatus: (binderId: string) => [...sharedBinderQueryKeys.all, 'share-status', binderId] as const,
};
