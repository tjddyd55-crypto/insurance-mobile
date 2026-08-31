import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="청구관리"
      legacyWebPath="/claim-requests"
      nativePath="/claim-requests"
      mode="WEBVIEW_TEMP"
    />
  );
}
