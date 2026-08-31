import { MenuRouteScreen } from '../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="내 저장공간"
      legacyWebPath="/storage"
      nativePath="/storage"
      mode="WEBVIEW_TEMP"
    />
  );
}
