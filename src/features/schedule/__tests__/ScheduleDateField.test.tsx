import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (event: { type: string }, date?: Date) => void }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: '시계 다이얼',
          onPress: () => onChange({ type: 'set' }, new Date(2026, 9, 22, 14, 30, 0, 0)),
        },
        React.createElement(Text, null, '시계'),
      ),
  };
});

import { DesignSystemProvider } from '../../../design-system';
import { ScheduleDateField } from '../ScheduleDateField';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function field(props: { label: string; value: string; onChange: (value: string) => void; clearable?: boolean }) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DesignSystemProvider>
        <ScheduleDateField {...props} />
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
}

function finish(ui: ReturnType<typeof field>) {
  fireEvent.press(ui.getByRole('button', { name: '완료' }));
}

describe('일정 날짜 달력', () => {
  it('고른 칸은 완료를 눌러야 YYYY-MM-DD 로 반영되고 하루를 밀지 않는다', () => {
    const onChange = jest.fn();
    const ui = field({ label: '시작일', value: '2026-10-01', onChange });
    fireEvent.press(ui.getByRole('button', { name: '시작일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '10월 1일 (목)' }));
    expect(onChange).not.toHaveBeenCalled();
    finish(ui);
    expect(onChange).toHaveBeenCalledWith('2026-10-01');
    fireEvent.press(ui.getByRole('button', { name: '시작일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '9월 27일 (일)' }));
    finish(ui);
    expect(onChange).toHaveBeenLastCalledWith('2026-09-27');
  });

  it('달 이동이나 취소만으로는 날짜가 바뀌지 않는다', () => {
    const onChange = jest.fn();
    const ui = field({ label: '종료일', value: '2026-10-22', onChange });
    fireEvent.press(ui.getByRole('button', { name: '종료일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '다음 달' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(ui.getByRole('button', { name: '11월 1일 (일)' }));
    fireEvent.press(ui.getByRole('button', { name: '취소' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(ui.getByRole('button', { name: '종료일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '다음 달' }));
    fireEvent.press(ui.getByRole('button', { name: '11월 1일 (일)' }));
    finish(ui);
    expect(onChange).toHaveBeenCalledWith('2026-11-01');
  });

  it('날짜 없음은 완료를 눌러야 비워지고 반복은 없다', () => {
    const onChange = jest.fn();
    const ui = field({ label: '날짜', value: '2026-10-22', onChange, clearable: true });
    fireEvent.press(ui.getByRole('button', { name: '날짜 달력 열기' }));
    expect(ui.getByRole('button', { name: '시간 설정' })).toBeTruthy();
    expect(ui.queryByText('반복')).toBeNull();
    fireEvent.press(ui.getByRole('button', { name: '날짜 없음' }));
    expect(onChange).not.toHaveBeenCalled();
    finish(ui);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('시간 설정은 시계로 고르고 완료 때 같이 반영된다', () => {
    const onComplete = jest.fn();
    const ui = render(
      <SafeAreaProvider initialMetrics={metrics}>
        <DesignSystemProvider>
          <ScheduleDateField label="시작일" value="2026-10-22" time="09:00" onComplete={onComplete} />
        </DesignSystemProvider>
      </SafeAreaProvider>,
    );
    fireEvent.press(ui.getByRole('button', { name: '시작일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '시간 설정' }));
    fireEvent.press(ui.getByRole('button', { name: '시계 다이얼' }));
    finish(ui);
    expect(onComplete).toHaveBeenCalledWith({ date: '2026-10-22', time: '14:30' });
  });

  it('날짜만 고르는 칸에는 시간 설정이 없다', () => {
    const onComplete = jest.fn();
    const ui = render(
      <SafeAreaProvider initialMetrics={metrics}>
        <DesignSystemProvider>
          <ScheduleDateField label="시작일" value="2026-10-22" withTime={false} onComplete={onComplete} />
        </DesignSystemProvider>
      </SafeAreaProvider>,
    );
    fireEvent.press(ui.getByRole('button', { name: '시작일 달력 열기' }));
    expect(ui.queryByRole('button', { name: '시간 설정' })).toBeNull();
    expect(ui.queryByText('반복')).toBeNull();
    finish(ui);
    expect(onComplete).toHaveBeenCalledWith({ date: '2026-10-22', time: '' });
  });
});
