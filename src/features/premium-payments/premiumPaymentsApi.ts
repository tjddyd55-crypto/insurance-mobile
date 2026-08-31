import { ApiError, apiRequest } from '../../api/client';
import type { CardPaymentContract, ContractPayload, PaymentCard, PaymentCardPayload } from './types';

function auth(token: string | null): string { if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401); return token.trim(); }

export async function listPaymentCards(token: string | null, customerId: number): Promise<PaymentCard[]> {
  const data = await apiRequest<{ cards?: PaymentCard[] }>(`/api/customers/${customerId}/payment-cards`, { token: auth(token) });
  return data.cards ?? [];
}
export async function createPaymentCard(token: string | null, customerId: number, payload: PaymentCardPayload) { return apiRequest<PaymentCard>(`/api/customers/${customerId}/payment-cards`, { method: 'POST', token: auth(token), body: JSON.stringify(payload) }); }
export async function updatePaymentCard(token: string | null, customerId: number, cardId: number, payload: PaymentCardPayload) { return apiRequest<PaymentCard>(`/api/customers/${customerId}/payment-cards/${cardId}`, { method: 'PATCH', token: auth(token), body: JSON.stringify(payload) }); }
export async function deletePaymentCard(token: string | null, customerId: number, cardId: number) { await apiRequest(`/api/customers/${customerId}/payment-cards/${cardId}`, { method: 'DELETE', token: auth(token) }); }
export async function listContracts(token: string | null, customerId: number, month: string): Promise<{ targetMonth: string; contracts: CardPaymentContract[] }> { return apiRequest(`/api/customers/${customerId}/card-payment-contracts?month=${encodeURIComponent(month)}`, { token: auth(token) }); }
export async function createContract(token: string | null, customerId: number, payload: ContractPayload) { return apiRequest<CardPaymentContract>(`/api/customers/${customerId}/card-payment-contracts`, { method: 'POST', token: auth(token), body: JSON.stringify(payload) }); }
export async function updateContract(token: string | null, customerId: number, contractId: number, payload: ContractPayload) { return apiRequest<CardPaymentContract>(`/api/customers/${customerId}/card-payment-contracts/${contractId}`, { method: 'PATCH', token: auth(token), body: JSON.stringify(payload) }); }
export async function deleteContract(token: string | null, customerId: number, contractId: number) { await apiRequest(`/api/customers/${customerId}/card-payment-contracts/${contractId}`, { method: 'DELETE', token: auth(token) }); }
export async function setContractCompleted(token: string | null, customerId: number, contractId: number, targetMonth: string, completed: boolean) { return apiRequest<{ targetMonth: string; contract: CardPaymentContract }>(`/api/customers/${customerId}/card-payment-contracts/${contractId}/${completed ? 'complete' : 'reopen'}`, { method: 'POST', token: auth(token), body: JSON.stringify(completed ? { targetMonth } : { targetMonth, setPending: true }) }); }
