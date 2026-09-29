import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText, useAppTheme } from '../../design-system';
import {
  NEWS_DETAIL_ZOOM_MIN,
  calculatePanBounds,
  clampNewsDetailZoomScale,
  clampTranslation,
} from '../../components/newsDetailZoomMath';
import { edgeToEdgePageSize, imageAspectFromLoadEvent } from './binderPageLayout';

type Props = {
  uri: string | null | undefined;
  pageLabel: string;
  sectionTitle: string;
  width: number;
  height: number;
  onSwipe: (direction: -1 | 1) => void;
  onToggleChrome: () => void;
  onImageError?: () => void;
};

const SWIPE_DISTANCE = 48;
const ZOOM_EPSILON = 0.02;

export function BinderZoomSurface({
  uri,
  pageLabel,
  sectionTitle,
  width,
  height,
  onSwipe,
  onToggleChrome,
  onImageError,
}: Props) {
  const theme = useAppTheme();
  const scale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const savedScale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [aspect, setAspect] = useState<number | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const page = edgeToEdgePageSize(width, aspect ?? undefined);
  const renderedWidth = useSharedValue(page.width);
  const renderedHeight = useSharedValue(page.height);
  const pageTallerThanViewport = page.height > height + 1;

  useEffect(() => {
    renderedWidth.value = page.width;
    renderedHeight.value = page.height;
  }, [page.height, page.width, renderedHeight, renderedWidth]);

  useEffect(() => {
    scale.value = NEWS_DETAIL_ZOOM_MIN;
    savedScale.value = NEWS_DETAIL_ZOOM_MIN;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    setScrollEnabled(true);
  }, [uri, height, width, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const syncScrollEnabled = (nextScale: number) => {
    setScrollEnabled(nextScale <= NEWS_DETAIL_ZOOM_MIN + ZOOM_EPSILON);
  };

  const applyClampedTranslation = (nextX: number, nextY: number, commit: boolean) => {
    'worklet';
    const zoomed = scale.value > NEWS_DETAIL_ZOOM_MIN + ZOOM_EPSILON;
    if (!zoomed) {
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
      runOnJS(syncScrollEnabled)(scale.value);
      if (scale.value <= NEWS_DETAIL_ZOOM_MIN + ZOOM_EPSILON) {
        scale.value = withTiming(NEWS_DETAIL_ZOOM_MIN);
        savedScale.value = NEWS_DETAIL_ZOOM_MIN;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }
      applyClampedTranslation(translateX.value, translateY.value, true);
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(12)
    .onUpdate((event) => {
      const zoomed = scale.value > NEWS_DETAIL_ZOOM_MIN + ZOOM_EPSILON;
      if (!zoomed) return;
      applyClampedTranslation(
        savedTranslateX.value + event.translationX,
        savedTranslateY.value + event.translationY,
        false,
      );
    })
    .onEnd((event) => {
      const zoomed = scale.value > NEWS_DETAIL_ZOOM_MIN + ZOOM_EPSILON;
      if (zoomed) {
        applyClampedTranslation(translateX.value, translateY.value, true);
        return;
      }
      const horizontal = Math.abs(event.translationX) >= SWIPE_DISTANCE
        && Math.abs(event.translationX) > Math.abs(event.translationY) * 1.2;
      if (horizontal) {
        runOnJS(onSwipe)(event.translationX < 0 ? 1 : -1);
      }
    });

  const tap = Gesture.Tap().maxDistance(12).onEnd(() => {
    runOnJS(onToggleChrome)();
  });

  const pageTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, Gesture.Exclusive(pan, tap))}>
      <View style={[styles.stage, { width, height }]}>
        <ScrollView
          scrollEnabled={scrollEnabled && pageTallerThanViewport}
          showsVerticalScrollIndicator
          showsHorizontalScrollIndicator={false}
          bounces
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: scrollEnabled ? height : undefined,
              paddingVertical: scrollEnabled && !pageTallerThanViewport
                ? Math.max(0, (height - page.height) / 2)
                : 0,
            },
          ]}
          style={styles.scroll}
        >
          <Animated.View
            style={[
              styles.page,
              {
                width: page.width,
                height: page.height,
                backgroundColor: theme.colors.surface,
              },
              pageTransformStyle,
            ]}
          >
            {uri ? (
              <Animated.Image
                source={{ uri }}
                resizeMode="contain"
                accessibilityLabel={`${sectionTitle} ${pageLabel}`}
                onLoad={(event) => {
                  const nextAspect = imageAspectFromLoadEvent(event);
                  if (nextAspect) setAspect(nextAspect);
                }}
                onError={() => onImageError?.()}
                style={styles.image}
              />
            ) : (
              <View style={styles.placeholder}>
                <AppText variant="heading">{pageLabel}</AppText>
                <AppText color="textSecondary">{sectionTitle}</AppText>
                <AppText variant="caption" color="textMuted" align="center">
                  {uri === undefined ? '페이지를 불러오는 중…' : '페이지 이미지를 불러오지 못했습니다.'}
                </AppText>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: {
    overflow: 'hidden',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  scroll: { flex: 1, width: '100%' },
  scrollContent: {
    alignItems: 'center',
    width: '100%',
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
