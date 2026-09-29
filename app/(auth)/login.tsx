import { Screen } from '../../src/components/Screen';
import { LoginForm } from '../../src/features/auth/LoginForm';

export default function LoginScreen() {
  return (
    <Screen padded={false}>
      <LoginForm />
    </Screen>
  );
}
