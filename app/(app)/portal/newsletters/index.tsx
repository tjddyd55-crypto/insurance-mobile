import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="원수사소식지"
      legacyWebPath="/portal/newsletters"
      nativePath="/portal/newsletters"
      mode="WEBVIEW_TEMP"
    />
  );
}
