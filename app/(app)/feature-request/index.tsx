import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="문의요청"
      legacyWebPath="/feature-request"
      nativePath="/feature-request"
      mode="WEBVIEW_TEMP"
    />
  );
}
