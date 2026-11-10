import { useState } from 'react';
import { Switch } from 'react-native';
import { AppText, Button, Inline, ModalShell, Stack } from '../../design-system';
import { SCHEDULE_FILTER_KEYS, type ScheduleFilterKey, type ScheduleViewPrefs } from './scheduleViewPrefs';

const LABELS: Record<ScheduleFilterKey, string> = {
  google: '일정 (ONE FC·Google)',
  google_task: 'Google 할 일',
  onefc_todo: 'ONE FC 할 일',
  customer_alert: '알림일',
  car_expiry: '자동차 만기',
  insurance_age: '상령일',
};

export function ScheduleViewSettings({
  prefs,
  onChange,
  disabled,
}: {
  prefs: ScheduleViewPrefs;
  onChange: (patch: Partial<ScheduleViewPrefs>) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Inline justify="flex-end">
        <Button
          label="표시 설정"
          variant="ghost"
          size="sm"
          accessibilityLabel="달력 표시 설정"
          onPress={() => setOpen(true)}
        />
      </Inline>
      <ModalShell
        open={open}
        title="표시 설정"
        subtitle="웹·PC 앱과 같은 계정의 설정을 공유합니다."
        presentation="dialog"
        scroll
        onRequestClose={() => setOpen(false)}
      >
        <Stack gap="md">
          <AppText variant="caption" color="textMuted">
            Google 자동 등록 설정은 알림 설정에서 변경합니다.
          </AppText>
          {SCHEDULE_FILTER_KEYS.map((key) => (
            <Inline key={key} justify="space-between">
              <AppText>{LABELS[key]}</AppText>
              <Switch
                accessibilityLabel={`달력 표시 ${LABELS[key]}`}
                value={prefs.sources.includes(key)}
                disabled={disabled}
                onValueChange={(value) =>
                  onChange({
                    sources: SCHEDULE_FILTER_KEYS.filter((item) =>
                      item === key ? value : prefs.sources.includes(item),
                    ),
                  })
                }
              />
            </Inline>
          ))}
          <Inline justify="space-between">
            <AppText>완료 포함</AppText>
            <Switch
              accessibilityLabel="달력 표시 완료 포함"
              value={prefs.includeCompleted}
              disabled={disabled}
              onValueChange={(includeCompleted) => onChange({ includeCompleted })}
            />
          </Inline>
          <Button label="닫기" variant="secondary" fullWidth onPress={() => setOpen(false)} />
        </Stack>
      </ModalShell>
    </>
  );
}
