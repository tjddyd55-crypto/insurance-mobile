import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { syncPushRegistrationIfPermitted } from './pushRegistration';

/**
 * Re-register push token when the app returns to foreground or session restores
 * without a fresh login prompt (e.g. OS permission granted after "나중에").
 */
export function usePushRegistrationLifecycle() {
  const { status, token } = useAuth();
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (status !== 'authenticated' || !token) return;

    void syncPushRegistrationIfPermitted(token);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      const authToken = tokenRef.current;
      if (!authToken) return;
      void syncPushRegistrationIfPermitted(authToken);
    });

    return () => subscription.remove();
  }, [status, token]);
}
