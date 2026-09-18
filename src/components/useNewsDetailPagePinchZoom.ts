import { useCallback, useEffect, type RefObject } from 'react';
import type { ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  NEWS_DETAIL_ZOOM_MIN,
  calculatePageZoomMaxScrollY,
  clampNewsDetailZoomScale,
  clampPageZoomScrollY,
  getPageZoomTopOriginTranslateY,
  getScaledContentHeight,
} from './newsDetailZoomMath';

type Options = {
  resetKey?: string | null;
  scrollRef?: RefObject<ScrollView | null>;
  scrollYRef?: RefObject<number>;
  viewportHeight?: number;
  topPadding?: number;
  bottomPadding?: number;
};

/**
 * Page-level pinch zoom for newsletter detail scroll content.
 * Pinch only — one-finger vertical scroll stays on the parent ScrollView.
 */
export function useNewsDetailPagePinchZoom({
  resetKey,
  scrollRef,
  scrollYRef,
  viewportHeight = 0,
  topPadding = 0,
  bottomPadding = 0,
}: Options = {}) {
  const scale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const savedScale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const baseHeight = useSharedValue(0);

  const resetZoom = () => {
    scale.value = NEWS_DETAIL_ZOOM_MIN;
    savedScale.value = NEWS_DETAIL_ZOOM_MIN;
  };

  const clampScrollOffset = useCallback(
    (currentScale: number) => {
      const scrollView = scrollRef?.current;
      if (!scrollView || viewportHeight <= 0 || baseHeight.value <= 0) {
        return;
      }

      const scaledHeight = getScaledContentHeight(baseHeight.value, currentScale);
      const maxScrollY = calculatePageZoomMaxScrollY({
        scaledContentHeight: scaledHeight,
        viewportHeight,
        topPadding,
        bottomPadding,
      });
      const currentScrollY = scrollYRef?.current ?? 0;
      const clampedScrollY = clampPageZoomScrollY(currentScrollY, maxScrollY);

      if (clampedScrollY !== currentScrollY) {
        scrollView.scrollTo({ y: clampedScrollY, animated: false });
        if (scrollYRef) {
          scrollYRef.current = clampedScrollY;
        }
      }
    },
    [scrollRef, scrollYRef, viewportHeight, topPadding, bottomPadding],
  );

  useEffect(() => {
    resetZoom();
    scrollRef?.current?.scrollTo({ y: 0, animated: false });
    if (scrollYRef) {
      scrollYRef.current = 0;
    }
  }, [resetKey]);

  useAnimatedReaction(
    () => scale.value,
    (currentScale, previousScale) => {
      if (previousScale === null || currentScale === previousScale) {
        return;
      }
      runOnJS(clampScrollOffset)(currentScale);
    },
  );

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      'worklet';
      scale.value = clampNewsDetailZoomScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      if (scale.value <= NEWS_DETAIL_ZOOM_MIN) {
        scale.value = withTiming(NEWS_DETAIL_ZOOM_MIN);
        savedScale.value = NEWS_DETAIL_ZOOM_MIN;
      }
      runOnJS(clampScrollOffset)(scale.value);
    });

  const spacerStyle = useAnimatedStyle(() => ({
    height: getScaledContentHeight(baseHeight.value, scale.value),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: getPageZoomTopOriginTranslateY(baseHeight.value, scale.value) },
      { scale: scale.value },
    ],
  }));

  const setBaseHeight = useCallback(
    (height: number) => {
      if (height <= 0) {
        return;
      }
      baseHeight.value = height;
      clampScrollOffset(scale.value);
    },
    [baseHeight, clampScrollOffset, scale],
  );

  return { pinchGesture, spacerStyle, contentStyle, setBaseHeight };
}
