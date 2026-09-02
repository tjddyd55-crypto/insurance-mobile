import type { AuthUser } from '../../api/authApi';
import { findMenuLinkByNativePath } from '../menuConfig';
import {
  buildNativeMenuForSession,
  type NativeMenuCapabilities,
} from '../nativeMenuPolicy';

const capabilities: NativeMenuCapabilities = {
  isTeamOwner: false,
  dynamicNewsletterBoards: undefined,
};

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'designer01',
    role: 'USER',
    gaId: 1,
    gaCode: 'TEST',
    gaName: 'Test GA',
    companyId: null,
    displayName: '테스트 사용자',
    teamId: 'team-1',
    tenantCode: '',
    subscription: {
      plan: 'FREE',
      effectiveStatus: 'ACTIVE',
      startedAt: null,
      expiresAt: null,
      remainingDays: null,
      reason: 'free',
      policyActive: true,
    },
    ...overrides,
  };
}

describe('SMS PC-only native policy', () => {
  it('hides SMS from the native drawer menu', () => {
    const labels = buildNativeMenuForSession(user(), capabilities).flatMap((section) =>
      section.children.map((child) => child.label),
    );
    expect(labels).not.toContain('문자 발송');
    expect(findMenuLinkByNativePath('/sms/settings')?.mode).toBe('PC_ONLY');
  });
});
