import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="문자 발송"
      legacyWebPath="/sms/settings"
      nativePath="/sms/settings"
      mode="WEBVIEW_TEMP"
    />
  );
}
