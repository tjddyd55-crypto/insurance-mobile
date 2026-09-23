import { Drawer } from 'expo-router/drawer';

import { AppDrawerContent } from '../../src/navigation/AppDrawerContent';
import { useAppTheme } from '../../src/design-system';
import { BillingEntitlementGate } from '../../src/features/billing/BillingEntitlementGate';
import { PublicAccountAccessGate } from '../../src/navigation/PublicAccountAccessGate';
import { SubscriptionAccessGate } from '../../src/navigation/SubscriptionAccessGate';
import { TODO_EDIT_ROUTE_NAME, todoEditSingularId } from '../../src/features/todos/todoNavigation';

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
          >
            {/*
              Drawer는 동적 라우트를 이름만으로 한 화면으로 유지한다.
              할 일 id가 singular id에 들어가야 뒤로 간 뒤 다른 항목을 열어도
              이전 수정 화면과 history가 재사용되지 않는다.
            */}
            <Drawer.Screen
              name={TODO_EDIT_ROUTE_NAME}
              dangerouslySingular={(name, params) => todoEditSingularId(name, params.todoId)}
            />
          </Drawer>
        </PublicAccountAccessGate>
      </SubscriptionAccessGate>
    </BillingEntitlementGate>
  );
}
