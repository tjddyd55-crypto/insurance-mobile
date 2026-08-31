import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="고객 지도"
      legacyWebPath="/customers/map"
      nativePath="/customers/map"
      mode="WEBVIEW_TEMP"
    />
  );
}
