import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from 'expo-router';

type NavigationNode = {
  getParent?: () => NavigationNode | undefined;
  setOptions?: (options: { swipeEnabled: boolean }) => void;
};

const MAX_PARENTS = 4;

/**
 * 바인더 페이지 넘김은 가로 스와이프다.
 * 이 화면이 보이는 동안 드로어가 그 제스처를 가져가지 않게 한다.
 */
export function useConsultingDrawerSwipeLock(): void {
  const navigation = useNavigation() as NavigationNode;
  useFocusEffect(
    useCallback(() => {
      const parents = parentNavigators(navigation);
      setSwipe(parents, false);
      return () => setSwipe(parents, true);
    }, [navigation]),
  );
}

function parentNavigators(start: NavigationNode): NavigationNode[] {
  const parents: NavigationNode[] = [];
  let current: NavigationNode | undefined = start;
  for (let depth = 0; depth < MAX_PARENTS; depth += 1) {
    current = current?.getParent?.();
    if (!current?.setOptions) {
      break;
    }
    parents.push(current);
  }
  return parents;
}

function setSwipe(parents: readonly NavigationNode[], enabled: boolean): void {
  for (const parent of parents) {
    parent.setOptions?.({ swipeEnabled: enabled });
  }
}
