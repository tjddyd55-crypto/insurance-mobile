import { apiRequest } from '../../../api/client';
import { fetchGoogleAutoSync, saveGoogleAutoSync } from '../googleCalendarAutoSyncApi';
jest.mock('../../../api/client', () => ({ ...jest.requireActual('../../../api/client'), apiRequest: jest.fn() }));
const api = apiRequest as jest.Mock;
const state = { enabled: true, available: true, connected: true, calendarWritable: true, windowDays: 90, syncStatus: 'done', kinds: { todo: true, car_expiry: true, insurance_age_date: false, special_date: true } };
beforeEach(() => api.mockReset());
it('reads the same saved Google settings as Web without exposing account fields', async () => {
  api.mockResolvedValue({ data: { ...state, accountEmail: 'fixture@example.invalid' } });
  await expect(fetchGoogleAutoSync('fixture')).resolves.toEqual(state);
  expect(api).toHaveBeenCalledWith('/api/service-integrations/google/calendar-autosync', expect.objectContaining({ token: 'fixture' }));
});
it('writes only the explicit master and four kinds, then checks the saved response', async () => {
  api.mockResolvedValue(state);
  await saveGoogleAutoSync('fixture', state);
  expect(api).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ enabled: state.enabled, kinds: state.kinds }) }));
});
it('rejects mismatched saves and malformed responses instead of reporting success', async () => {
  api.mockResolvedValueOnce({ ...state, enabled: false });
  await expect(saveGoogleAutoSync('fixture', state)).rejects.toThrow('저장하지 못했습니다');
  api.mockResolvedValueOnce({ enabled: true });
  await expect(fetchGoogleAutoSync('fixture')).rejects.toThrow('상태를 확인하지 못했습니다');
});
it('requires authentication and propagates read failures without fabricating enabled settings', async () => {
  await expect(fetchGoogleAutoSync(null)).rejects.toThrow('로그인이 필요합니다');
  expect(api).not.toHaveBeenCalled();
  api.mockRejectedValueOnce(new Error('offline'));
  await expect(fetchGoogleAutoSync('fixture')).rejects.toThrow('offline');
});
