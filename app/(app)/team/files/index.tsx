import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="팀 자료"
      legacyWebPath="/team/files"
      nativePath="/team/files"
      mode="WEBVIEW_TEMP"
    />
  );
}
