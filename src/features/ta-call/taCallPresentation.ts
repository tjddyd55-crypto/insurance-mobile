import type { BadgeTone } from '../../design-system';
import { taGenderLabel } from './taCallModel';
import type { TaCallDay, TaCallStatus } from './types';

export function taStatusTone(status: TaCallStatus): BadgeTone {
  if (status === 'completed') return 'success';
  if (status === 'no_answer') return 'warning';
  return 'default';
}

export function taDayStatusTone(day: Pick<TaCallDay, 'isMissionCompleted' | 'isToday'>): BadgeTone {
  return day.isMissionCompleted || day.isToday ? 'success' : 'default';
}

export function formatTaBirthDate(value: string | null): string {
  const raw = value?.trim() ?? '';
  if (!raw) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  return '-';
}

export function formatTaWeekRangeCompactLabel(start: string, end: string): string {
  const formatPart = (value: string) => {
    if (value.length < 10) return value.replace(/-/g, '.');
    return `${value.slice(5, 7)}.${value.slice(8, 10)}`;
  };
  return `${formatPart(start)} ~ ${formatPart(end)}`;
}

export function taWeekProgressPercent(day: Pick<TaCallDay, 'completedCount' | 'dailyTargetCount'>): number {
  if (day.dailyTargetCount <= 0) return 0;
  return Math.min(100, Math.round((day.completedCount / day.dailyTargetCount) * 100));
}

export function taWeekSummaryStatus(
  day: Pick<TaCallDay, 'isFuture' | 'isToday' | 'isMissionCompleted' | 'totalCount' | 'completedCount' | 'dailyTargetCount'>,
): 'scheduled' | 'empty' | 'today' | 'completed' | 'in_progress' {
  if (day.isFuture) return 'scheduled';
  if (day.totalCount === 0) return 'empty';
  if (day.isToday) return 'today';
  if (day.isMissionCompleted || day.completedCount >= day.dailyTargetCount) return 'completed';
  return 'in_progress';
}

export function taDayEmptyCopy(day: TaCallDay): { message: string; subMessage: string | null } {
  if (day.isFuture) {
    return { message: '해당 날짜가 되면 자동으로 전화 대상이 생성됩니다.', subMessage: null };
  }
  return {
    message: day.emptyMessage || (day.isToday
      ? '현재 설정한 조건에 맞는 전화 대상 고객이 없습니다.'
      : '배정 없음'),
    subMessage: day.emptySubMessage ?? '타겟 조건을 변경하거나 고객 정보를 확인해 주세요.',
  };
}

export function taAssignmentMeta(assignment: {
  customerGender: string;
  customerBirthDate: string | null;
}): { gender: string; birthDate: string } {
  return {
    gender: taGenderLabel(assignment.customerGender),
    birthDate: formatTaBirthDate(assignment.customerBirthDate),
  };
}
