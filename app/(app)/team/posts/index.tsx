import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="팀 게시판"
      legacyWebPath="/team/posts"
      nativePath="/team/posts"
      mode="WEBVIEW_TEMP"
    />
  );
}
