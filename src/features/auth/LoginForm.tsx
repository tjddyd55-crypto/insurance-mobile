import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Link } from 'expo-router';

import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { consumeNativeUpgradeReLoginNotice } from '../../auth/nativeUpgradeMigration';
import { getEnvironmentConfig } from '../../config/environment';
import { AppText, Button, Card, Inline, Stack, TextField, useAppTheme, type AppTheme } from '../../design-system';

export function LoginForm() {
  const { login } = useAuth();
  const env = getEnvironmentConfig();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeNotice, setUpgradeNotice] = useState(false);
  const appVersion = String(Constants.expoConfig?.version ?? env.appDisplayName);

  useEffect(() => {
    void consumeNativeUpgradeReLoginNotice().then(setUpgradeNotice);
  }, []);

  const onSubmit = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.brandBlock}>
        <AppText style={styles.brand}>{env.appDisplayName.replace(/\s+(NATIVE\s+)?DEV$/i, '')}</AppText>
        <AppText color="textSecondary" style={styles.brandCopy}>고객 관리 · 상담 기록 · 파일 작업을 한 화면에서 이어서 처리합니다.</AppText>
      </View>
      <Card variant="outlined" style={styles.card}>
        <AppText variant="subheading">로그인</AppText>
        {upgradeNotice ? (
          <AppText color="textSecondary">앱이 업데이트되었습니다. 보안을 위해 다시 로그인해 주세요.</AppText>
        ) : null}
        <TextField label="아이디" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} editable={!loading} />
        <TextField label="비밀번호" secureTextEntry value={password} onChangeText={setPassword} editable={!loading} />
        {error ? <AppText color="danger">{error}</AppText> : null}
        <Button label="로그인" loading={loading} fullWidth onPress={() => void onSubmit()} />
        <Stack gap="sm">
          <Inline gap="xs" wrap><AppText variant="caption">계정이 없으신가요?</AppText><Link href="/(auth)/register" style={styles.link}>회원가입</Link></Inline>
          <Inline gap="xs" wrap><AppText variant="caption">비밀번호를 잊으셨나요?</AppText><Link href="/(auth)/password-reset" style={styles.link}>비밀번호 재설정</Link></Inline>
        </Stack>
      </Card>
      <Inline justify="center" style={styles.downloads}>
        <Button label="PC버전" size="sm" variant="secondary" onPress={() => void Linking.openURL('https://cdn.platform-assets.com/insurance/download/one-fc-pc.exe')} />
        <Button label="안드로이드" size="sm" variant="secondary" onPress={() => void Linking.openURL('https://play.google.com/store/apps/details?id=com.onefc.app')} />
        <Button label="아이폰" size="sm" variant="secondary" onPress={() => void Linking.openURL('https://apps.apple.com/app/one-fc/id6785336968')} />
      </Inline>
      <AppText variant="caption" color="textMuted" align="center">
        버전: {appVersion}
      </AppText>
      <View style={styles.business}>
        <AppText variant="caption"><AppText variant="label">상호명</AppText>  올인원솔루션</AppText>
        <AppText variant="caption"><AppText variant="label">대표자</AppText>  박성용</AppText>
        <AppText variant="caption"><AppText variant="label">사업자등록번호</AppText>  232-51-00991</AppText>
        <AppText variant="caption"><AppText variant="label">주소</AppText>  서울특별시 광진구 천호대로114길 39 (능동)</AppText>
        {env.isDevApp ? <AppText variant="caption" color="warningText">개발 서버 연결</AppText> : null}
      </View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { flexGrow: 1, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xl, backgroundColor: theme.colors.background, gap: theme.spacing.lg },
    brandBlock: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, paddingBottom: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    brand: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: theme.colors.text },
    brandCopy: { fontSize: 14, lineHeight: 20 },
    card: { gap: theme.spacing.md, padding: theme.spacing.lg },
    link: { color: theme.colors.primary, fontSize: 12, lineHeight: 17, fontWeight: '600', textDecorationLine: 'underline' },
    downloads: { marginTop: theme.spacing.xs },
    business: { marginTop: theme.spacing.md, padding: theme.spacing.md, paddingTop: theme.spacing.lg, gap: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  });
}
