import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="손해사정사 소식지"
      legacyWebPath="/portal/adjuster-news"
      nativePath="/portal/adjuster-news"
      mode="WEBVIEW_TEMP"
    />
  );
}
