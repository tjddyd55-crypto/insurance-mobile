import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="원수사 연락처"
      legacyWebPath="/insurance/contacts"
      nativePath="/insurance/contacts"
      mode="WEBVIEW_TEMP"
    />
  );
}
