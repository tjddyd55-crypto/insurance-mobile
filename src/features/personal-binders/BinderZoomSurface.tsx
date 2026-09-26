import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText, useAppTheme } from '../../design-system';
import {
  NEWS_DETAIL_ZOOM_MIN,
  calculatePanBounds,
  clampNewsDetailZoomScale,
  clampTranslation,
} from '../../components/newsDetailZoomMath';
import { edgeToEdgePageSize } from './binderPageLayout';

type Props = {
  uri: string | null | undefined;
  pageLabel: string;
  sectionTitle: string;
  width: number;
  height: number;
  onSwipe: (direction: -1 | 1) => void;
  onToggleChrome: () => void;
};

const SWIPE_DISTANCE = 48;

export function BinderZoomSurface({
  uri,
  pageLabel,
  sectionTitle,
  width,
  height,
  onSwipe,
  onToggleChrome,
}: Props) {
  const theme = useAppTheme();
  const scale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const savedScale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [aspect, setAspect] = useState<number | null>(null);
  const page = edgeToEdgePageSize(width, aspect ?? undefined);
  const renderedWidth = useSharedValue(page.width);
  const renderedHeight = useSharedValue(page.height);

  useEffect(() => {
    renderedWidth.value = page.width;
    renderedHeight.value = page.height;
  }, [page.height, page.width, renderedHeight, renderedWidth]);

  const applyClampedTranslation = (nextX: number, nextY: number, commit: boolean) => {
    'worklet';
    const contentFits = scale.value <= NEWS_DETAIL_ZOOM_MIN
      && renderedWidth.value <= width + 1
      && renderedHeight.value <= height + 1;
    if (contentFits) {
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      return;
    }
    const bounds = calculatePanBounds(renderedWidth.value, renderedHeight.value, scale.value, width, height);
    const clamped = clampTranslation(nextX, nextY, bounds);
    translateX.value = clamped.x;
    translateY.value = clamped.y;
    if (commit) {
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    }
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clampNewsDetailZoomScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value > NEWS_DETAIL_ZOOM_MIN) return;
      scale.value = withTiming(NEWS_DETAIL_ZOOM_MIN);
      savedScale.value = NEWS_DETAIL_ZOOM_MIN;
      translateX.value = withTiming(0);
      savedTranslateX.value = 0;
      if (renderedHeight.value <= height + 1) {
        translateY.value = withTiming(0);
        savedTranslateY.value = 0;
        return;
      }
      applyClampedTranslation(0, translateY.value, true);
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(12)
    .onUpdate((event) => {
      const contentFits = scale.value <= NEWS_DETAIL_ZOOM_MIN && renderedHeight.value <= height + 1;
      if (contentFits) return;
      applyClampedTranslation(savedTranslateX.value + event.translationX, savedTranslateY.value + event.translationY, false);
    })
    .onEnd((event) => {
      if (scale.value > NEWS_DETAIL_ZOOM_MIN) {
        applyClampedTranslation(translateX.value, translateY.value, true);
        return;
      }
      const horizontal = Math.abs(event.translationX) >= SWIPE_DISTANCE
        && Math.abs(event.translationX) > Math.abs(event.translationY) * 1.2;
      if (horizontal) {
        translateX.value = withTiming(0);
        savedTranslateX.value = 0;
        runOnJS(onSwipe)(event.translationX < 0 ? 1 : -1);
        return;
      }
      if (renderedHeight.value > height + 1) {
        applyClampedTranslation(0, translateY.value, true);
      }
    });

  const tap = Gesture.Tap().maxDistance(12).onEnd(() => {
    runOnJS(onToggleChrome)();
  });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, Gesture.Exclusive(pan, tap))}>
      <View style={[styles.stage, { width, height }]}>
        <Animated.View style={[styles.page, { width: page.width, height: page.height, backgroundColor: theme.colors.surface }, imageStyle]}>
          {uri ? (
            <Animated.Image
              source={{ uri }}
              resizeMode="cover"
              accessibilityLabel={`${sectionTitle} ${pageLabel}`}
              onLoad={(event) => {
                const source = event.nativeEvent.source;
                if (source.width > 0 && source.height > 0) setAspect(source.width / source.height);
              }}
              style={styles.image}
            />
          ) : (
            <View style={styles.placeholder}>
              <AppText variant="heading">{pageLabel}</AppText>
              <AppText color="textSecondary">{sectionTitle}</AppText>
              <AppText variant="caption" color="textMuted" align="center">
                {uri === undefined ? '페이지를 불러오는 중…' : '이 기기에서는 페이지 이미지를 만들지 못했습니다. 전체 PDF로 저장할 수 있습니다.'}
              </AppText>
            </View>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  page: { overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
});
