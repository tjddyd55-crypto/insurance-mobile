import { Platform } from 'react-native';

export const MANAGED_ACCESS_PROFILE_PATH = '/profile?access=managed';
export const MANAGED_ACCESS_MESSAGE = '계정 이용은 소속 또는 관리자가 관리합니다.';

export function isIosCouponUiHidden(): boolean {
  return Platform.OS === 'ios';
}

export function isHiddenIosBillingPath(pathname: string): boolean {
  return isIosCouponUiHidden() && (pathname === '/billing' || pathname.startsWith('/billing/'));
}
