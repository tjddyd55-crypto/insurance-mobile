/** 1.0.5 출시 게이트 Google 13–17: 앱은 ONE FC API만 쓰고 Google 반영은 서버 best-effort. */
import { apiRequest } from '../../../api/client';
import { createOnefcSchedule, deleteOnefcSchedule, updateOnefcSchedule } from '../scheduleApi';
import { emptyEventForm } from '../scheduleModel';

jest.mock('../../../api/client', () => ({ ...jest.requireActual('../../../api/client'), apiRequest: jest.fn() }));
const req = apiRequest as jest.MockedFunction<typeof apiRequest>;
const fs = jest.requireActual<{ readFileSync: (f: string, e: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...p: string[]) => string }>('path');
declare const __dirname: string;
const screen = fs.readFileSync(path.join(__dirname, '..', 'ScheduleScreen.tsx'), 'utf8');
const ok = { data: { event: { id: 'onefc:5', startAt: '2026-11-02' }, duplicate: false } };
beforeEach(() => req.mockReset());

describe('[Google] 13–17', () => {
  it('13–15. ONE FC 일정 생성/수정/삭제는 /api/schedules 만 호출 (Google write 경로 직접 호출 없음)', async () => {
    req.mockResolvedValue(ok);
    const form = { ...emptyEventForm('2026-11-02'), title: 'g' };
    await createOnefcSchedule('t', form, 'r');
    await updateOnefcSchedule('t', 'onefc:5', form);
    await deleteOnefcSchedule('t', 'onefc:5');
    for (const [url] of req.mock.calls) expect(String(url)).toMatch(/^\/api\/schedules(\/5)?$/);
  });
  it('16. Google 실패와 무관하게 ONE FC 저장 성공 응답이면 성공 처리(롤백 없음)', async () => {
    req.mockResolvedValueOnce({ data: { event: { id: 'onefc:5', startAt: '2026-11-02' }, googleSync: { status: 'failed' } } });
    await expect(createOnefcSchedule('t', { ...emptyEventForm('2026-11-02'), title: 'g' }, 'r')).resolves.toBe('onefc:5');
  });
  it('17. 재시도는 같은 requestId → 서버 duplicate:true 로 한 건 유지(멱등)', async () => {
    req.mockResolvedValueOnce(ok).mockResolvedValueOnce({ data: { ...ok.data, duplicate: true } });
    const form = { ...emptyEventForm('2026-11-02'), title: 'g' };
    const a = await createOnefcSchedule('t', form, 'same');
    const b = await createOnefcSchedule('t', form, 'same');
    expect(a).toBe(b);
    expect(req.mock.calls.map((c) => JSON.parse(String(c[1]?.body)).requestId)).toEqual(['same', 'same']);
    expect(screen).toMatch(/requestId: newScheduleRequestId\(\)/);
  });
});
