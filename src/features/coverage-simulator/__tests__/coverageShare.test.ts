import { ApiError } from '../../../api/client';
import {
  createCoverageSimulationShare,
  coverageConsultationSharesPath,
  coverageShareRevokePath,
  listCoverageSimulationShares,
  revokeCoverageSimulationShare,
} from '../coverageShareApi';
import {
  COVERAGE_SHARE_COPY,
  COVERAGE_SHARE_MAX_SNAPSHOT_CHARS,
  buildCoverageShareWebSharePayload,
  buildReactNativeShareContent,
  coverageScenarioCanBeShared,
  coverageShareButtonLabel,
  formatCoverageShareDate,
  mapCoverageShareCreateError,
  mapCoverageShareHistoryError,
  prepareScenarioSnapshotForShare,
} from '../coverageShareModel';
import { createScenarioFromTemplate } from '../templates';
import type { CoverageScenario } from '../types';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return {
    ...actual,
    apiRequest: jest.fn(),
  };
});

const { apiRequest } = jest.requireMock('../../../api/client') as { apiRequest: jest.Mock };

function cancerScenario(): CoverageScenario {
  const scenario = createScenarioFromTemplate('cancer', { id: 'customer-1', name: '홍길동' });
  if (!scenario) throw new Error('cancer template missing');
  return { ...scenario, id: 'scenario-1' };
}

describe('coverage share copy and eligibility', () => {
  it('matches the PC share message and keeps the server URL intact', () => {
    const shareUrl = 'https://insurance-dev.up.railway.app/coverage/share/token-1';
    const payload = buildCoverageShareWebSharePayload({
      shareUrl,
      customerName: '홍길동',
      title: '암 치료',
    });
    expect(payload).toEqual({
      title: '암 치료',
      text: '홍길동 고객님께 보내는 보장 상담자료를 보내드립니다. 아래 링크에서 기존 보장과 제안 보장을 확인하실 수 있습니다.',
      url: shareUrl,
    });
    expect(payload.text).toContain('보장 상담자료를 보내드립니다');
    expect(payload.url).toBe(shareUrl);
    expect(buildReactNativeShareContent(payload, 'ios').message).toBe(payload.text);
    expect(buildReactNativeShareContent(payload, 'android').message).toContain(shareUrl);
    expect(COVERAGE_SHARE_COPY.dialogTitle).toBe('고객에게 공유');
    expect(COVERAGE_SHARE_COPY.revoke).toBe('공유 중지');
    expect(coverageShareButtonLabel(false)).toBe('공유');
    expect(coverageShareButtonLabel(true)).toBe('공유 중…');
  });

  it('disables sharing when there is no coverage item', () => {
    const scenario = cancerScenario();
    expect(coverageScenarioCanBeShared(scenario)).toBe(true);
    expect(coverageScenarioCanBeShared({ ...scenario, items: [] })).toBe(false);
    expect(coverageScenarioCanBeShared({
      ...scenario,
      items: [{ id: 'marker-1', type: 'time-marker', label: '1년 후', order: 0 }],
    })).toBe(false);
  });

  it('formats share history dates the same way as PC', () => {
    const iso = '2026-09-26T03:04:00.000Z';
    const date = new Date(iso);
    const expected = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('.');
    expect(formatCoverageShareDate(iso).startsWith(`${expected} `)).toBe(true);
    expect(formatCoverageShareDate('not-a-date')).toBe('not-a-date');
  });
});

describe('coverage share errors and save-before-share', () => {
  it('maps login, permission, and network failures without leaking the server text', () => {
    const expired = mapCoverageShareCreateError(new ApiError('인증이 만료되었거나 유효하지 않습니다.', 401));
    expect(expired).toContain('로그인이 만료');
    expect(expired).not.toContain('유효하지 않습니다');
    expect(mapCoverageShareCreateError(new ApiError('offline', 0))).toBe('offline');
    expect(mapCoverageShareCreateError(new ApiError(' ', 0))).toContain('서버에 연결할 수 없습니다');
    expect(mapCoverageShareHistoryError(new ApiError('x', 403))).toContain('권한');
    expect(mapCoverageShareCreateError(new Error('boom'))).toContain('공유 링크를 생성하지 못했습니다');
  });

  it('saves a dirty scenario before sharing, and leaves a clean scenario untouched', async () => {
    const scenario = cancerScenario();
    const confirmSave = jest.fn().mockResolvedValue(true);
    const save = jest.fn().mockImplementation(async (current: CoverageScenario) => ({
      ...current,
      title: '저장본',
    }));
    const dirty = await prepareScenarioSnapshotForShare({
      scenario,
      dirty: true,
      persisted: true,
      confirmSave,
      save,
    });
    expect(confirmSave).toHaveBeenCalledTimes(1);
    expect(dirty).toMatchObject({ ok: true, scenario: { title: '저장본', id: 'scenario-1' } });

    const cancelled = await prepareScenarioSnapshotForShare({
      scenario,
      dirty: true,
      persisted: false,
      confirmSave: async () => false,
      save,
    });
    expect(cancelled).toEqual({ ok: false, reason: 'cancelled' });

    const clean = await prepareScenarioSnapshotForShare({
      scenario,
      dirty: false,
      persisted: true,
      confirmSave,
      save,
    });
    expect(clean).toMatchObject({ ok: true, scenario: { title: scenario.title, customerNameSnapshot: '홍길동' } });
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('coverage share API', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('posts the current scenario snapshot and returns the server shareUrl', async () => {
    const scenario = cancerScenario();
    const shareUrl = 'https://insurance-dev.up.railway.app/coverage/share/abc';
    apiRequest.mockResolvedValue({
      shareId: '42',
      shareUrl,
      createdAt: '2026-09-26T00:00:00.000Z',
      expiresAt: null,
      pdfReady: false,
    });

    const created = await createCoverageSimulationShare('token', scenario);

    expect(created.shareUrl).toBe(shareUrl);
    expect(created).not.toHaveProperty('shareToken');
    const path = coverageConsultationSharesPath(scenario.id);
    expect(path).toBe('/api/coverage-simulator/consultations/scenario-1/shares');
    expect(path.includes('/api/dev/coverage-simulator/preview-shares')).toBe(false);
    expect(apiRequest).toHaveBeenCalledWith(path, expect.objectContaining({
      method: 'POST',
      token: 'token',
    }));
    const body = JSON.parse(String(apiRequest.mock.calls[0][1].body)) as { scenario: CoverageScenario };
    expect(body.scenario.id).toBe(scenario.id);
    expect(body.scenario.items.length).toBeGreaterThan(0);
    expect(body.scenario.customerNameSnapshot).toBe('홍길동');
  });

  it('rejects a missing login, a relative URL, and an oversized snapshot', async () => {
    const scenario = cancerScenario();
    await expect(createCoverageSimulationShare('  ', scenario)).rejects.toMatchObject({ status: 401 });
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValue({
      shareId: '1',
      shareUrl: '/coverage/share/local',
      createdAt: '',
      expiresAt: null,
      pdfReady: false,
    });
    await expect(createCoverageSimulationShare('token', scenario)).rejects.toMatchObject({ status: 500 });

    const huge = {
      ...scenario,
      items: scenario.items.map((item, index) => (
        index === 0 && item.type === 'coverage'
          ? { ...item, memo: '가'.repeat(COVERAGE_SHARE_MAX_SNAPSHOT_CHARS) }
          : item
      )),
    };
    await expect(createCoverageSimulationShare('token', huge)).rejects.toMatchObject({
      status: 400,
      message: '시나리오 데이터가 너무 큽니다.',
    });
  });

  it('lists absolute links only and revokes by share id', async () => {
    apiRequest.mockResolvedValueOnce({
      shares: [
        {
          shareId: '7',
          title: '암 치료',
          createdAt: '2026-09-26T00:00:00.000Z',
          revokedAt: null,
          lastViewedAt: null,
          viewCount: 1,
          pdfReady: false,
          shareUrl: 'https://insurance-dev.up.railway.app/coverage/share/live',
        },
        {
          shareId: '8',
          title: '중지',
          createdAt: '2026-09-26T00:00:00.000Z',
          revokedAt: '2026-09-26T01:00:00.000Z',
          shareUrl: null,
        },
      ],
    });
    const listed = await listCoverageSimulationShares('token', 'scenario/1');
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/coverage-simulator/consultations/scenario%2F1/shares',
      { token: 'token' },
    );
    expect(listed.shares.map((row) => row.shareUrl)).toEqual([
      'https://insurance-dev.up.railway.app/coverage/share/live',
      null,
    ]);

    apiRequest.mockResolvedValueOnce({ ok: true });
    await revokeCoverageSimulationShare('token', '7');
    expect(coverageShareRevokePath('7')).toBe('/api/coverage-simulator/shares/7/revoke');
    expect(coverageShareRevokePath('7').includes('preview-shares')).toBe(false);
    expect(apiRequest).toHaveBeenLastCalledWith('/api/coverage-simulator/shares/7/revoke', {
      method: 'POST',
      token: 'token',
    });
  });
});
