/* eslint-disable @typescript-eslint/no-require-imports */
import { useState } from 'react';
import { View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { clockToHm, parseClock, ScheduleTimeField, ScheduleTimePicker } from '../ScheduleTimeField';
import { scheduleEventWriteTimes, setScheduleTimeSpecified, withScheduleEndTime, withScheduleStartTime } from '../scheduleModel';

const { readFileSync } = require('fs') as { readFileSync(p: string, e: string): string };
const { join } = require('path') as { join(...p: string[]): string };
declare const __dirname: string;

const day = { date: '2026-11-02', endDate: '2026-11-02' };
const timed = (startTime: string, endTime: string) => ({ ...day, allDay: false, startTime, endTime });

describe('오후 변경 시 11:59 종료 회귀', () => {
  it('오전/오후 변환: 오후 1·2·3시는 13·14·15시', () => {
    expect(clockToHm({ hour12: 1, minute: 0, meridiem: 'pm' })).toBe('13:00');
    expect(clockToHm({ hour12: 2, minute: 30, meridiem: 'pm' })).toBe('14:30');
    expect(clockToHm({ hour12: 3, minute: 0, meridiem: 'pm' })).toBe('15:00');
    expect(clockToHm({ hour12: 12, minute: 0, meridiem: 'pm' })).toBe('12:00');
    expect(clockToHm({ hour12: 12, minute: 0, meridiem: 'am' })).toBe('00:00');
    expect(parseClock('13:00')).toEqual({ hour12: 1, minute: 0, meridiem: 'pm' });
  });
  it('09:00/13:00/14:30 시작은 한 시간 뒤 종료', () => {
    expect(withScheduleStartTime(timed('09:00', '10:00'), '09:00').endTime).toBe('10:00');
    expect(withScheduleStartTime(timed('09:00', '10:00'), '13:00').endTime).toBe('14:00');
    expect(withScheduleStartTime(timed('09:00', '10:00'), '14:30').endTime).toBe('15:30');
  });
  it('오전 11시 → 오후 전환 뒤 시를 다시 내려도 23:59 가 남지 않는다', () => {
    let f = withScheduleStartTime(timed('11:00', '12:00'), '23:00');
    expect(f.endTime).toBe('23:59');
    f = withScheduleStartTime(f, '12:00');
    expect(f.endTime).toBe('13:00');
    f = withScheduleStartTime(f, '13:00');
    expect(f.endTime).toBe('14:00');
  });
  it('오후 9시에서 시를 올려 23시를 지나 12시가 되어도 23:59 가 남지 않는다', () => {
    let f = withScheduleStartTime(timed('09:00', '10:00'), '21:00');
    expect(f.endTime).toBe('22:00');
    f = withScheduleStartTime(f, '22:00');
    f = withScheduleStartTime(f, '23:00');
    expect(f.endTime).toBe('23:59');
    f = withScheduleStartTime(f, '12:00');
    expect(f.endTime).toBe('13:00');
  });
  it('23:00, 23:30 시작은 같은 날 23:59', () => {
    expect(withScheduleStartTime(timed('09:00', '10:00'), '23:00').endTime).toBe('23:59');
    expect(withScheduleStartTime(timed('09:00', '10:00'), '23:30').endTime).toBe('23:59');
  });
  it('사용자가 직접 고른 종료는 시작보다 뒤면 유지', () => {
    const f = withScheduleEndTime(timed('09:00', '10:00'), '17:00');
    expect(withScheduleStartTime(f, '13:00').endTime).toBe('17:00');
  });
  it('자정을 넘는 기존 일정은 시작을 바꿔도 종료를 고치지 않는다', () => {
    const cross = { date: '2026-11-02', endDate: '2026-11-03', allDay: false, startTime: '23:30', endTime: '00:30' };
    expect(scheduleEventWriteTimes(cross)).toEqual({ allDay: false, startTime: '23:30', endTime: '00:30' });
    expect(withScheduleStartTime(cross, '23:00').endTime).toBe('00:30');
  });
  it('종일 ↔ 시간 지정 전환', () => {
    expect(scheduleEventWriteTimes({ ...day, allDay: true, startTime: '09:00', endTime: '10:00' })).toEqual({ allDay: true, startTime: null, endTime: null });
    const on = setScheduleTimeSpecified({ ...day, allDay: true, startTime: '09:00', endTime: '10:00' }, true);
    expect(on).toMatchObject({ allDay: false, startTime: '09:00', endTime: '10:00' });
    expect(setScheduleTimeSpecified(on, false).allDay).toBe(true);
  });
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function Harness() {
  const [openField, setOpenField] = useState<'start' | 'end' | null>(null);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  return (
    <View>
      <ScheduleTimeField label="시작 시간" value={start} open={openField === 'start'} onOpenChange={(n) => setOpenField(n ? 'start' : null)} onChange={setStart} />
      <ScheduleTimeField label="종료 시간" value={end} open={openField === 'end'} onOpenChange={(n) => setOpenField(n ? 'end' : null)} onChange={setEnd} />
      {openField === 'start' ? <ScheduleTimePicker label="시작 시간" value={start} onChange={setStart} /> : null}
      {openField === 'end' ? <ScheduleTimePicker label="종료 시간" value={end} onChange={setEnd} /> : null}
    </View>
  );
}

describe('시간 선택 줄은 하나만 보인다', () => {
  it('종료를 열면 시작 선택 줄은 닫힌다', () => {
    const ui = render(
      <SafeAreaProvider initialMetrics={metrics}>
        <DesignSystemProvider>
          <Harness />
        </DesignSystemProvider>
      </SafeAreaProvider>,
    );
    fireEvent.press(ui.getByRole('button', { name: '시작 시간 시간 열기' }));
    expect(ui.getAllByLabelText(/시간 선택$/)).toHaveLength(1);
    expect(ui.getByLabelText('시작 시간 시간 선택')).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '종료 시간 시간 열기' }));
    expect(ui.getAllByLabelText(/시간 선택$/)).toHaveLength(1);
    expect(ui.queryByLabelText('시작 시간 시간 선택')).toBeNull();
    fireEvent.press(ui.getByRole('button', { name: '종료 시간 시간 열기' }));
    expect(ui.queryAllByLabelText(/시간 선택$/)).toHaveLength(0);
  });
  it('ScheduleScreen 은 제어 모드로 한 줄만, 필드 행 밖에 그린다', () => {
    const src = readFileSync(join(__dirname, '../ScheduleScreen.tsx'), 'utf8');
    expect(src).toMatch(/openTimeField === 'start'/);
    expect(src).toMatch(/<ScheduleTimePicker label="시작 시간"/);
    const field = readFileSync(join(__dirname, '../ScheduleTimeField.tsx'), 'utf8');
    expect(field).not.toMatch(/flexWrap: 'wrap'/);
  });
});
