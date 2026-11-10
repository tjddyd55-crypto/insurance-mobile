import { apiRequest } from '../../../api/client';
import { DEFAULT_SCHEDULE_VIEW_PREFS, normalizeScheduleViewPrefs, saveScheduleViewPrefs } from '../scheduleViewPrefs';
jest.mock('../../../api/client', () => ({ ...jest.requireActual('../../../api/client'), apiRequest: jest.fn() }));
const api = apiRequest as jest.Mock;
beforeEach(() => api.mockReset());
it('distinguishes absent sources from all sources explicitly OFF', () => {
  expect(normalizeScheduleViewPrefs({ prefs: {} })).toEqual(DEFAULT_SCHEDULE_VIEW_PREFS);
  expect(normalizeScheduleViewPrefs({ prefs: { sources: [] } })?.sources).toEqual([]);
  expect(normalizeScheduleViewPrefs({ prefs: { includeCompleted: true } })).toEqual({ ...DEFAULT_SCHEDULE_VIEW_PREFS, includeCompleted: true });
});
it('changes only the selected key and reads the merged PC/server settings', async () => {
  api.mockResolvedValue({ prefs: { sources: [], includeCompleted: true, googleCalendarIds: ['cal-a'], holidayMode: 'none' } });
  const saved = await saveScheduleViewPrefs('fixture', { sources: [] });
  expect(api).toHaveBeenCalledWith('/api/me/schedule-view-prefs', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ prefs: { sources: [] } }) }));
  expect(saved).toMatchObject({ sources: [], includeCompleted: true, googleCalendarIds: ['cal-a'], holidayMode: 'none' });
});
it('does not report success if server did not store requested changes', async () => {
  api.mockResolvedValue({ prefs: { includeCompleted: false } });
  await expect(saveScheduleViewPrefs('fixture', { includeCompleted: true })).rejects.toThrow('저장하지 못했습니다');
});
