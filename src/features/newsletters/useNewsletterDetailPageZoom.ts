import { useEffect } from 'react';
import type { ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import {
  NEWS_DETAIL_ZOOM_MIN,
  clampNewsDetailZoomScale,
} from '../../components/newsDetailZoomMath';

type Options = {
  availableWidth: number;
  contentLeft: number;
  contentTop: number;
  resetKey: string | null;
  scrollGesture: ReturnType<typeof Gesture.Native>;
};

export function useNewsletterDetailPageZoom({
  availableWidth,
  contentLeft,
  contentTop,
  resetKey,
  scrollGesture,
}: Options) {
  const scrollRef = useAnimatedRef<ScrollView>();
  const scale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const startScale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const focalContentX = useSharedValue(0);
  const focalContentY = useSharedValue(0);

  useEffect(() => {
    scale.value = NEWS_DETAIL_ZOOM_MIN;
    startScale.value = NEWS_DETAIL_ZOOM_MIN;
    translateX.value = 0;
  }, [resetKey]);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const pinchGesture = Gesture.Pinch()
    .simultaneousWithExternalGesture(scrollGesture)
    .onStart((event) => {
      'worklet';
      startScale.value = scale.value;
      const localFocalX = event.focalX - contentLeft;
      focalContentX.value = (localFocalX - translateX.value) / scale.value;
      focalContentY.value = (scrollY.value + event.focalY - contentTop) / scale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const nextScale = clampNewsDetailZoomScale(startScale.value * event.scale);
      const localFocalX = event.focalX - contentLeft;
      const unclampedTranslateX = localFocalX - focalContentX.value * nextScale;
      const minTranslateX = availableWidth - availableWidth * nextScale;
      const nextTranslateX = Math.min(0, Math.max(minTranslateX, unclampedTranslateX));
      const nextScrollY =
        contentTop + focalContentY.value * nextScale - event.focalY;

      scale.value = nextScale;
      translateX.value = nextTranslateX;
      scrollTo(scrollRef, 0, Math.max(0, nextScrollY), false);
    })
    .onEnd((event) => {
      'worklet';
      const nextScrollY =
        contentTop + focalContentY.value * scale.value - event.focalY;
      scrollTo(scrollRef, 0, Math.max(0, nextScrollY), false);
    });

  const horizontalPanGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .simultaneousWithExternalGesture(scrollGesture)
    .onStart(() => {
      'worklet';
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      'worklet';
      if (scale.value <= NEWS_DETAIL_ZOOM_MIN) {
        translateX.value = 0;
        return;
      }

      const minTranslateX = availableWidth - availableWidth * scale.value;
      translateX.value = Math.min(
        0,
        Math.max(minTranslateX, startTranslateX.value + event.translationX),
      );
    });

  const pageGesture = Gesture.Race(pinchGesture, horizontalPanGesture);

  return {
    pageGesture,
    scale,
    scrollHandler,
    scrollRef,
    translateX,
  };
}
