import { fireEvent, render } from '@testing-library/react-native';
import { DesignSystemProvider } from '../../../design-system';
import { GoogleCalendarAutoSyncCard } from '../GoogleCalendarAutoSyncCard';
import type { GoogleAutoSyncState } from '../googleCalendarAutoSyncApi';
const state: GoogleAutoSyncState = { enabled: true, available: true, connected: true, calendarWritable: true, windowDays: 90, syncStatus: 'done', kinds: { todo: true, car_expiry: true, insurance_age_date: false, special_date: true } };
function card(value = state, busy = false) {
  const onChange = jest.fn();
  const ui = render(<DesignSystemProvider><GoogleCalendarAutoSyncCard state={value} draft={{ enabled: value.enabled, kinds: { ...value.kinds } }} onChange={onChange} onOpenGoogle={jest.fn()} busy={busy} /></DesignSystemProvider>);
  return { ...ui, onChange };
}
it('shows Web kind selection and makes no changes until the user toggles', () => {
  const ui = card();
  expect(ui.getAllByRole('switch')).toHaveLength(5);
  expect(ui.getByLabelText('Google 자동 연동 상령일 알림').props.value).toBe(false);
  expect(ui.onChange).not.toHaveBeenCalled();
  fireEvent(ui.getByLabelText('Google 자동 연동 상령일 알림'), 'valueChange', true);
  expect(ui.onChange).toHaveBeenCalledWith({ enabled: true, kinds: { ...state.kinds, insurance_age_date: true } });
  expect(state.kinds.insurance_age_date).toBe(false);
});
it('prevents enabling without write permission but permits turning off existing sync', () => {
  const ui = card({ ...state, enabled: false, calendarWritable: false });
  expect(ui.getByLabelText('Google 캘린더 자동 연동').props.disabled).toBe(true);
  expect(ui.getByRole('button', { name: 'Google 연동 관리' })).toBeTruthy();
  ui.unmount();
  const enabled = card({ ...state, calendarWritable: false });
  expect(enabled.getByLabelText('Google 캘린더 자동 연동').props.disabled).toBe(false);
  fireEvent(enabled.getByLabelText('Google 캘린더 자동 연동'), 'valueChange', false);
  expect(enabled.onChange).toHaveBeenCalledWith({ enabled: false, kinds: state.kinds });
});
it('disables controls during saves and explains privacy and OFF cleanup', () => {
  const ui = card(state, true);
  expect(ui.getAllByRole('switch').every(node => node.props.disabled)).toBe(true);
  expect(ui.getByText(/고객 이름이 Google 일정 제목으로 전송/)).toBeTruthy();
  expect(ui.getByText(/당일·지난 일정/)).toBeTruthy();
});
