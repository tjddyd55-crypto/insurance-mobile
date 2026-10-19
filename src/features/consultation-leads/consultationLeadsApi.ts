import { ApiError, apiRequest } from '../../api/client';
import {
  normalizeConsultationLeadItem,
  normalizeConsultationLeadList,
} from './consultationLeadModel';
import type { ConsultationLead, ConsultationLeadList, ConsultationLeadStatus } from './types';

const BASE = '/api/me/advisor-consultation-leads';

function requireToken(token: string | null): string {
  const result = token?.trim();
  if (!result) throw new ApiError('로그인이 필요합니다.', 401);
  return result;
}

export async function listConsultationLeads(token: string | null): Promise<ConsultationLeadList> {
  return normalizeConsultationLeadList(await apiRequest<unknown>(BASE, { token: requireToken(token) }));
}

export async function getConsultationLead(token: string | null, leadId: string): Promise<ConsultationLead> {
  return normalizeConsultationLeadItem(
    await apiRequest<unknown>(`${BASE}/${encodeURIComponent(leadId)}`, { token: requireToken(token) }),
  );
}

/** 상태만 바꾼다. 고객을 만들지 않는다. */
export async function updateConsultationLeadStatus(
  token: string | null,
  leadId: string,
  status: ConsultationLeadStatus,
): Promise<ConsultationLead> {
  return normalizeConsultationLeadItem(
    await apiRequest<unknown>(`${BASE}/${encodeURIComponent(leadId)}`, {
      method: 'PATCH',
      token: requireToken(token),
      body: JSON.stringify({ status }),
    }),
  );
}
