import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="신청서 작성"
      legacyWebPath="/application/documents"
      nativePath="/application/documents"
      mode="WEBVIEW_TEMP"
    />
  );
}
