import { useRef } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { personalBinderQueryKeys } from '../personal-binders/queryKeys';
import { importSharedBinder } from './sharedBindersApi';
import { newImportIdempotencyKey } from './sharedBinderModel';

/** 내 바인더로 가져오기 → 기존 네이티브 내 바인더 뷰어로 이동. 같은 시도에는 같은 Idempotency-Key. */
export function useImportSharedBinder(token: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, string>());
  return useMutation({
    mutationFn: (shareId: string) => {
      const key = keys.current.get(shareId) ?? newImportIdempotencyKey(shareId);
      keys.current.set(shareId, key);
      return importSharedBinder(token, shareId, key);
    },
    onSuccess: async (result, shareId) => {
      keys.current.delete(shareId);
      await queryClient.invalidateQueries({ queryKey: personalBinderQueryKeys.all });
      router.push(`/customer-consulting/personal-binders/${encodeURIComponent(result.binderId)}/view` as never);
    },
  });
}
