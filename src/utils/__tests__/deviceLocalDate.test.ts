import { buildCoverageNativePdfHtml } from '../../features/coverage-simulator/coverageNativePdfHtml';
import { formatConsultationListDate } from '../../features/coverage-simulator/coverageAnalysis';
import { formatCoverageShareDate } from '../../features/coverage-simulator/coverageShareModel';
import type { CoverageScenario } from '../../features/coverage-simulator/types';
import { consultationListDateLabel, consultationPreviewDate } from '../../features/customer-workspace/customerWorkspaceModel';
import type { Consultation } from '../../features/customer-workspace/types';
import { normalizeNotification, notificationReferenceDate } from '../../features/notifications/notificationModel';
import { formatTaBirthDate } from '../../features/ta-call/taCallPresentation';
import { formatTodoDate } from '../../features/todos/todoModel';
import { formatTodoCreatedDate } from '../../features/todos/todoPresentation';
import { formatDeviceLocalDateDots, formatDeviceLocalYmd } from '../deviceLocalDate';

const SEOUL_INSTANT = '2026-09-30T16:30:00Z';

describe('device local dates', () => {
  it('renders an ISO instant as the Asia/Seoul calendar date', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Asia/Seoul');
    expect(new Date(SEOUL_INSTANT).getFullYear()).toBe(2026);
    expect(new Date(SEOUL_INSTANT).getMonth()).toBe(9);
    expect(new Date(SEOUL_INSTANT).getDate()).toBe(1);
    expect(formatDeviceLocalDateDots(SEOUL_INSTANT)).toBe('2026.10.01');
    expect(formatDeviceLocalYmd(SEOUL_INSTANT)).toBe('2026-10-01');
    expect(formatConsultationListDate(SEOUL_INSTANT)).toBe('2026.10.01');
    expect(formatCoverageShareDate(SEOUL_INSTANT)).toBe('2026.10.01 01:30');
  });

  it('keeps a date-only calendar value on that day', () => {
    expect(formatConsultationListDate('2026-09-30')).toBe('2026.09.30');
    expect(formatConsultationListDate('')).toBe('—');
    expect(formatConsultationListDate('not-a-date')).toBe('—');
  });

  it('prints the coverage PDF written date in local time', () => {
    const html = buildCoverageNativePdfHtml(scenarioWithDate(SEOUL_INSTANT));
    expect(html).toContain('작성일 2026.10.01');
    expect(html).not.toContain('2026.09.30');
  });

  it('uses the local day on other screens that used to slice the UTC date', () => {
    expect(formatTodoCreatedDate(SEOUL_INSTANT)).toContain('2026-10-01');
    expect(formatTodoDate(SEOUL_INSTANT)).toContain('10월 1일');
    expect(formatTaBirthDate(SEOUL_INSTANT)).toBe('2026-10-01');
    expect(formatTaBirthDate('1990-01-02T00:00:00.000Z')).toBe('1990-01-02');
    expect(formatTaBirthDate('1990-01-02')).toBe('1990-01-02');

    const consultation = consultationRow(SEOUL_INSTANT);
    expect(consultationPreviewDate(consultation)).toBe('2026-10-01');
    expect(consultationListDateLabel({ consultationDate: '2026-09-30', createdAt: SEOUL_INSTANT })).toBe(
      '2026-09-30',
    );
    expect(consultationListDateLabel({ consultationDate: null, createdAt: SEOUL_INSTANT })).toBe('2026-10-01');

    const claim = normalizeNotification({
      id: 'claim-seoul',
      type: 'claim_request_received',
      createdAt: SEOUL_INSTANT,
    });
    expect(notificationReferenceDate(claim)).toBe('2026-10-01');
  });
});

function scenarioWithDate(consultationDate: string): CoverageScenario {
  return {
    id: 's1',
    title: '암 치료',
    diseaseType: 'cancer',
    description: '',
    consultationDate,
    items: [],
    createdAt: consultationDate,
    updatedAt: consultationDate,
  };
}

function consultationRow(createdAt: string): Consultation {
  return {
    id: 1,
    customerId: 9,
    body: '상담',
    consultationDate: createdAt,
    createdAt,
  };
}
