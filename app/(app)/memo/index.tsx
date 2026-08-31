import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="메모"
      legacyWebPath="/memo"
      nativePath="/memo"
      mode="NATIVE"
    />
  );
}
