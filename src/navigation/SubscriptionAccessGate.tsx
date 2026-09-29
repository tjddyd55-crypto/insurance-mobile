import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';

import { useAuth } from '../auth/AuthProvider';
import { LoadingState } from '../components/LoadingState';
import { isExpiredNativePathAllowed } from './nativeMenuPolicy';

export function SubscriptionAccessGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const expired = user?.subscription?.effectiveStatus === 'EXPIRED';
  const allowed = isExpiredNativePathAllowed(pathname);

  useEffect(() => {
    if (expired && !allowed) {
      router.replace('/profile');
    }
  }, [allowed, expired, router]);

  if (expired && !allowed) {
    return <LoadingState message="이용 상태를 확인하는 중…" />;
  }
  return <>{children}</>;
}
