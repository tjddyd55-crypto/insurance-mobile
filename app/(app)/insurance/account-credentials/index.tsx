import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="계정관리"
      legacyWebPath="/insurance/account-credentials"
      nativePath="/insurance/account-credentials"
      mode="WEBVIEW_TEMP"
    />
  );
}
