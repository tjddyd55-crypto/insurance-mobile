import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="알림"
      legacyWebPath="/notifications"
      nativePath="/notifications"
      mode="NATIVE"
    />
  );
}
