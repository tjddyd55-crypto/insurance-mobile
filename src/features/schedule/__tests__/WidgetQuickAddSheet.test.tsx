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
import { WidgetQuickAddSheet, type QuickAddCustomer } from '../WidgetQuickAddSheet';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const customers: QuickAddCustomer[] = [{ id: '42', name: '홍길동', phone: '01012345678' }];

function sheet(onSubmit = jest.fn(), kind: 'schedule' | 'todo' = 'schedule') {
  const ui = render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DesignSystemProvider>
        <WidgetQuickAddSheet open kind={kind} date="2026-10-22" customers={customers} onClose={jest.fn()} onSubmit={onSubmit} />
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
  return { ui, onSubmit };
}

describe('위젯 빠른 추가 시트', () => {
  it('제목과 OK만 누르면 고른 날짜, 시각 없음, 고객 없음', () => {
    const { ui, onSubmit } = sheet();
    expect(ui.getByRole('button', { name: '부가정보' })).toBeTruthy();
    expect(ui.queryByText('종일')).toBeNull();
    expect(ui.queryByRole('button', { name: '시작 시간 시계 열기' })).toBeNull();
    expect(ui.queryByText('반복')).toBeNull();
    expect(ui.queryByText('별표')).toBeNull();
    fireEvent.changeText(ui.getByPlaceholderText('새 일정'), '고객 미팅');
    fireEvent.press(ui.getByRole('button', { name: 'OK' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '고객 미팅',
      date: '2026-10-22',
      time: '',
      endTime: '',
      customerId: null,
      customerName: '',
    });
  });

  it('부가정보의 시간은 종일이고, 시간 지정을 끄면 다시 종일로 저장한다', () => {
    const { ui, onSubmit } = sheet();
    fireEvent.press(ui.getByRole('button', { name: '부가정보' }));
    expect(ui.getByText('종일')).toBeTruthy();
    expect(ui.queryByRole('button', { name: '시작 시간 시계 열기' })).toBeNull();
    fireEvent.press(ui.getByRole('button', { name: '시간 지정' }));
    expect(ui.getByRole('button', { name: '시작 시간 시계 열기' })).toBeTruthy();
    expect(ui.getByRole('button', { name: '종료 시간 시계 열기' })).toBeTruthy();
    expect(ui.getByText('09:00 ~ 10:00')).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '시간 지정' }));
    expect(ui.queryByRole('button', { name: '시작 시간 시계 열기' })).toBeNull();
    expect(ui.getByText('종일')).toBeTruthy();
    fireEvent.changeText(ui.getByPlaceholderText('새 일정'), '미팅');
    fireEvent.press(ui.getByRole('button', { name: 'OK' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '미팅',
      date: '2026-10-22',
      time: '',
      endTime: '',
      customerId: null,
      customerName: '',
    });
  });

  it('날짜는 달력만 열고, 시간 지정과 고객 검색은 저장값에 들어간다', () => {
    const { ui, onSubmit } = sheet();
    fireEvent.press(ui.getByRole('button', { name: '부가정보' }));
    fireEvent.press(ui.getByRole('button', { name: '날짜 달력 열기' }));
    expect(ui.queryByRole('button', { name: '시간 설정' })).toBeNull();
    expect(ui.queryByText('반복')).toBeNull();
    fireEvent.press(ui.getByRole('button', { name: '10월 23일 (금)' }));
    fireEvent.press(ui.getByRole('button', { name: '완료' }));
    fireEvent.press(ui.getByRole('button', { name: '시간 지정' }));
    fireEvent.press(ui.getByRole('button', { name: '시작 시간 시계 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '시계 다이얼' }));
    fireEvent.press(ui.getByRole('button', { name: '완료' }));
    fireEvent.press(ui.getByRole('button', { name: '종료 시간 시계 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '시계 다이얼' }));
    fireEvent.press(ui.getByRole('button', { name: '완료' }));
    fireEvent.changeText(ui.getByPlaceholderText('이름 또는 전화번호 2글자 이상'), '홍길');
    fireEvent.press(ui.getByRole('button', { name: '홍길동' }));
    expect(ui.getByRole('button', { name: '홍길동 해제' })).toBeTruthy();
    fireEvent.changeText(ui.getByPlaceholderText('새 일정'), '미팅');
    fireEvent.press(ui.getByRole('button', { name: 'OK' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '미팅',
      date: '2026-10-23',
      time: '14:30',
      endTime: '14:30',
      customerId: '42',
      customerName: '홍길동',
    });
  });

  it('할 일은 시간 지정을 켜면 시각 하나만 고른다', () => {
    const { ui, onSubmit } = sheet(jest.fn(), 'todo');
    fireEvent.press(ui.getByRole('button', { name: '부가정보' }));
    expect(ui.getByText('종일')).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '시간 지정' }));
    expect(ui.queryByRole('button', { name: '시작 시간 시계 열기' })).toBeNull();
    expect(ui.getByRole('button', { name: '시간 시계 열기' })).toBeTruthy();
    fireEvent.changeText(ui.getByPlaceholderText('새 할 일'), '서류');
    fireEvent.press(ui.getByRole('button', { name: 'OK' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '서류',
      date: '2026-10-22',
      time: '09:00',
      endTime: '',
      customerId: null,
      customerName: '',
    });
  });
});
