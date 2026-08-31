import { MenuRouteScreen } from '../../../../src/navigation/MenuRouteScreen';

export default function Screen() {
  return (
    <MenuRouteScreen
      title="고객 메모"
      legacyWebPath="/customers/:id"
      nativePath="/customers/[customerId]/memos"
      mode="NATIVE"
    />
  );
}
