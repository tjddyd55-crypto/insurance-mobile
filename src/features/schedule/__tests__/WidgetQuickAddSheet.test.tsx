import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { WidgetQuickAddSheet, type QuickAddCustomer } from '../WidgetQuickAddSheet';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const customers: QuickAddCustomer[] = [{ id: '42', name: '홍길동', phone: '01012345678' }];

function sheet(onSubmit = jest.fn(), kind: 'schedule' | 'todo' = 'schedule', onNeedCustomers = jest.fn()) {
  const ui = render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DesignSystemProvider>
        <WidgetQuickAddSheet
          open
          kind={kind}
          date="2026-10-22"
          customers={customers}
          onClose={jest.fn()}
          onSubmit={onSubmit}
          onNeedCustomers={onNeedCustomers}
        />
      </DesignSystemProvider>
    </SafeAreaProvider>,
  );
  return { ui, onSubmit, onNeedCustomers };
}

describe('위젯 빠른 추가 시트', () => {
  it('제목과 확인만 누르면 고른 날짜, 종일, 고객 없음', () => {
    const { ui, onSubmit, onNeedCustomers } = sheet();
    expect(ui.getByRole('button', { name: '부가정보' })).toBeTruthy();
    expect(ui.queryByText('종일')).toBeNull();
    expect(ui.queryByText('반복')).toBeNull();
    expect(ui.queryByText('별표')).toBeNull();
    fireEvent.changeText(ui.getByPlaceholderText('새 일정'), '고객 미팅');
    fireEvent.press(ui.getByRole('button', { name: '확인' }));
    expect(onNeedCustomers).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith({
      title: '고객 미팅',
      date: '2026-10-22',
      time: '',
      endTime: '',
      customerId: null,
      customerName: '',
    });
  });

  it('부가정보의 날짜는 칸을 누르면 바뀌고, 시간은 달력 대신 종일에서 시작한다', () => {
    const { ui, onSubmit } = sheet();
    fireEvent.press(ui.getByRole('button', { name: '부가정보' }));
    fireEvent.press(ui.getByRole('button', { name: '10월 23일 (금)' }));
    fireEvent.press(ui.getByRole('button', { name: /^시간$/ }));
    expect(ui.queryByRole('button', { name: '10월 23일 (금)' })).toBeNull();
    expect(ui.getByText('종일')).toBeTruthy();
    expect(ui.queryByRole('button', { name: '시작 시간 시간 열기' })).toBeNull();
    fireEvent.press(ui.getByRole('button', { name: '시간 지정' }));
    expect(ui.getByText('오전 9:00 ~ 오전 10:00')).toBeTruthy();
    expect(ui.getByRole('button', { name: '시작 시간 시간 열기' })).toBeTruthy();
    expect(ui.getByRole('button', { name: '종료 시간 시간 열기' })).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '시간 지정' }));
    expect(ui.getByText('종일')).toBeTruthy();
    fireEvent.changeText(ui.getByPlaceholderText('새 일정'), '미팅');
    fireEvent.press(ui.getByRole('button', { name: '확인' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '미팅',
      date: '2026-10-23',
      time: '',
      endTime: '',
      customerId: null,
      customerName: '',
    });
  });

  it('시간 지정을 켠 일정은 09:00~10:00 으로 저장하고, 고객은 검색 뒤에 고르고 해제한다', () => {
    const { ui, onSubmit, onNeedCustomers } = sheet();
    fireEvent.press(ui.getByRole('button', { name: '부가정보' }));
    fireEvent.press(ui.getByRole('button', { name: /^시간$/ }));
    fireEvent.press(ui.getByRole('button', { name: '시간 지정' }));
    fireEvent.press(ui.getByRole('button', { name: '고객 연결' }));
    expect(onNeedCustomers).toHaveBeenCalled();
    expect(ui.queryByRole('button', { name: '시작 시간 시간 열기' })).toBeNull();
    fireEvent.changeText(ui.getByPlaceholderText('이름 또는 전화번호 2글자 이상'), '홍길');
    fireEvent.press(ui.getByRole('button', { name: '홍길동' }));
    expect(ui.getByRole('button', { name: '홍길동 해제' })).toBeTruthy();
    fireEvent.press(ui.getByRole('button', { name: '홍길동 해제' }));
    expect(ui.queryByRole('button', { name: '홍길동 해제' })).toBeNull();
    fireEvent.press(ui.getByRole('button', { name: '고객 연결' }));
    fireEvent.changeText(ui.getByPlaceholderText('이름 또는 전화번호 2글자 이상'), '홍길');
    fireEvent.press(ui.getByRole('button', { name: '홍길동' }));
    fireEvent.changeText(ui.getByPlaceholderText('새 일정'), '미팅');
    fireEvent.press(ui.getByRole('button', { name: '확인' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '미팅',
      date: '2026-10-22',
      time: '09:00',
      endTime: '10:00',
      customerId: '42',
      customerName: '홍길동',
    });
  });

  it('할 일 부가정보에는 시간 칸이 없다', () => {
    const { ui, onSubmit } = sheet(jest.fn(), 'todo');
    fireEvent.press(ui.getByRole('button', { name: '부가정보' }));
    expect(ui.queryByRole('button', { name: /^시간$/ })).toBeNull();
    expect(ui.queryByText('종일')).toBeNull();
    fireEvent.changeText(ui.getByPlaceholderText('새 할 일'), '서류');
    fireEvent.press(ui.getByRole('button', { name: '확인' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: '서류',
      date: '2026-10-22',
      time: '',
      endTime: '',
      customerId: null,
      customerName: '',
    });
  });
});
