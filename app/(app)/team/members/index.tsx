import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="팀원리스트"
      legacyWebPath="/team/members"
      nativePath="/team/members"
      mode="WEBVIEW_TEMP"
    />
  );
}
