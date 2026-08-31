import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="고객 상세"
      legacyWebPath="/customers/:id"
      nativePath="/customers/[customerId]"
      mode="NATIVE"
    />
  );
}
