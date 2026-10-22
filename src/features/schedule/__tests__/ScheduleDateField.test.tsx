import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

describe('일정 날짜 달력', () => {
  it('고른 칸의 YYYY-MM-DD 를 그대로 넣고 하루를 밀지 않는다', () => {
    const onChange = jest.fn();
    const ui = field({ label: '시작일', value: '2026-10-01', onChange });
    fireEvent.press(ui.getByRole('button', { name: '시작일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '10월 1일 (목)' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-01');
    fireEvent.press(ui.getByRole('button', { name: '시작일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '9월 27일 (일)' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-09-27');
  });

  it('달 이동만으로는 날짜가 바뀌지 않는다', () => {
    const onChange = jest.fn();
    const ui = field({ label: '종료일', value: '2026-10-22', onChange });
    fireEvent.press(ui.getByRole('button', { name: '종료일 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '다음 달' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(ui.getByRole('button', { name: '11월 1일 (일)' }));
    expect(onChange).toHaveBeenCalledWith('2026-11-01');
  });

  it('날짜는 날짜 없음으로 비울 수 있다', () => {
    const onChange = jest.fn();
    const ui = field({ label: '날짜', value: '2026-10-22', onChange, clearable: true });
    fireEvent.press(ui.getByRole('button', { name: '날짜 달력 열기' }));
    fireEvent.press(ui.getByRole('button', { name: '날짜 없음' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
