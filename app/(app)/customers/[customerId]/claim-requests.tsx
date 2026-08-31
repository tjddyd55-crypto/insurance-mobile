import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="고객 청구"
      legacyWebPath="/customers/:id"
      nativePath="/customers/[customerId]/claim-requests"
      mode="NATIVE"
    />
  );
}
