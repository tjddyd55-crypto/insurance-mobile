import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { describeApiError } from '../../api/apiErrorCopy';
import type { AuthUser } from '../../api/authApi';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Button, Card, Inline, Screen, Stack } from '../../design-system';
import { canAccessNativeEducationSchedule } from '../../navigation/nativeMenuPolicy';
import { formatDayTitle, formatMonthTitle, seoulYmd, shiftMonth } from '../schedule/scheduleModel';
import { EducationScheduleAiModal } from './EducationScheduleAiModal';
import { EducationScheduleCalendar } from './EducationScheduleCalendar';
import { EducationScheduleForm } from './EducationScheduleForm';
import {
  loadEducationMonth,
  removeEducationSchedule,
  type EducationSchedule,
  type ScheduleInput,
} from './educationScheduleApi';
import { buildEducationCalendar, emptyScheduleInput } from './educationScheduleModel';
import { shareEducationSchedulePdf } from './educationSchedulePrint';

export function EducationScheduleScreen() {
  const { token, user } = useAuth();
  return (
    <>
      <AppHeader title="교육일정" showMenu />
      {token && user && canAccessNativeEducationSchedule(user) ? (
        <EducationScheduleContent
          key={`${user.id}:${user.gaId}:${user.role}`}
          userId={user.id}
          gaId={user.gaId}
          role={user.role}
          token={token}
        />
      ) : (
        <Screen>
          <ErrorState title="교육일정 접근 제한" message="GA 소속 계정에서 교육일정을 이용할 수 있습니다." />
        </Screen>
      )}
    </>
  );
}

type Session = Pick<AuthUser, 'gaId' | 'role'> & { token: string; userId: string };

function EducationScheduleContent({ token, userId, gaId, role }: Session) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(seoulYmd);
  const month = selectedDate.slice(0, 7);
  const queryKey = ['education-schedule', userId, gaId, role];
  const query = useQuery({
    queryKey: [...queryKey, month],
    queryFn: () => loadEducationMonth(token, month),
    retry: false,
  });
  const data = query.isError ? undefined : query.data;
  const weeks = useMemo(() => buildEducationCalendar(data ?? { month, schedules: [], holidays: [] }), [data, month]);
  const selectedDay = weeks.flat().find((day) => day.ymd === selectedDate);
  const canCreate = data?.canCreate === true;

  const [form, setForm] = useState<{ input: ScheduleInput; id?: string }>();
  const [showAi, setShowAi] = useState(false);
  const [deleting, setDeleting] = useState<EducationSchedule>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [actionError, setActionError] = useState('');
  const removing = useRef(false);
  const exporting = useRef(false);

  function selectDate(date: string, openForm = false) {
    setActionError('');
    setSelectedDate(date);
    if (openForm && canCreate) setForm({ input: emptyScheduleInput(date) });
  }

  function refreshMonths() {
    // Edits and bulk registration can affect months other than the displayed one.
    void queryClient.invalidateQueries({ queryKey });
  }

  async function deleteSchedule() {
    if (!deleting?.canDelete || removing.current) return;
    removing.current = true;
    setDeleteBusy(true);
    setActionError('');
    try {
      await removeEducationSchedule(token, deleting.id);
      refreshMonths();
    } catch (error) {
      setActionError(describeApiError(error, '교육일정을 삭제하지 못했습니다.'));
    } finally {
      setDeleting(undefined);
      setDeleteBusy(false);
      removing.current = false;
    }
  }

  async function printMonth() {
    if (!data || exporting.current) return;
    exporting.current = true;
    setPrinting(true);
    setActionError('');
    try {
      await shareEducationSchedulePdf(data);
    } catch (error) {
      setActionError(describeApiError(error, '교육일정 PDF를 출력하지 못했습니다.'));
    } finally {
      setPrinting(false);
      exporting.current = false;
    }
  }

  return (
    <Screen scroll>
      <Stack gap="md">
        <Inline justify="space-between" gap="xs" wrap>
          <Inline gap="xs">
            <Button label="‹" variant="ghost" size="sm" accessibilityLabel="이전 달" onPress={() => selectDate(shiftMonth(selectedDate, -1))} />
            <AppText variant="sectionTitle">{formatMonthTitle(selectedDate)}</AppText>
            <Button label="›" variant="ghost" size="sm" accessibilityLabel="다음 달" onPress={() => selectDate(shiftMonth(selectedDate, 1))} />
          </Inline>
          <Button label="이번 달" size="sm" onPress={() => selectDate(seoulYmd())} />
        </Inline>
        <Inline gap="xs" wrap>
          {canCreate ? (
            <>
              <Button label="일정 등록" variant="primary" size="sm" onPress={() => selectDate(selectedDate, true)} />
              <Button label="AI 이미지 등록" size="sm" onPress={() => { setActionError(''); setShowAi(true); }} />
            </>
          ) : null}
          <Button label="출력" size="sm" disabled={!data} loading={printing} onPress={() => void printMonth()} />
        </Inline>
        {actionError ? <AppText color="danger" accessibilityLiveRegion="polite">{actionError}</AppText> : null}
        <EducationScheduleCalendar weeks={weeks} selectedDate={selectedDate} onSelect={(date) => selectDate(date, true)} />
        {query.isError ? (
          <ErrorState
            compact
            title="교육일정을 불러오지 못했습니다"
            message={describeApiError(query.error, '잠시 후 다시 시도해 주세요.')}
            onRetry={() => void query.refetch()}
          />
        ) : !data ? (
          <LoadingState message="교육일정을 불러오는 중…" />
        ) : (
          <Stack gap="sm">
            <AppText variant="sectionTitle">{formatDayTitle(selectedDate)}</AppText>
            {selectedDay?.holiday ? <AppText color="danger">{selectedDay.holiday}</AppText> : null}
            {selectedDay?.schedules.length ? selectedDay.schedules.map((row) => (
              <Card key={row.id} variant="outlined" padding="sm">
                <Stack gap="xs">
                  <AppText variant="bodyStrong">{row.title}</AppText>
                  {row.instructor ? <AppText color="textSecondary">{row.instructor}</AppText> : null}
                  {row.canEdit || row.canDelete ? (
                    <Inline gap="xs" justify="flex-end" wrap>
                      {row.canEdit ? (
                        <Button
                          label="수정"
                          size="sm"
                          accessibilityLabel={`${row.title} 수정`}
                          onPress={() => { setActionError(''); setForm({ input: row, id: row.id }); }}
                        />
                      ) : null}
                      {row.canDelete ? (
                        <Button
                          label="삭제"
                          size="sm"
                          accessibilityLabel={`${row.title} 삭제`}
                          onPress={() => { setActionError(''); setDeleting(row); }}
                        />
                      ) : null}
                    </Inline>
                  ) : null}
                </Stack>
              </Card>
            )) : <AppText color="textSecondary">등록된 교육일정이 없습니다.</AppText>}
          </Stack>
        )}
      </Stack>
      {form ? (
        <EducationScheduleForm
          token={token}
          initial={form.input}
          id={form.id}
          onClose={() => setForm(undefined)}
          onSaved={(row) => { setForm(undefined); selectDate(row.date); refreshMonths(); }}
        />
      ) : null}
      {showAi ? <EducationScheduleAiModal token={token} onClose={() => setShowAi(false)} onRegistered={refreshMonths} /> : null}
      {deleting ? (
        <ConfirmDialog
          open
          title="교육일정 삭제"
          message={`‘${deleting.title}’ 교육일정을 삭제할까요?`}
          confirmLabel="삭제"
          tone="danger"
          busy={deleteBusy}
          onCancel={() => setDeleting(undefined)}
          onConfirm={deleteSchedule}
        />
      ) : null}
    </Screen>
  );
}
