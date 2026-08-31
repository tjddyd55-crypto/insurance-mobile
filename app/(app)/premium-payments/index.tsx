import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="카드 수납"
      legacyWebPath="/premium-payments"
      nativePath="/premium-payments"
      mode="WEBVIEW_TEMP"
    />
  );
}
