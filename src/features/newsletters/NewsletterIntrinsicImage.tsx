import { useEffect, useState } from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

import { resolveNewsletterDetailImageAspectRatio } from './newsletterImageLayout';

type Props = {
  style?: StyleProp<ImageStyle>;
  uri: string;
};

/**
 * 상세 갤러리 전용. 원본 비율로 전체 이미지를 보여 주며 자르지 않는다.
 * Android 로드 이벤트 source 크기는 부정확할 수 있어 Image.getSize 를 사용한다.
 */
export function NewsletterIntrinsicImage({ style, uri }: Props) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setAspectRatio(null);
    if (!uri) {
      return;
    }

    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (cancelled) {
          return;
        }
        const next = resolveNewsletterDetailImageAspectRatio(width, height);
        if (next != null) {
          setAspectRatio(next);
        }
      },
      () => {
        if (!cancelled) {
          setAspectRatio(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={[styles.image, aspectRatio != null ? { aspectRatio } : null, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    minHeight: 220,
  },
});
