import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  type ImageLoadEventData,
  type ImageStyle,
  type NativeSyntheticEvent,
  type StyleProp,
} from 'react-native';

import { resolveNewsletterDetailImageAspectRatio } from './newsletterImageLayout';

type Props = {
  style?: StyleProp<ImageStyle>;
  uri: string;
};

export function NewsletterIntrinsicImage({ style, uri }: Props) {
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
    <Image
      source={{ uri }}
      style={[styles.image, aspectRatio != null ? { aspectRatio } : null, style]}
      resizeMode="contain"
      onLoad={handleLoad}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
  },
});
