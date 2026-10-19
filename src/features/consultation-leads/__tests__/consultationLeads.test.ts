import { ApiError } from '../../../api/client';
import { describeApiError } from '../../../api/apiErrorCopy';
import {
  countNewLeads,
  consultationChannelLabel,
  consultationLeadStatusLabel,
  formatLeadDateTime,
  formatLeadPhone,
  leadDialUrl,
  leadMessagePreview,
  leadStatusActions,
  normalizeConsultationLeadId,
  normalizeConsultationLeadItem,
  normalizeConsultationLeadList,
} from '../consultationLeadModel';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const LEAD_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const row = (patch: Record<string, unknown> = {}) => ({
  id: LEAD_ID,
  advisorUserId: 'u1',
  visitorName: '홍길동',
  phoneNormalized: '01012345678',
  phoneDisplay: '010 1234 5678',
  message: '실손 보험 상담을 받고 싶습니다. 저녁 시간이 좋아요.',
  contactChannel: 'kakao',
  privacyConsent: true,
  privacyConsentAt: '2026-10-19T01:00:00.000Z',
  privacyPolicyVersion: 'v1',
  status: 'new',
  checkedAt: null,
  completedAt: null,
  createdAt: '2026-10-19T01:00:00.000Z',
  updatedAt: null,
  ...patch,
});

describe('consultation leads model', () => {
  it('normalizes list + newCount (badge counts status=new)', () => {
    const list = normalizeConsultationLeadList({ items: [row(), row({ id: 'b', status: 'checked' }), row({ id: 'c', status: 'COMPLETED' })], newCount: 1 });
    expect(list.items.map((item) => item.status)).toEqual(['new', 'checked', 'completed']);
    expect(list.newCount).toBe(1);
    expect(countNewLeads(list.items)).toBe(1);
    expect(normalizeConsultationLeadList({ items: [row(), row({ id: 'z' })] }).newCount).toBe(2);
    expect(normalizeConsultationLeadList({ items: [] })).toEqual({ items: [], newCount: 0 });
    expect(() => normalizeConsultationLeadList({})).toThrow(ApiError);
  });

  it('normalizes detail payload { item }', () => {
    const lead = normalizeConsultationLeadItem({ item: row() });
    expect(lead.visitorName).toBe('홍길동');
    expect(() => normalizeConsultationLeadItem({})).toThrow(ApiError);
  });

  it('labels, preview, phone, dial urls and time in KST', () => {
    expect(['new', 'checked', 'completed'].map((status) => consultationLeadStatusLabel(status as never))).toEqual(['신규', '확인', '완료']);
    expect(consultationChannelLabel('kakao')).toBe('카카오톡');
    expect(leadMessagePreview('a'.repeat(60)).length).toBe(48);
    expect(formatLeadPhone(normalizeConsultationLeadItem({ item: row() }))).toBe('010-1234-5678');
    expect(leadDialUrl({ phoneNormalized: '01012345678' })).toBe('tel:01012345678');
    expect(leadDialUrl({ phoneNormalized: '01012345678' }, 'sms')).toBe('sms:01012345678');
    expect(leadDialUrl({ phoneNormalized: '' })).toBeNull();
    expect(formatLeadDateTime('2026-10-19T01:00:00.000Z')).toBe('2026.10.19 10:00');
    expect(formatLeadDateTime(null)).toBe('—');
  });

  it('status actions: 신규→확인/완료, 확인→완료, 완료→없음', () => {
    expect(leadStatusActions('new')).toEqual({ check: true, complete: true });
    expect(leadStatusActions('checked')).toEqual({ check: false, complete: true });
    expect(leadStatusActions('completed')).toEqual({ check: false, complete: false });
  });

  it('accepts only UUID lead ids (deep link by leadId)', () => {
    expect(normalizeConsultationLeadId(LEAD_ID.toUpperCase())).toBe(LEAD_ID);
    expect(normalizeConsultationLeadId('123')).toBeNull();
    expect(normalizeConsultationLeadId(undefined)).toBeNull();
  });

  it('error copy for 401/403/404/5xx', () => {
    expect(describeApiError(new ApiError('', 401), 'x')).toContain('로그인');
    expect(describeApiError(new ApiError('', 403), 'x')).toContain('권한');
    expect(describeApiError(new ApiError('', 404), 'x')).toContain('찾을 수 없습니다');
    expect(describeApiError(new ApiError('boom', 503), 'x')).toContain('서버');
    expect(describeApiError(new ApiError('상담 신청을 찾을 수 없습니다.', 404), 'x')).toBe('상담 신청을 찾을 수 없습니다.');
    expect(describeApiError(null, 'fallback')).toBe('fallback');
  });
});

describe('consultation leads API', () => {
  const client = jest.requireMock('../../../api/client') as { apiRequest: jest.Mock };
  const api = jest.requireActual('../consultationLeadsApi') as typeof import('../consultationLeadsApi');

  beforeEach(() => client.apiRequest.mockReset());

  it('uses the existing /api/me/advisor-consultation-leads endpoints', async () => {
    client.apiRequest.mockResolvedValueOnce({ items: [row()], newCount: 1 });
    await api.listConsultationLeads('tok');
    expect(client.apiRequest).toHaveBeenLastCalledWith('/api/me/advisor-consultation-leads', { token: 'tok' });

    client.apiRequest.mockResolvedValueOnce({ item: row() });
    await api.getConsultationLead('tok', LEAD_ID);
    expect(client.apiRequest).toHaveBeenLastCalledWith(`/api/me/advisor-consultation-leads/${LEAD_ID}`, { token: 'tok' });

    client.apiRequest.mockResolvedValueOnce({ item: row({ status: 'checked' }) });
    const updated = await api.updateConsultationLeadStatus('tok', LEAD_ID, 'checked');
    expect(updated.status).toBe('checked');
    expect(client.apiRequest).toHaveBeenLastCalledWith(`/api/me/advisor-consultation-leads/${LEAD_ID}`, {
      method: 'PATCH',
      token: 'tok',
      body: JSON.stringify({ status: 'checked' }),
    });
  });

  it('rejects without a token', async () => {
    await expect(api.listConsultationLeads(null)).rejects.toMatchObject({ status: 401 });
  });

  it('never creates customers from leads', () => {
    for (const file of ['consultationLeadsApi.ts', 'ConsultationLeadsScreen.tsx', 'ConsultationLeadDetailScreen.tsx']) {
      const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      expect(source).not.toMatch(/\/api\/customers|createCustomer|customers\/new/);
    }
    const detail = fs.readFileSync(path.join(__dirname, '..', 'ConsultationLeadDetailScreen.tsx'), 'utf8');
    expect(detail).toContain("leadDialUrl(lead, 'tel')");
    expect(detail).toContain('Linking.openURL(tel)');
  });
});
