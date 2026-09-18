import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  NEWS_DETAIL_ZOOM_MIN,
  clampNewsDetailZoomScale,
} from './newsDetailZoomMath';

type Options = {
  resetKey?: string | null;
};

/**
 * Page-level pinch zoom for newsletter detail scroll content.
 * Pinch only — one-finger vertical scroll stays on the parent ScrollView.
 */
export function useNewsDetailPagePinchZoom({ resetKey }: Options = {}) {
  const scale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const savedScale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);

  const resetZoom = () => {
    scale.value = NEWS_DETAIL_ZOOM_MIN;
    savedScale.value = NEWS_DETAIL_ZOOM_MIN;
  };

  useEffect(() => {
    resetZoom();
  }, [resetKey]);

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
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { pinchGesture, animatedStyle };
}
