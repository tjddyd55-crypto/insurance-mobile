import { apiRequest } from './client';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'GA_ADMIN'
  | 'GA_STAFF'
  | 'USER'
  | 'INSURER_MANAGER'
  | 'LOSS_ADJUSTER';

export type AuthSubscription = {
  plan: 'FREE' | 'TRIAL' | 'PAID' | 'EXPIRED';
  effectiveStatus: 'ACTIVE' | 'EXPIRED';
  startedAt: string | null;
  expiresAt: string | null;
  remainingDays: number | null;
  reason: string;
  policyActive: boolean;
};

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  gaId: number;
  gaCode: string;
  gaName: string;
  companyId: number | null;
  displayName: string;
  teamId: string | null;
  tenantCode: string;
  subscription: AuthSubscription | null;
}

export interface LoginResponse {
  authKind?: 'STANDARD' | 'BOARD_WRITER';
  token: string;
  user?: {
    id: string;
    username: string;
    role: UserRole;
    ga_id: number | null;
    ga_code?: string;
    ga_name?: string;
    company_id?: number | null;
    display_name?: string | null;
    team_id?: string | null;
    tenant_code?: string | null;
    subscription?: SubscriptionResponse | null;
  };
}

export interface LoginSessionResult {
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  id: string;
  username: string;
  role: UserRole;
  ga_id?: number | null;
  ga_code?: string;
  ga_name?: string;
  company_id?: number | null;
  display_name?: string | null;
  team_id?: string | null;
  tenant_code?: string | null;
  subscription?: SubscriptionResponse | null;
}

type SubscriptionResponse = {
  plan?: string | null;
  effective_status?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  remaining_days?: number | null;
  reason?: string | null;
  policy_active?: boolean;
};

function toAuthSubscription(raw: SubscriptionResponse | null | undefined): AuthSubscription | null {
  if (!raw) return null;
  const effectiveStatus = raw.effective_status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';
  const plan = ['FREE', 'TRIAL', 'PAID', 'EXPIRED'].includes(String(raw.plan).toUpperCase())
    ? String(raw.plan).toUpperCase() as AuthSubscription['plan']
    : 'FREE';
  return {
    plan,
    effectiveStatus,
    startedAt: raw.started_at ?? null,
    expiresAt: raw.expires_at ?? null,
    remainingDays: typeof raw.remaining_days === 'number' ? raw.remaining_days : null,
    reason: String(raw.reason ?? ''),
    policyActive: raw.policy_active === true,
  };
}

function toAuthUser(raw: NonNullable<LoginResponse['user']> | MeResponse): AuthUser {
  const gaIdRaw = 'ga_id' in raw ? raw.ga_id : null;
  const gaId =
    typeof gaIdRaw === 'number' && Number.isInteger(gaIdRaw) && gaIdRaw > 0 ? gaIdRaw : 0;
  const gaCode =
    typeof raw.ga_code === 'string' ? raw.ga_code.trim().toUpperCase() : '';
  const gaName = typeof raw.ga_name === 'string' ? raw.ga_name.trim() : '';
  const companyIdRaw = raw.company_id;
  const companyId =
    typeof companyIdRaw === 'number' && Number.isInteger(companyIdRaw) && companyIdRaw > 0
      ? companyIdRaw
      : null;
  const displayName =
    typeof raw.display_name === 'string' && raw.display_name.trim()
      ? raw.display_name.trim()
      : String(raw.username ?? '').trim();
  const teamId =
    typeof raw.team_id === 'string' && raw.team_id.trim() ? raw.team_id.trim() : null;

  return {
    id: String(raw.id),
    username: String(raw.username),
    role: raw.role,
    gaId,
    gaCode,
    gaName,
    companyId: raw.role === 'INSURER_MANAGER' ? companyId : null,
    displayName,
    teamId,
    tenantCode: String(raw.tenant_code ?? '').trim().toLowerCase(),
    subscription: toAuthSubscription(raw.subscription),
  };
}

/** POST /api/auth/login — exact contract from insurance authApi */
export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginSessionResult> {
  const raw = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: username.trim(), password }),
  });

  if (raw.authKind === 'BOARD_WRITER') {
    throw new Error('게시판 작성자 계정은 Native 앱에서 지원하지 않습니다.');
  }
  if (!raw.user) {
    throw new Error('로그인 응답이 올바르지 않습니다.');
  }

  return {
    token: raw.token,
    user: toAuthUser(raw.user),
  };
}

/** GET /api/me — session validation */
export async function fetchMe(token: string): Promise<AuthUser> {
  const raw = await apiRequest<MeResponse>('/api/me', {
    method: 'GET',
    token,
  });
  return toAuthUser(raw);
}

/**
 * Server logout endpoint: not used by current web AuthProvider (client-side clear only).
 * Kept as explicit no-op documentation for Native parity.
 */
export async function logoutOnServer(_token: string): Promise<void> {
  return;
}
