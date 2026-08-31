import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="내정보관리"
      legacyWebPath="/profile"
      nativePath="/profile"
      mode="NATIVE"
    />
  );
}
