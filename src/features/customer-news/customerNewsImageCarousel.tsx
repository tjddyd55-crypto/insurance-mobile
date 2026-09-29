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
import { customerNewsCarouselMode } from './customerNewsContent';

type Props = {
  imageUrls: string[];
  contentWidth: number;
};

export function CustomerNewsImageCarousel({ imageUrls, contentWidth }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const urls = imageUrls.map((url) => String(url ?? '').trim()).filter(Boolean);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const mode = customerNewsCarouselMode(urls.length);
  if (mode === 'none') {
    return null;
  }

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = Math.max(contentWidth, 1);
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(Math.max(next, 0), urls.length - 1));
  };

  if (mode === 'single') {
    return (
      <Image
        source={{ uri: urls[0] }}
        style={[styles.image, { width: contentWidth }]}
        resizeMode="contain"
        accessibilityLabel="소식 이미지"
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
          length: contentWidth,
          offset: contentWidth * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={[styles.image, { width: contentWidth }]}
            resizeMode="contain"
            accessibilityLabel="소식 이미지"
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
      minHeight: 220,
      maxHeight: 480,
      aspectRatio: 9 / 16,
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
