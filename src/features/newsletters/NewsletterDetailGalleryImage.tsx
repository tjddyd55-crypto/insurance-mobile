import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  type ImageLoadEventData,
  type NativeSyntheticEvent,
} from 'react-native';

import { useAppTheme, type AppTheme } from '../../design-system';
import { NewsletterDetailImagePressable } from './NewsletterDetailImagePressable';
import { resolveNewsletterDetailImageAspectRatio } from './newsletterImageLayout';

type Props = {
  onPress: () => void;
  uri: string;
};

export function NewsletterDetailGalleryImage({ onPress, uri }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setAspectRatio(null);
  }, [uri]);

  const handleLoad = (event: NativeSyntheticEvent<ImageLoadEventData>) => {
    const next = resolveNewsletterDetailImageAspectRatio(
      event.nativeEvent.source.width,
      event.nativeEvent.source.height,
    );
    if (next != null) {
      setAspectRatio(next);
    }
  };

  return (
    <NewsletterDetailImagePressable onPress={onPress} style={styles.frame}>
      <Image
        source={{ uri }}
        style={[styles.image, aspectRatio != null ? { aspectRatio } : null]}
        resizeMode="contain"
        onLoad={handleLoad}
      />
    </NewsletterDetailImagePressable>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    frame: {
      width: '100%',
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceSubtle,
    },
    image: {
      width: '100%',
    },
  });
}
