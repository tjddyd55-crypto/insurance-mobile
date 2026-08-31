import { MenuRouteScreen } from '../../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="신청서 작성내역"
      legacyWebPath="/application/documents/history"
      nativePath="/application/documents/history"
      mode="WEBVIEW_TEMP"
    />
  );
}
