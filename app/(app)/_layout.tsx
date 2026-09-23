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
