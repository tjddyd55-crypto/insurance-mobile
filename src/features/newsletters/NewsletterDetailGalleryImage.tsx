import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useAppTheme, type AppTheme } from '../../design-system';
import { NewsletterDetailImagePressable } from './NewsletterDetailImagePressable';
import { NewsletterIntrinsicImage } from './NewsletterIntrinsicImage';

type Props = {
  onPress: () => void;
  uri: string;
};

export function NewsletterDetailGalleryImage({ onPress, uri }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <NewsletterDetailImagePressable onPress={onPress} style={styles.frame}>
      <NewsletterIntrinsicImage uri={uri} />
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
  });
}
