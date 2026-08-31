import type { ClaimStatus } from './types';

const LABELS: Record<ClaimStatus, string> = { requested: '요청됨', processing: '처리중', done: '완료', rejected: '반려', canceled: '취소' };
export const CLAIM_STATUSES = (Object.keys(LABELS) as ClaimStatus[]).map((value) => ({ value, label: LABELS[value] }));
export function claimStatusMeta(status: ClaimStatus): { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'default' } { if (status === 'done') return { label: LABELS[status], tone: 'success' }; if (status === 'processing') return { label: LABELS[status], tone: 'warning' }; if (status === 'requested') return { label: LABELS[status], tone: 'info' }; if (status === 'rejected') return { label: LABELS[status], tone: 'danger' }; return { label: LABELS[status], tone: 'default' }; }
export function formatClaimDate(value: string | null): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(date); }
export function claimMessage(title: string, memo: string): string { return [title.trim(), memo.trim()].filter(Boolean).join('\n') || '요청 내용이 없습니다.'; }
export function extractClaimFileUrl(file: { url?: string; downloadUrl?: string }, download = false): string { return String((download ? file.downloadUrl : file.url) || file.url || '').trim(); }
