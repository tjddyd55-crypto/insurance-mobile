import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { getEnvironmentConfig } from '../../config/environment';
import { Screen, useAppTheme, type AppTheme } from '../../design-system';
import { ConsultingWebView } from './ConsultingWebView';
import { resolveConsultingWebTarget } from './consultingWebNavigation';
import {
  findCustomerConsultingFeature,
  type CustomerConsultingFeatureId,
} from './customerConsultingCatalog';
import { buildWebCrmSession } from './webCrmSession';
import { CustomerConsultingUnavailableScreen } from './CustomerConsultingUnavailableScreen';

type Props = {
  featureId: CustomerConsultingFeatureId;
};

/**
 * DEV CRM WebView.
 * SecureStore 세션을 localStorage로 넣고, 토큰은 요청 주소에 붙이지 않는다.
 */
export function CustomerConsultingWebScreen({ featureId }: Props) {
  const feature = findCustomerConsultingFeature(featureId);
  const { token, user } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const target = resolveConsultingWebTarget(feature.legacyWebPath, getEnvironmentConfig());
  const session = useMemo(() => buildWebCrmSession({ token, user }), [token, user]);

  if (!feature.webImplemented || (target.ok === false && target.reason === 'missing-path')) {
    return <CustomerConsultingUnavailableScreen featureId={featureId} />;
  }
  if (target.ok === false) {
    return (
      <Blocked
        title={feature.label}
        message="이 기능은 개발 앱에서만 연결됩니다."
        styles={styles}
      />
    );
  }
  if (!session) {
    return (
      <Blocked
        title={feature.label}
        message="로그인 세션이 없어 상담 화면을 열 수 없습니다. 다시 로그인한 뒤 열어 주세요."
        styles={styles}
      />
    );
  }

  return (
    <ConsultingWebView
      title={feature.label}
      origin={target.origin}
      pageUrl={target.pageUrl}
      path={feature.legacyWebPath}
      session={session}
    />
  );
}

function Blocked({
  title,
  message,
  styles,
}: {
  title: string;
  message: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.root}>
      <AppHeader title={title} />
      <Screen padded>
        <EmptyState compact title={title} message={message} />
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
  });
}
