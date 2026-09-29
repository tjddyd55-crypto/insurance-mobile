import type { CardPaymentContract, PaymentCard } from './types';

export function currentKoreaMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find((part) => part.type === 'year')?.value ?? now.getFullYear()}-${parts.find((part) => part.type === 'month')?.value ?? String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function cardDisplay(card: PaymentCard | CardPaymentContract['card']): string {
  if (!card) return '연결 안 함';
  const masked = card.cardNumberDisplay?.trim() || (card.cardNumberLast4 ? `•••• ${card.cardNumberLast4}` : '번호 미표시');
  return `${card.label?.trim() || '카드'} · ${masked}`;
}

export function formatPremium(amount: number | null): string {
  return amount == null || !Number.isFinite(amount) ? '보험료 미입력' : `${amount.toLocaleString('ko-KR')}원`;
}

export function monthStatusMeta(status: CardPaymentContract['monthStatus']): { label: string; tone: 'success' | 'warning' | 'default' } {
  if (status === 'COMPLETED') return { label: '이번 달 완료', tone: 'success' };
  if (status === 'PAUSED') return { label: '보류', tone: 'default' };
  return { label: '처리 필요', tone: 'warning' };
}

export function validateCardInput(input: { cardOwnerName: string; cardNumber: string; month: string; year: string }, editing: boolean): string | null {
  if (!input.cardOwnerName.trim()) return '카드 소유주를 입력해 주세요.';
  const digits = input.cardNumber.replace(/\D/g, '');
  if (!editing && digits.length < 13) return '올바른 카드번호를 입력해 주세요.';
  if (editing && input.cardNumber.trim() && digits.length < 13) return '올바른 카드번호를 입력해 주세요.';
  const month = Number(input.month); const year = Number(input.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) return '유효기간 월은 1~12로 입력해 주세요.';
  if (!Number.isInteger(year) || year < 2000 || year > 2199) return '유효기간 연도는 4자리로 입력해 주세요.';
  return null;
}
