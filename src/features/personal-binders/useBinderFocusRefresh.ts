import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { personalBinderQueryKeys } from './queryKeys';

// RN navigation focus does not trigger React Query's window-focus refresh.
export function useBinderFocusRefresh(enabled: boolean) {
  const queryClient = useQueryClient();
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    // Includes list, materials, detail and viewer pages; active queries refetch.
    void queryClient.invalidateQueries({ queryKey: personalBinderQueryKeys.all });
  }, [enabled, queryClient]));
}
