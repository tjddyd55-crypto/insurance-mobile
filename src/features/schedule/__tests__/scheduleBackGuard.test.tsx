/* eslint-disable @typescript-eslint/no-require-imports */
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { decideScheduleFormClose, isScheduleFormDirty, SCHEDULE_LEAVE_CONFIRM_COPY, scheduleFormSnapshot } from '../scheduleFormGuard';
import { emptyEventForm, setScheduleTimeSpecified, withScheduleStartTime } from '../scheduleModel';
import { ScheduleTimePicker } from '../ScheduleTimeField';
import type { ScheduleEventForm } from '../types';

const { readFileSync } = require('fs') as { readFileSync(p: string, e: string): string };
const { join } = require('path') as { join(...p: string[]): string };
declare const __dirname: string;

const base = emptyEventForm('2026-11-02');
const initial = scheduleFormSnapshot(base);
const decide = (current: ScheduleEventForm, busy = false) => decideScheduleFormClose({ busy, initialSnapshot: initial, current });

describe('새 일정 뒤로가기 보호', () => {
  it('아무것도 안 바꾼 새 일정은 바로 닫는다', () => {
    expect(decide(base)).toBe('close');
    expect(decide({ ...base })).toBe('close');
  });
  it('공백만 입력하거나 종일 상태의 숨은 시각은 dirty 가 아니다', () => {
    expect(decide({ ...base, title: '   ' })).toBe('close');
    expect(decide({ ...base, startTime: '13:00', endTime: '14:00' })).toBe('close');
  });
  it('제목·설명·날짜·종료일 변경은 확인', () => {
    expect(decide({ ...base, title: '미팅' })).toBe('confirm');
    expect(decide({ ...base, description: '메모' })).toBe('confirm');
    expect(decide({ ...base, date: '2026-11-03', endDate: '2026-11-03' })).toBe('confirm');
    expect(decide({ ...base, endDate: '2026-11-04' })).toBe('confirm');
  });
  it('종일 → 시간 지정, 시간 변경은 확인', () => {
    const timed = { ...base, ...setScheduleTimeSpecified(base, true) } as ScheduleEventForm;
    expect(decide(timed)).toBe('confirm');
    const initialTimed = scheduleFormSnapshot(timed);
    const moved = { ...timed, ...withScheduleStartTime(timed, '13:00') } as ScheduleEventForm;
    expect(isScheduleFormDirty(initialTimed, timed)).toBe(false);
    expect(isScheduleFormDirty(initialTimed, moved)).toBe(true);
  });
  it('되돌리면 다시 pristine, 저장 중에는 닫기 요청 무시', () => {
    expect(decide({ ...base, title: '' })).toBe('close');
    expect(decide({ ...base, title: '미팅' }, true)).toBe('ignore');
  });
  it('확인 문구', () => {
    expect(SCHEDULE_LEAVE_CONFIRM_COPY).toMatchObject({ message: '작성 중인 내용이 있습니다. 나가시겠습니까?', cancelLabel: '계속 작성', confirmLabel: '나가기' });
  });
  it('ScheduleScreen: Back·취소는 requestCloseForm 한 경로, 계속 작성은 폼 유지, 나가기만 닫기, 저장 성공은 확인 없이 닫기', () => {
    const src = readFileSync(join(__dirname, '../ScheduleScreen.tsx'), 'utf8');
    expect(src).toMatch(/onRequestClose=\{requestCloseForm\}/);
    expect(src).toMatch(/label="취소" fullWidth disabled=\{save\.isPending\} onPress=\{requestCloseForm\}/);
    expect(src).toMatch(/onCancel=\{\(\) => setLeaveConfirm\(false\)\}/);
    expect(src).toMatch(/onConfirm=\{closeForm\}/);
    expect(src).not.toMatch(/BackHandler/);
    expect(src).not.toMatch(/beforeRemove/);
    const afterWrite = src.slice(src.indexOf('const afterWrite = async'), src.indexOf('const save = useMutation'));
    expect(afterWrite).toMatch(/setLeaveConfirm\(false\);\s*setFormState\(null\)/);
    expect(afterWrite).not.toMatch(/requestCloseForm/);
    expect(src.match(/initialSnapshot: scheduleFormSnapshot\(form\)/g)).toHaveLength(1);
    expect(src).not.toMatch(/setFormState\(\{ mode:/);
  });
  it('위젯 진입: 확인창이 떠 있는 동안 폼은 열린 상태라 위젯 복귀가 일어나지 않고, 나가기에서만 기존 종료 정책을 탄다', () => {
    const src = readFileSync(join(__dirname, '../ScheduleScreen.tsx'), 'utf8');
    expect(src).toMatch(/form: formState !== null,/);
    const close = src.slice(src.indexOf('const closeForm = () => {'), src.indexOf('const requestCloseForm'));
    expect(close).toMatch(/setFormState\(null\)/);
    expect(close).not.toMatch(/router\.|navigation\./);
  });
});

const metrics = { frame: { x: 0, y: 0, width: 360, height: 780 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('시간 선택 줄 레이아웃 계약', () => {
  it('시·분·오전/오후 세 칸이 한 줄(nowrap)에서 폭을 똑같이 나눈다', () => {
    const ui = render(
      <SafeAreaProvider initialMetrics={metrics}>
        <DesignSystemProvider>
          <ScheduleTimePicker label="시작 시간" value="14:30" onChange={() => undefined} />
        </DesignSystemProvider>
      </SafeAreaProvider>,
    );
    const flat = (s: unknown) => Object.assign({}, ...([s].flat(Infinity) as object[]).filter(Boolean));
    expect(flat(ui.getByLabelText('시작 시간 시간 선택').props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'nowrap' });
    for (const id of ['schedule-time-hour', 'schedule-time-minute', 'schedule-time-meridiem']) {
      expect(flat(ui.getByTestId(id).props.style)).toMatchObject({ flex: 1, minWidth: 0, flexDirection: 'row' });
    }
    expect(ui.getByText('오전')).toBeTruthy();
    expect(ui.getByText('오후')).toBeTruthy();
    expect(ui.getByText('2')).toBeTruthy();
    expect(ui.getByText('30')).toBeTruthy();
  });
  it('고정 px 폭·absolute 위치 없음', () => {
    const src = readFileSync(join(__dirname, '../ScheduleTimeField.tsx'), 'utf8');
    expect(src).not.toMatch(/position: 'absolute'/);
    expect(src).not.toMatch(/\bwidth: \d/);
    expect(src).not.toMatch(/minWidth: [1-9]/);
    expect(src).not.toMatch(/flexWrap: 'wrap'/);
  });
});
