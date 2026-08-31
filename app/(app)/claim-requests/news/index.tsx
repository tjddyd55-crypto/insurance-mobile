import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="고객소식지"
      legacyWebPath="/claim-requests?claimTab=news-all"
      nativePath="/claim-requests/news"
      mode="WEBVIEW_TEMP"
    />
  );
}
