import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="고객리스트"
      legacyWebPath="/customers"
      nativePath="/customers"
      mode="NATIVE"
    />
  );
}
