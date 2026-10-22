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
import { dateFromHm, hmFromDate, ScheduleTimeField } from '../ScheduleTimeField';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function field(props: { label: string; value: string; onChange: (value: string) => void; optional?: boolean }) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DesignSystemProvider>
        <ScheduleTimeField {...props} />
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
}

describe('일정 시각 시계', () => {
  it('시계에서 고른 시·분을 HH:mm 으로 넣는다', () => {
    expect(hmFromDate(dateFromHm('09:05'))).toBe('09:05');
    const onChange = jest.fn();
    const ui = field({ label: '시작 시각', value: '09:00', onChange });
    fireEvent.press(ui.getByRole('button', { name: '시작 시각 시계 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '시계 다이얼' }));
    fireEvent.press(ui.getByRole('button', { name: '완료' }));
    expect(onChange).toHaveBeenCalledWith('14:30');
  });

  it('취소하면 저장된 시각을 유지하고, 선택 시각은 지울 수 있다', () => {
    const onChange = jest.fn();
    const ui = field({ label: '시각', value: '09:00', onChange, optional: true });
    fireEvent.press(ui.getByRole('button', { name: '시각 시계 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '시계 다이얼' }));
    fireEvent.press(ui.getByRole('button', { name: '취소' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(ui.getByRole('button', { name: '시각 지우기' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
