import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { Screen, useAppTheme, type AppTheme } from '../../design-system';
import {
  findCustomerConsultingFeature,
  type CustomerConsultingFeatureId,
} from './customerConsultingCatalog';

type Props = {
  featureId: CustomerConsultingFeatureId;
};

/**
 * 메뉴에서 진입은 되지만 기능 화면은 열지 않는다.
 * 웹 화면을 열지 않고, 인증 토큰을 주소에 넣지 않는다.
 */
export function CustomerConsultingUnavailableScreen({ featureId }: Props) {
  const feature = findCustomerConsultingFeature(featureId);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.root} testID={`customer-consulting-${featureId}`}>
      <AppHeader title={feature.label} />
      <Screen padded>
        <EmptyState
          compact
          title={feature.unavailableTitle}
          message={feature.unavailableMessage}
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
