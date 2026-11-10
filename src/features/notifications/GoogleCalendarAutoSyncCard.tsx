import { Switch, View } from 'react-native';
import { AppText, Button, Card, Inline, Stack, useAppTheme } from '../../design-system';
import { GOOGLE_AUTO_SYNC_KINDS, type GoogleAutoSyncInput, type GoogleAutoSyncState } from './googleCalendarAutoSyncApi';

export function GoogleCalendarAutoSyncCard({ state, draft, onChange, onOpenGoogle, busy }: {
  state: GoogleAutoSyncState;
  draft: GoogleAutoSyncInput;
  onChange: (value: GoogleAutoSyncInput) => void;
  onOpenGoogle: () => void;
  busy: boolean;
}) {
  const theme = useAppTheme();
  const canEnable = state.available && state.connected && state.calendarWritable;
  const disabled = busy || (!draft.enabled && !canEnable);
  const status = { idle: '자동 동기화 대기', syncing: 'Google 캘린더 동기화 중…', done: 'Google 캘린더 동기화 완료', error: 'Google 캘린더 동기화에 실패했습니다. 연동 상태를 확인해 주세요.' }[state.syncStatus];
  return <Card variant="outlined">
    <Stack gap="sm">
      <Inline justify="space-between">
        <AppText variant="bodyStrong" style={{ flex: 1 }}>Google 캘린더 자동 연동</AppText>
        <Switch accessibilityLabel="Google 캘린더 자동 연동" value={draft.enabled} disabled={disabled}
          onValueChange={(enabled) => { if (!enabled || canEnable) onChange({ ...draft, enabled }); }}
          trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryBorder }} thumbColor={draft.enabled ? theme.colors.primary : theme.colors.textMuted} />
      </Inline>
      <AppText variant="caption">ON 하면 선택한 ONE FC 할 일과 알림이 연결된 본인 Google 캘린더에 자동 등록됩니다. 달력에서 보이는 항목 설정과는 별개입니다.</AppText>
      <AppText variant="caption">OFF 하면 더 이상 자동 등록하지 않고, 끈 날의 다음 날 이후에 자동 등록된 ONE FC 사본을 Google에서 지웁니다. 당일·지난 일정, Google에서 직접 만든 일정, Google 할 일과 ONE FC 원본은 유지합니다.</AppText>
      {draft.enabled ? <AppText variant="helper">고객 이름이 Google 일정 제목으로 전송됩니다. 주민번호·전화번호·계좌·병력·메모는 보내지 않습니다.{state.windowDays > 0 ? ` 앞으로 ${state.windowDays}일 범위가 동기화됩니다.` : ''}</AppText> : null}
      {!canEnable ? <View>
        <AppText variant="helper" color="warningText">{!state.available ? '현재 계정에서는 아직 사용할 수 없습니다.' : !state.connected ? 'Google을 먼저 연결해 주세요.' : 'Google 캘린더 쓰기 권한이 필요합니다.'}</AppText>
        <Button label="Google 연동 관리" variant="secondary" size="sm" onPress={onOpenGoogle} disabled={busy} />
      </View> : null}
      {GOOGLE_AUTO_SYNC_KINDS.map(({ key, label }) => <Inline key={key} justify="space-between">
        <AppText variant="body" style={{ flex: 1 }}>{label}</AppText>
        <Switch accessibilityLabel={`Google 자동 연동 ${label}`} value={draft.kinds[key]} disabled={busy || !draft.enabled}
          onValueChange={(enabled) => onChange({ ...draft, kinds: { ...draft.kinds, [key]: enabled } })}
          trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryBorder }} thumbColor={draft.kinds[key] ? theme.colors.primary : theme.colors.textMuted} />
      </Inline>)}
      <AppText variant="helper" color={state.syncStatus === 'error' ? 'danger' : 'textMuted'} accessibilityLiveRegion="polite">{status}</AppText>
    </Stack>
  </Card>;
}
