import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Stack, useAppTheme, type AppTheme } from '../../design-system';
import {
  contactsPermissionPanelModel,
  type ContactsPermissionPhase,
} from './deviceContactPermission';

type DeviceContactsPermissionPanelProps = {
  phase: ContactsPermissionPhase;
  onRequestAccess: () => void;
  onOpenSettings: () => void;
};

export function DeviceContactsPermissionPanel({
  phase,
  onRequestAccess,
  onOpenSettings,
}: DeviceContactsPermissionPanelProps) {
  const model = contactsPermissionPanelModel(phase);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!model) {
    return null;
  }
  const onPress = model.action === 'settings' ? onOpenSettings : onRequestAccess;
  return (
    <View style={styles.wrap}>
      <Stack gap="md">
        <AppText variant="sectionTitle" align="center">{model.title}</AppText>
        {model.action ? (
          <Button label={model.actionLabel} variant="primary" onPress={onPress} />
        ) : null}
      </Stack>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
  });
}
