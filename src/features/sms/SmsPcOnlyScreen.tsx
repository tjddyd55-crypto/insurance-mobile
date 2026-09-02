import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { Screen, useAppTheme, type AppTheme } from '../../design-system';
import { SMS_PC_ONLY_MESSAGE, SMS_PC_ONLY_TITLE } from './smsPcOnlyPresentation';

/**
 * Native SMS 관리 UI는 제공하지 않는다 (PC/Web 전용).
 * 직접 route 진입 시 안내만 표시 — 설정/발송 화면을 렌더하지 않는다.
 */
export function SmsPcOnlyScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.root} testID="sms-pc-only-screen">
      <AppHeader title="문자 서비스" />
      <Screen padded>
        <EmptyState
          compact
          title={SMS_PC_ONLY_TITLE}
          message={SMS_PC_ONLY_MESSAGE}
        />
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
  });
}
