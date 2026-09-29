import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { normalizeNewsletterLinkPreview } from './getNewsletterLinkPreview';
import {
  NEWSLETTER_LINK_PREVIEW_IMAGE_ASPECT_RATIO,
  NEWSLETTER_LINK_PREVIEW_PLACEHOLDER_HEIGHT,
  resolveNewsletterLinkPreviewCardModel,
} from './newsletterLinkPreviewPresentation';

type Props = {
  preview?: unknown;
};

export function NewsletterLinkPreviewCard({ preview }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [imageFailed, setImageFailed] = useState(false);
  const model = resolveNewsletterLinkPreviewCardModel(normalizeNewsletterLinkPreview(preview));

  if (!model) {
    return null;
  }

  const imageUrl = imageFailed ? null : model.imageUrl;
  const showPlaceholder = !imageUrl;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${model.title} 링크 미리보기`}
      testID="newsletter-link-preview-card"
      onPress={() => void Linking.openURL(model.href)}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card variant="outlined" padding="none" style={styles.card}>
        <NewsletterLinkPreviewMedia
          imageUrl={imageUrl}
          showPlaceholder={showPlaceholder}
          onError={() => setImageFailed(true)}
        />
        <NewsletterLinkPreviewCopy
          description={model.description}
          domain={model.domain}
          title={model.title}
        />
      </Card>
    </Pressable>
  );
}

function NewsletterLinkPreviewMedia({
  imageUrl,
  showPlaceholder,
  onError,
}: {
  imageUrl: string | null;
  showPlaceholder: boolean;
  onError: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (imageUrl) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        onError={onError}
        resizeMode="cover"
        source={{ uri: imageUrl }}
        style={styles.image}
      />
    );
  }

  if (!showPlaceholder) {
    return null;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.placeholder}
      testID="newsletter-link-preview-placeholder"
    >
      <View style={styles.placeholderMark}>
        <AppText color="textMuted" variant="caption">
          링크
        </AppText>
      </View>
    </View>
  );
}

function NewsletterLinkPreviewCopy({
  description,
  domain,
  title,
}: {
  description: string;
  domain: string;
  title: string;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Stack gap="sm" style={styles.meta}>
      <AppText numberOfLines={2} variant="cardTitle">
        {title}
      </AppText>
      {description ? (
        <AppText color="textSecondary" numberOfLines={2} variant="caption">
          {description}
        </AppText>
      ) : null}
      <AppText
        color="textMuted"
        numberOfLines={1}
        testID="newsletter-link-preview-domain"
        variant="helper"
      >
        {`${domain} ↗`}
      </AppText>
    </Stack>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      borderColor: theme.colors.borderStrong,
      overflow: 'hidden',
      width: '100%',
    },
    image: {
      aspectRatio: NEWSLETTER_LINK_PREVIEW_IMAGE_ASPECT_RATIO,
      backgroundColor: theme.colors.surfaceSubtle,
      width: '100%',
    },
    placeholder: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSubtle,
      height: NEWSLETTER_LINK_PREVIEW_PLACEHOLDER_HEIGHT,
      justifyContent: 'center',
      width: '100%',
    },
    placeholderMark: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: theme.spacing.xxl,
      minWidth: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.sm,
    },
    meta: {
      padding: theme.spacing.lg,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
  });
}
