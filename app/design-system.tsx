import { View } from 'react-native';

import { AppHeader } from '../src/components/AppHeader';
import { getEnvironmentConfig } from '../src/config/environment';
import { AppText, Screen, Stack } from '../src/design-system';
import { DesignSystemGalleryScreen } from '../src/features/design-system/DesignSystemGalleryScreen';

export default function DesignSystemRoute() {
  if (!getEnvironmentConfig().isDevApp) {
    return (
      <Screen>
        <Stack gap="sm">
          <AppText variant="heading">개발 전용 화면</AppText>
          <AppText color="textSecondary">디자인 시스템 갤러리는 DEV 앱에서만 표시됩니다.</AppText>
        </Stack>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="디자인 시스템" showMenu={false} />
      <DesignSystemGalleryScreen />
    </View>
  );
}
