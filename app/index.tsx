import { Redirect } from 'expo-router';

import { useAuth } from '../src/auth/AuthProvider';
import { LoadingState } from '../src/components/LoadingState';

export default function Index() {
  const { status } = useAuth();

  if (status === 'booting') {
    return <LoadingState />;
  }
  if (status === 'authenticated') {
    return <Redirect href="/(app)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
