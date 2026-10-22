import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { clockToHm, formatKoreanClock, parseClock, ScheduleTimeField } from '../ScheduleTimeField';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DesignSystemProvider>
        <ScheduleTimeField {...props} />
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
}

describe('일정 시각 선택', () => {
  it('시·분·오전/오후를 한 줄에서 고르고 24시간 HH:mm 으로 올린다', () => {
    expect(formatKoreanClock('09:00')).toBe('오전 9:00');
    expect(formatKoreanClock('14:30')).toBe('오후 2:30');
    expect(clockToHm(parseClock('00:15')!)).toBe('00:15');
    const onChange = jest.fn();
    const ui = field({ label: '시작 시간', value: '09:00', onChange });
    fireEvent.press(ui.getByRole('button', { name: '시작 시간 시간 열기' }));
    expect(ui.getByText('시')).toBeTruthy();
    expect(ui.getByText('분')).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '시 올리기' }));
    expect(onChange).toHaveBeenCalledWith('10:00');
    fireEvent.press(ui.getByRole('button', { name: '분 올리기' }));
    expect(onChange).toHaveBeenCalledWith('09:01');
    fireEvent.press(ui.getByRole('button', { name: '오후' }));
    expect(onChange).toHaveBeenCalledWith('21:00');
  });

  it('HH:mm 입력칸은 없다', () => {
    const ui = field({ label: '종료 시간', value: '10:00', onChange: jest.fn() });
    expect(ui.queryByPlaceholderText('HH:mm')).toBeNull();
  });
});
