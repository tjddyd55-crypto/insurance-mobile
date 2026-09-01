import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';

import { useAuth } from '../auth/AuthProvider';
import { LoadingState } from '../components/LoadingState';
import {
  isPublicAccountGaOnlyPath,
  isPublicGeneralAccount,
} from './nativeMenuPolicy';

export function PublicAccountAccessGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const restricted = Boolean(
    user
    && isPublicGeneralAccount(user)
    && isPublicAccountGaOnlyPath(pathname),
  );

  useEffect(() => {
    if (restricted) {
      router.replace({
        pathname: '/public-account-restricted',
        params: { from: pathname },
      });
    }
  }, [pathname, restricted, router]);

  if (restricted) {
    return <LoadingState message="계정 권한을 확인하는 중…" />;
  }
  return <>{children}</>;
}
