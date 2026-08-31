import { Drawer } from 'expo-router/drawer';

import { AppDrawerContent } from '../../src/navigation/AppDrawerContent';
import { colors } from '../../src/theme/tokens';

export default function AppLayout() {
  return (
    <Drawer
      // expo-router vs @react-navigation/drawer prop type mismatch
      drawerContent={AppDrawerContent as never}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 300, backgroundColor: colors.bgSurface },
        overlayColor: colors.overlay,
        swipeEnabled: true,
      }}
    />
  );
}
