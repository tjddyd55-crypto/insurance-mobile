import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  NEWS_DETAIL_IMAGE_MIN_SCALE,
  clampNewsDetailImageScale,
} from './newsDetailImageZoomGestures';

type UseNewsDetailImageZoomGesturesOptions = {
  resetKey?: string | null;
  onTap?: () => void;
  onZoomActiveChange?: (active: boolean) => void;
};

export function useNewsDetailImageZoomGestures({
  resetKey,
  onTap,
  onZoomActiveChange,
}: UseNewsDetailImageZoomGesturesOptions) {
  const scale = useSharedValue(NEWS_DETAIL_IMAGE_MIN_SCALE);
  const savedScale = useSharedValue(NEWS_DETAIL_IMAGE_MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchSession = useSharedValue(0);

  const notifyZoomActive = (active: boolean) => {
    onZoomActiveChange?.(active);
  };

  const resetTransform = () => {
    scale.value = NEWS_DETAIL_IMAGE_MIN_SCALE;
    savedScale.value = NEWS_DETAIL_IMAGE_MIN_SCALE;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    pinchSession.value = 0;
    notifyZoomActive(false);
  };

  useEffect(() => {
    resetTransform();
  }, [resetKey]);

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      pinchSession.value = 1;
      if (onZoomActiveChange) {
        runOnJS(notifyZoomActive)(true);
      }
    })
    .onUpdate((event) => {
      'worklet';
      scale.value = clampNewsDetailImageScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      pinchSession.value = 0;
      if (scale.value <= NEWS_DETAIL_IMAGE_MIN_SCALE) {
        scale.value = withTiming(NEWS_DETAIL_IMAGE_MIN_SCALE);
        savedScale.value = NEWS_DETAIL_IMAGE_MIN_SCALE;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (onZoomActiveChange) {
          runOnJS(notifyZoomActive)(false);
        }
      } else if (onZoomActiveChange) {
        runOnJS(notifyZoomActive)(true);
      }
    });

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_event, state) => {
      'worklet';
      if (scale.value > NEWS_DETAIL_IMAGE_MIN_SCALE) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .maxPointers(1)
    .onUpdate((event) => {
      'worklet';
      if (scale.value <= NEWS_DETAIL_IMAGE_MIN_SCALE) {
        return;
      }
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const tapGesture = onTap
    ? Gesture.Tap().onEnd(() => {
        'worklet';
        if (pinchSession.value === 0 && scale.value <= NEWS_DETAIL_IMAGE_MIN_SCALE + 0.01) {
          runOnJS(onTap)();
        }
      })
    : Gesture.Tap().enabled(false);

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return { composedGesture, animatedStyle, resetTransform };
}
