import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import { customerNewsCarouselMode } from '../customer-news/customerNewsContent';

const MAX_IMAGE_HEIGHT = 480;

type Props = {
  imageUrls: string[];
  contentWidth: number;
  onImagePress?: (url: string, index: number) => void;
};

function NewsletterCarouselImage({
  url,
  contentWidth,
  onPress,
}: {
  url: string;
  contentWidth: number;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [height, setHeight] = useState(Math.min(MAX_IMAGE_HEIGHT, contentWidth * 0.75));

  const image = (
    <Image
      source={{ uri: url }}
      style={[styles.image, { width: contentWidth, height }]}
      resizeMode="contain"
      accessibilityLabel="소식 이미지"
      onLoad={(event) => {
        const source = event.nativeEvent.source;
        if (!source.width || !source.height) {
          return;
        }
        const nextHeight = Math.min(MAX_IMAGE_HEIGHT, contentWidth * (source.height / source.width));
        if (Number.isFinite(nextHeight) && nextHeight > 0) {
          setHeight(nextHeight);
        }
      }}
    />
  );

  if (!onPress) {
    return image;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="이미지 확대"
      onPress={onPress}
      style={{ width: contentWidth, alignItems: 'center' }}
    >
      {image}
    </Pressable>
  );
}

export function NewsletterImageCarousel({ imageUrls, contentWidth, onImagePress }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const urls = imageUrls.map((url) => String(url ?? '').trim()).filter(Boolean);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  const width = Math.max(contentWidth, 1);

  const mode = customerNewsCarouselMode(urls.length);
  if (mode === 'none') {
    return null;
  }

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(Math.max(next, 0), urls.length - 1));
  };

  if (mode === 'single') {
    return (
      <NewsletterCarouselImage
        url={urls[0]}
        contentWidth={width}
        onPress={onImagePress ? () => onImagePress(urls[0], 0) : undefined}
      />
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={urls}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(url, itemIndex) => `${url}-${itemIndex}`}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item, index: itemIndex }) => (
          <NewsletterCarouselImage
            url={item}
            contentWidth={width}
            onPress={onImagePress ? () => onImagePress(item, itemIndex) : undefined}
          />
        )}
      />
      <View style={styles.meta} accessibilityLiveRegion="polite">
        <AppText variant="caption" align="center">
          {index + 1} / {urls.length}
        </AppText>
        <View style={styles.dots}>
          {urls.map((url, dotIndex) => (
            <Pressable
              key={`${url}-${dotIndex}`}
              accessibilityRole="button"
              accessibilityLabel={`${dotIndex + 1}번째 이미지 보기`}
              onPress={() => {
                setIndex(dotIndex);
                listRef.current?.scrollToIndex({ index: dotIndex, animated: true });
              }}
              style={[styles.dot, dotIndex === index ? styles.dotActive : null]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { width: '100%', gap: theme.spacing.sm },
    image: {
      backgroundColor: theme.colors.surfaceSubtle,
    },
    meta: { gap: theme.spacing.xs },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
    },
    dotActive: {
      backgroundColor: theme.colors.primary,
    },
  });
}
