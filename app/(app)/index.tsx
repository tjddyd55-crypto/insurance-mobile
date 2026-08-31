import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
import { getEnvironmentConfig } from '../../src/config/environment';
import { useAuth } from '../../src/auth/AuthProvider';
import { AppText, Button, Card, Screen, Stack } from '../../src/design-system';

export default function HomeScreen() {
  const { user } = useAuth();
  const env = getEnvironmentConfig();
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="홈" />
      <Screen>
        <Card>
          <Stack gap="md">
            <AppText variant="title" color="brandStrong">
              {env.appDisplayName}
            </AppText>
            <AppText>안녕하세요, {user?.displayName ?? user?.username}님</AppText>
            <AppText variant="caption">햄버거 메뉴에서 기능을 선택하세요.</AppText>
            {env.isDevApp ? (
              <Button
                label="디자인 시스템 보기"
                variant="secondary"
                onPress={() => router.push('/design-system')}
              />
            ) : null}
          </Stack>
        </Card>
      </Screen>
    </View>
  );
}
