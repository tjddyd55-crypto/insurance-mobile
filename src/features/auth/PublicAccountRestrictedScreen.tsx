import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { AppText, Button, Card, Screen, Stack } from '../../design-system';

export function PublicAccountRestrictedScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <AppHeader title="GA 소속 계정 전용" />
      <Screen>
        <Card variant="outlined">
          <Stack gap="md">
            <AppText variant="sectionTitle">이 메뉴는 GA 소속 계정에서 사용할 수 있습니다.</AppText>
            <AppText color="textSecondary">
              현재 공용 계정에서는 접근할 수 없습니다. 소속 계정으로 로그인해 주세요.
            </AppText>
            <Button label="이전 화면" variant="secondary" onPress={() => router.back()} />
          </Stack>
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
