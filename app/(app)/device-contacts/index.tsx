import { DeviceContactsScreen } from '../../../src/features/device-contacts/DeviceContactsScreen';
import { USER_MENU_FEATURE_FLAGS } from '../../../src/navigation/menuConfig';

export default function DeviceContactsRoute() {
  if (!USER_MENU_FEATURE_FLAGS.deviceContacts) {
    return null;
  }
  return <DeviceContactsScreen />;
}
