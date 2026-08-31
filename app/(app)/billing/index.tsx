import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="구독 및 결제"
      legacyWebPath="/billing/checkout"
      nativePath="/billing"
      mode="NATIVE"
    />
  );
}
