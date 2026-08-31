import { Drawer } from 'expo-router/drawer';

import { AppDrawerContent } from '../../src/navigation/AppDrawerContent';
import { useAppTheme } from '../../src/design-system';

export default function AppLayout() {
  const theme = useAppTheme();
  return (
    <Drawer
      // expo-router vs @react-navigation/drawer prop type mismatch
      drawerContent={AppDrawerContent as never}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 300, backgroundColor: theme.colors.surface },
        overlayColor: theme.colors.overlay,
        swipeEnabled: true,
      }}
    />
  );
}
