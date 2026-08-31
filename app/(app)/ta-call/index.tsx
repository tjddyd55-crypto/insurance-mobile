import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="오늘의 TA"
      legacyWebPath="/ta-call"
      nativePath="/ta-call"
      mode="NATIVE"
    />
  );
}
