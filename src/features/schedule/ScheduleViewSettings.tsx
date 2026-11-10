import { useState } from 'react';
import { Switch } from 'react-native';
import { AppText, Button, Card, Inline, Stack } from '../../design-system';
import { SCHEDULE_FILTER_KEYS, type ScheduleFilterKey, type ScheduleViewPrefs } from './scheduleViewPrefs';
const LABELS: Record<ScheduleFilterKey, string> = { google: '일정 (ONE FC·Google)', google_task: 'Google 할 일', onefc_todo: 'ONE FC 할 일', customer_alert: '알림일', car_expiry: '자동차 만기', insurance_age: '상령일' };
export function ScheduleViewSettings({ prefs, onChange, disabled }: {
  prefs: ScheduleViewPrefs; onChange: (patch: Partial<ScheduleViewPrefs>) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return <Stack gap="xs">
    <Button label={open ? '표시 설정 접기' : '표시 설정'} variant="ghost" size="sm" onPress={() => setOpen(!open)} />
    {open ? <Card variant="outlined"><Stack gap="sm">
      <AppText variant="caption">같은 계정의 웹·PC 앱과 공유하는 설정입니다. Google 자동 등록 설정은 알림 설정에서 변경합니다.</AppText>
      {SCHEDULE_FILTER_KEYS.map(key => <Inline key={key} justify="space-between">
        <AppText>{LABELS[key]}</AppText>
        <Switch accessibilityLabel={`달력 표시 ${LABELS[key]}`} value={prefs.sources.includes(key)} disabled={disabled}
          onValueChange={(value) => onChange({ sources: SCHEDULE_FILTER_KEYS.filter(item => item === key ? value : prefs.sources.includes(item)) })} />
      </Inline>)}
      <Inline justify="space-between"><AppText>완료 포함</AppText>
        <Switch accessibilityLabel="달력 표시 완료 포함" value={prefs.includeCompleted} disabled={disabled}
          onValueChange={includeCompleted => onChange({ includeCompleted })} />
      </Inline>
    </Stack></Card> : null}
  </Stack>;
}
