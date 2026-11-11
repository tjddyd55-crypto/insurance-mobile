import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { CustomerFormScreen } from '../../../src/features/customers/CustomerFormScreen';

export default function NewCustomerRoute() {
  // Drawer screens stay mounted after blur, so a new registration must get a fresh form instance
  // every time the user leaves (save → detail, back, home). Bumping the key on blur remounts the
  // create form (values, errors, dirty snapshot, section open state) without touching edit routes.
  const [sessionKey, setSessionKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      return () => setSessionKey((previous) => previous + 1);
    }, []),
  );
  return <CustomerFormScreen key={sessionKey} mode="create" />;
}
