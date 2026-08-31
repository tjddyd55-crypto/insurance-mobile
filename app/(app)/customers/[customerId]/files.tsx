import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="고객 파일"
      legacyWebPath="/customers/:id"
      nativePath="/customers/[customerId]/files"
      mode="NATIVE"
    />
  );
}
