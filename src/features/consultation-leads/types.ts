export type ConsultationLeadStatus = 'new' | 'checked' | 'completed';

/** 서버 `/api/me/advisor-consultation-leads` 응답 항목(웹 advisorConsultationLeadsApi 와 같은 필드). */
export type ConsultationLead = {
  id: string;
  visitorName: string;
  phoneNormalized: string;
  phoneDisplay: string;
  message: string;
  contactChannel: string;
  privacyConsent: boolean;
  privacyConsentAt: string | null;
  privacyPolicyVersion: string;
  status: ConsultationLeadStatus;
  checkedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ConsultationLeadList = { items: ConsultationLead[]; newCount: number };
