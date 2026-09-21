import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet } from 'react-native';

import { AppText, Card, Stack, useAppTheme, type AppTheme } from '../../design-system';
import {
  NEWSLETTER_LINK_PREVIEW_IMAGE_ASPECT_RATIO,
  canRenderNewsletterLinkPreview,
  resolveNewsletterLinkPreviewDescription,
  resolveNewsletterLinkPreviewDomain,
  resolveNewsletterLinkPreviewHref,
  resolveNewsletterLinkPreviewImageUrl,
  resolveNewsletterLinkPreviewTitle,
} from './newsletterLinkPreviewPresentation';
import type { NewsletterLinkPreview } from './types';

type Props = {
  preview?: NewsletterLinkPreview | null;
};

export function NewsletterLinkPreviewCard({ preview }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [imageFailed, setImageFailed] = useState(false);
  const href = preview ? resolveNewsletterLinkPreviewHref(preview) : null;

  if (!canRenderNewsletterLinkPreview(preview) || !href) {
    return null;
  }

  const title = resolveNewsletterLinkPreviewTitle(preview);
  const description = resolveNewsletterLinkPreviewDescription(preview);
  const domain = resolveNewsletterLinkPreviewDomain(preview);
  const imageUrl = imageFailed ? null : resolveNewsletterLinkPreviewImageUrl(preview);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title} 링크 미리보기`}
      testID="newsletter-link-preview-card"
      onPress={() => void Linking.openURL(href)}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card variant="outlined" padding="none" style={styles.card}>
        <NewsletterLinkPreviewMedia imageUrl={imageUrl} onError={() => setImageFailed(true)} />
        <NewsletterLinkPreviewCopy
          description={description}
          domain={domain}
          title={title}
        />
      </Card>
    </Pressable>
  );
}

function NewsletterLinkPreviewMedia({
  imageUrl,
  onError,
}: {
  imageUrl: string | null;
  onError: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!imageUrl) {
    return null;
  }

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
    <Stack gap="xs" style={styles.meta}>
      <AppText numberOfLines={2} variant="cardTitle">
        {title}
      </AppText>
      {description ? (
        <AppText color="textSecondary" numberOfLines={2} variant="caption">
          {description}
        </AppText>
      ) : null}
      {domain ? (
        <AppText color="textMuted" numberOfLines={1} variant="helper">
          {domain}
        </AppText>
      ) : null}
    </Stack>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      overflow: 'hidden',
      width: '100%',
    },
    image: {
      aspectRatio: NEWSLETTER_LINK_PREVIEW_IMAGE_ASPECT_RATIO,
      backgroundColor: theme.colors.surfaceSubtle,
      width: '100%',
    },
    meta: {
      padding: theme.spacing.md,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
  });
}
