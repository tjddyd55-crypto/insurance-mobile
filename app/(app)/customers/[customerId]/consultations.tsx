import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="상담"
      legacyWebPath="/customers/:id"
      nativePath="/customers/[customerId]/consultations"
      mode="NATIVE"
    />
  );
}
