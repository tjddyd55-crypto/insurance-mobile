const ROLE_LABELS: Record<string, string> = {
  USER: '설계사',
  GA_ADMIN: 'GA 관리자',
  GA_STAFF: 'GA 직원',
  SUPER_ADMIN: '시스템 관리자',
  INSURER_MANAGER: '보험사 담당자',
  LOSS_ADJUSTER: '손해사정사',
};

export function formatProfileRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function formatProfileOrganization(
  gaName?: string | null,
  gaCode?: string | null,
): string {
  return gaName?.trim() || gaCode?.trim() || '소속 정보 없음';
}
