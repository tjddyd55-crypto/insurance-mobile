import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="할일"
      legacyWebPath="/todos"
      nativePath="/todos"
      mode="NATIVE"
    />
  );
}
