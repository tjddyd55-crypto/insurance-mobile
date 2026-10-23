import { Drawer } from 'expo-router/drawer';

import { AppDrawerContent } from '../../src/navigation/AppDrawerContent';
import { useAppTheme } from '../../src/design-system';
import { BillingEntitlementGate } from '../../src/features/billing/BillingEntitlementGate';
import { PublicAccountAccessGate } from '../../src/navigation/PublicAccountAccessGate';
import { SubscriptionAccessGate } from '../../src/navigation/SubscriptionAccessGate';

export default function AppLayout() {
  const theme = useAppTheme();
  return (
    <BillingEntitlementGate>
      <SubscriptionAccessGate>
        <PublicAccountAccessGate>
          <Drawer
            // expo-router vs @react-navigation/drawer prop type mismatch
            drawerContent={AppDrawerContent as never}
            // 일정에서 연 할 일을 닫으면 직전 화면으로 돌아간다. firstRoute 는 메뉴 이동을 홈으로 보낸다.
            backBehavior="history"
            screenOptions={{
              headerShown: false,
              drawerType: 'front',
              drawerStyle: { width: '100%', backgroundColor: theme.colors.surface },
              overlayColor: theme.colors.overlay,
              swipeEnabled: true,
            }}
          />
        </PublicAccountAccessGate>
      </SubscriptionAccessGate>
    </BillingEntitlementGate>
  );
}
