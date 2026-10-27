import { useCallback } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';

import { createDoubleBackExit } from './rootBackExit';

/**
 * 루트 화면(홈, Drawer 첫 라우트)에 focus 일 때만 등록. 모달/시트/드로어는 열릴 때 나중에 등록되어
 * 먼저 처리되고, 되돌아갈 history 가 있으면(canGoBack) 기본 동작에 넘긴다. Android 전용.
 */
export function useRootBackExit() {
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const onRootBack = createDoubleBackExit({
        now: () => Date.now(),
        showToast: (message) => ToastAndroid.show(message, ToastAndroid.SHORT),
        leaveApp: () => BackHandler.exitApp(),
      });
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (navigation.canGoBack()) return false;
        return onRootBack();
      });
      return () => sub.remove();
    }, [navigation]),
  );
}
