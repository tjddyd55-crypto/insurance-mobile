import { ActivityIndicator, View } from 'react-native';

import { describeApiError } from '../../api/apiErrorCopy';
import { AppText, Badge, Button, Card, Inline, Stack } from '../../design-system';
import { googleIntegrationPermissions, googleStatusBanner } from '../schedule/scheduleModel';
import { useGoogleIntegration } from '../schedule/useGoogleIntegration';

export const GOOGLE_INTEGRATION_COPY = {
  title: 'Google 연동',
  description: 'Google 캘린더·할 일 연결 상태와 권한을 관리합니다.',
} as const;

/**
 * 내 정보 관리의 Google 연동 카드(t402u). 연결/재연결/쓰기 권한/새로고침은 useGoogleIntegration 하나로만 한다.
 * 토큰·인증 코드는 서버에만 있고 여기에는 상태·권한 여부만 보인다.
 */
export function GoogleIntegrationSection() {
  const { query, google, connect, connecting, refresh, refreshing, message } = useGoogleIntegration();
  if (query.isLoading) {
    return <Card variant="outlined" padding="md"><ActivityIndicator /></Card>;
  }
  if (query.isError || !google) {
    return (
      <Card variant="outlined" padding="md">
        <Stack gap="sm">
          <AppText variant="caption" color="danger">{describeApiError(query.error, 'Google 연동 상태를 불러오지 못했습니다.')}</AppText>
          <Button label="다시 시도" variant="secondary" size="sm" onPress={() => void query.refetch()} />
        </Stack>
      </Card>
    );
  }
  const status = googleStatusBanner(google);
  if (!status) {
    return (
      <Card variant="outlined" padding="md">
        <AppText variant="helper" color="textMuted">Google 연동을 사용할 수 없는 환경입니다.</AppText>
      </Card>
    );
  }
  const showPermissions = google.connected && google.status !== 'needs_reauth';
  return (
    <Card variant="outlined" padding="md">
      <Stack gap="sm">
        <Inline justify="space-between">
          <Inline gap="xs">
            <AppText variant="bodyStrong">Google</AppText>
            <Badge label={status.label} tone={status.tone} />
          </Inline>
          <Button label="상태 새로고침" variant="ghost" size="sm" loading={refreshing} disabled={refreshing || connecting} onPress={() => void refresh()} />
        </Inline>
        {status.message ? <AppText variant="helper" color="textMuted">{status.message}</AppText> : null}
        {showPermissions ? (
          <Stack gap="xs">
            {googleIntegrationPermissions(google).map((permission) => (
              <View key={permission.key}>
                <Inline justify="space-between">
                  <AppText variant="caption" color="textSecondary">{permission.label}</AppText>
                  <AppText variant="caption" color={permission.granted ? 'success' : 'textMuted'}>{permission.granted ? '허용됨' : '없음'}</AppText>
                </Inline>
              </View>
            ))}
          </Stack>
        ) : null}
        {status.action ? (
          <Button label={status.action.label} variant="primary" size="sm" loading={connecting} disabled={connecting} onPress={() => void connect(status.action!.purpose)} />
        ) : null}
        {showPermissions && google.connectAllowed && status.action?.purpose !== 'connect' ? (
          <Button label="Google 재연결" variant="secondary" size="sm" disabled={connecting} onPress={() => void connect('connect')} />
        ) : null}
        {message ? <AppText variant="caption" color={message.ok ? 'success' : 'danger'}>{message.text}</AppText> : null}
      </Stack>
    </Card>
  );
}
