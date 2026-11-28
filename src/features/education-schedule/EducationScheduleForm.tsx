import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { describeApiError } from '../../api/apiErrorCopy';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AppText, Button, Inline, ModalShell, Stack, TextField } from '../../design-system';
import { ScheduleDateField } from '../schedule/ScheduleDateField';
import { saveEducationSchedule, type EducationSchedule, type ScheduleInput } from './educationScheduleApi';
import { scheduleInputError } from './educationScheduleModel';

export function EducationScheduleFields({ value, disabled, onChange }: {
  value: ScheduleInput;
  disabled: boolean;
  onChange: (value: ScheduleInput) => void;
}) {
  return (
    <Stack gap="sm">
      <ScheduleDateField
        label="교육일자"
        value={value.date}
        placeholder="날짜를 선택해 주세요"
        hideTrigger={disabled}
        onChange={(date) => onChange({ ...value, date })}
      />
      {disabled ? <AppText>교육일자 {value.date}</AppText> : null}
      <TextField label="교육기관/제목" value={value.title} required editable={!disabled} onChangeText={(title) => onChange({ ...value, title })} />
      <TextField label="강사" value={value.instructor} editable={!disabled} onChangeText={(instructor) => onChange({ ...value, instructor })} />
    </Stack>
  );
}

export function EducationScheduleForm({ token, initial, id, onClose, onSaved }: {
  token: string;
  initial: ScheduleInput;
  id?: string;
  onClose: () => void;
  onSaved: (row: EducationSchedule) => void;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const saving = useRef(false);
  const dirty = value.date !== initial.date || value.title !== initial.title || value.instructor !== initial.instructor;

  function requestClose() {
    if (saving.current) return;
    if (dirty) {
      Keyboard.dismiss();
      setConfirmClose(true);
    } else {
      onClose();
    }
  }

  async function save() {
    if (saving.current) return;
    const invalid = scheduleInputError(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    Keyboard.dismiss();
    try {
      const { schedule } = await saveEducationSchedule(token, {
        date: value.date, title: value.title, instructor: value.instructor,
      }, id);
      onSaved(schedule);
    } catch (err) {
      setError(describeApiError(err, '교육일정을 저장하지 못했습니다.'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open
      title={id ? '교육일정 수정' : '교육일정 등록'}
      busy={busy}
      onRequestClose={requestClose}
      footer={
        <Inline gap="sm" justify="flex-end">
          <Button label="취소" disabled={busy} onPress={requestClose} />
          <Button label={id ? '수정 완료' : '등록'} variant="primary" loading={busy} onPress={() => void save()} />
        </Inline>
      }
    >
      <EducationScheduleFields value={value} disabled={busy} onChange={setValue} />
      {error ? <AppText color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
      <ConfirmDialog
        open={confirmClose}
        title="교육일정 닫기"
        message="입력한 내용을 저장하지 않고 닫을까요?"
        confirmLabel="닫기"
        cancelLabel="계속 작성"
        onConfirm={onClose}
        onCancel={() => setConfirmClose(false)}
      />
    </ModalShell>
  );
}
