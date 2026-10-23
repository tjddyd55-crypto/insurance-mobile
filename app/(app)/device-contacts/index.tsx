import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../../src/components/AppHeader';
import { AppText } from '../../../src/design-system';
import { DeviceContactsScreen } from '../../../src/features/device-contacts/DeviceContactsScreen';
import { USER_MENU_FEATURE_FLAGS } from '../../../src/navigation/menuConfig';

export default function DeviceContactsRoute() {
  if (USER_MENU_FEATURE_FLAGS.deviceContacts) {
    return <DeviceContactsScreen />;
  }
  return (
    <View style={styles.root}>
      <AppHeader title="연락처" showMenu={false} showBack />
      <AppText style={styles.notice}>연락처 화면은 준비 중입니다.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notice: { paddingHorizontal: 20, paddingTop: 24 },
});
