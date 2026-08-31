import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  Inline,
  Stack,
  TextField,
  foundations,
  useDesignSystem,
} from '../../design-system';

const COLOR_SWATCHES = [
  'background',
  'surface',
  'surfaceSubtle',
  'text',
  'textSecondary',
  'primary',
  'success',
  'warning',
  'danger',
  'info',
] as const;

export function DesignSystemGalleryScreen() {
  const { theme, mode, setMode } = useDesignSystem();
  const [sample, setSample] = useState('홍길동');

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { padding: theme.spacing.lg }]}
    >
      <Stack gap="xl">
        <Stack gap="xs">
          <AppText variant="title">ONE FC Design System</AppText>
          <AppText variant="body" color="textSecondary">
            토큰과 공통 컴포넌트의 실제 렌더링을 검토하는 개발 전용 갤러리입니다.
          </AppText>
        </Stack>

        <GallerySection title="Theme">
          <Inline wrap>
            {(['light', 'dark', 'system'] as const).map((candidate) => (
              <Button
                key={candidate}
                label={candidate}
                size="sm"
                variant={mode === candidate ? 'primary' : 'secondary'}
                onPress={() => setMode(candidate)}
              />
            ))}
          </Inline>
        </GallerySection>

        <GallerySection title="Semantic colors">
          <View style={styles.swatchGrid}>
            {COLOR_SWATCHES.map((token) => (
              <View key={token} style={styles.swatchItem}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: theme.colors[token], borderColor: theme.colors.border },
                  ]}
                />
                <AppText variant="caption">{token}</AppText>
              </View>
            ))}
          </View>
        </GallerySection>

        <GallerySection title="Typography">
          <AppText variant="display">Display</AppText>
          <AppText variant="title">Title 제목</AppText>
          <AppText variant="heading">Heading 제목</AppText>
          <AppText variant="subheading">Subheading 소제목</AppText>
          <AppText variant="body">Body 본문 텍스트</AppText>
          <AppText variant="bodyStrong">Body strong 강조 본문</AppText>
          <AppText variant="label">Label 필드 라벨</AppText>
          <AppText variant="caption">Caption 보조 설명</AppText>
        </GallerySection>

        <GallerySection title="Buttons">
          <Stack gap="sm">
            <Button label="Primary" variant="primary" />
            <Button label="Secondary" variant="secondary" />
            <Button label="Danger" variant="danger" />
            <Button label="Ghost" variant="ghost" />
            <Button label="Disabled" disabled />
            <Button label="Loading" loading />
          </Stack>
        </GallerySection>

        <GallerySection title="Badges">
          <Inline wrap>
            <Badge label="기본" />
            <Badge label="완료" tone="success" />
            <Badge label="주의" tone="warning" />
            <Badge label="오류" tone="danger" />
            <Badge label="정보" tone="info" />
          </Inline>
        </GallerySection>

        <GallerySection title="Form controls">
          <TextField
            label="고객명"
            required
            value={sample}
            onChangeText={setSample}
            helperText="실제 데이터는 저장되지 않습니다."
          />
          <TextField label="오류 상태" value="잘못된 값" error="입력값을 확인해 주세요." />
          <TextField label="비활성 상태" value="수정할 수 없음" editable={false} />
        </GallerySection>

        <GallerySection title="Spacing grid">
          <AppText variant="caption" color="textSecondary">
            기본 단위는 4pt이며 현재 md는 {foundations.spacing.md}px입니다.
          </AppText>
          <Inline align="flex-end">
            {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((space) => (
              <View key={space} style={styles.spaceItem}>
                <View
                  style={{
                    width: foundations.spacing[space],
                    height: foundations.spacing[space],
                    backgroundColor: theme.colors.primary,
                  }}
                />
                <AppText variant="caption">{space}</AppText>
              </View>
            ))}
          </Inline>
        </GallerySection>
      </Stack>
    </ScrollView>
  );
}

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <Stack gap="md">
        <AppText variant="heading">{title}</AppText>
        <Divider />
        {children}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 64 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchItem: { width: '30%', gap: 4 },
  swatch: { height: 48, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  spaceItem: { alignItems: 'center', gap: 4, minWidth: 40 },
});
