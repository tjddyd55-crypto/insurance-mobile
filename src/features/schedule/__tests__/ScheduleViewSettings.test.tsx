import { render, fireEvent } from '@testing-library/react-native';
import { DesignSystemProvider } from '../../../design-system';
import { ScheduleViewSettings } from '../ScheduleViewSettings';
import { DEFAULT_SCHEDULE_VIEW_PREFS, SCHEDULE_FILTER_KEYS } from '../scheduleViewPrefs';
it('reflects saved PC sources and emits only the explicit user change', () => {
  const onChange = jest.fn();
  const ui = render(<DesignSystemProvider><ScheduleViewSettings prefs={{ ...DEFAULT_SCHEDULE_VIEW_PREFS, sources: ['insurance_age'] }} onChange={onChange} disabled={false} /></DesignSystemProvider>);
  expect(onChange).not.toHaveBeenCalled();
  expect(ui.getByLabelText('달력 표시 상령일').props.value).toBe(true);
  fireEvent(ui.getByLabelText('달력 표시 상령일'), 'valueChange', false);
  expect(onChange).toHaveBeenCalledWith({ sources: [] });
});
it('disables writes until shared settings have loaded or while saving', () => {
  const ui = render(<DesignSystemProvider><ScheduleViewSettings prefs={DEFAULT_SCHEDULE_VIEW_PREFS} onChange={jest.fn()} disabled /></DesignSystemProvider>);
  expect(ui.getAllByRole('switch')).toHaveLength(SCHEDULE_FILTER_KEYS.length + 1);
  expect(ui.getAllByRole('switch').every(node => node.props.disabled)).toBe(true);
});
