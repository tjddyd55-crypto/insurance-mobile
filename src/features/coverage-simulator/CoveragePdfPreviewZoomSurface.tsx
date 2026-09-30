import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  NEWS_DETAIL_ZOOM_MAX,
  calculatePanBounds,
  clampTranslation,
} from '../../components/newsDetailZoomMath';

type Props = {
  documentKey: string;
  children: ReactNode;
};

const ZOOM_EPSILON = 0.02;

export function CoveragePdfPreviewZoomSurface({ documentKey, children }: Props) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const viewportWidth = viewportSize.width;
  const viewportHeight = viewportSize.height;

  const fitScale = useSharedValue(1);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const contentWidth = useSharedValue(1);
  const contentHeight = useSharedValue(1);

  const onContentLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setContentSize((current) =>
      Math.abs(current.width - width) <= 1 && Math.abs(current.height - height) <= 1
        ? current
        : { width, height },
    );
  };

  useEffect(() => {
    const naturalWidth = Math.max(1, contentSize.width);
    const naturalHeight = Math.max(1, contentSize.height);
    const nextFit = Math.min(1, viewportWidth / naturalWidth);
    fitScale.value = nextFit;
    scale.value = nextFit;
    savedScale.value = nextFit;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    contentWidth.value = naturalWidth;
    contentHeight.value = naturalHeight;
    setScrollEnabled(true);
  }, [
    contentHeight,
    contentSize.height,
    contentSize.width,
    contentWidth,
    documentKey,
    fitScale,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
    viewportWidth,
  ]);

  const syncScrollEnabled = (nextScale: number, min: number) => {
    setScrollEnabled(nextScale <= min + ZOOM_EPSILON);
  };

  const scrollGesture = useMemo(() => Gesture.Native(), []);

  const applyClampedTranslation = (nextX: number, nextY: number, commit: boolean) => {
    'worklet';
    const zoomed = scale.value > fitScale.value + ZOOM_EPSILON;
    if (!zoomed) {
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      return;
    }
    const bounds = calculatePanBounds(
      contentWidth.value,
      contentHeight.value,
      scale.value,
      viewportWidth,
      viewportHeight,
    );
    const clamped = clampTranslation(nextX, nextY, bounds);
    translateX.value = clamped.x;
    translateY.value = clamped.y;
    if (commit) {
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    }
  };

  const pinch = Gesture.Pinch()
    .blocksExternalGesture(scrollGesture)
    .onUpdate((event) => {
      const next = savedScale.value * event.scale;
      const clamped = Math.min(NEWS_DETAIL_ZOOM_MAX, Math.max(fitScale.value, next));
      scale.value = clamped;
    })
    .onEnd(() => {
      if (scale.value <= fitScale.value + ZOOM_EPSILON) {
        scale.value = withTiming(fitScale.value);
        savedScale.value = fitScale.value;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }
      savedScale.value = scale.value;
      applyClampedTranslation(translateX.value, translateY.value, true);
    })
    .onFinalize(() => {
      runOnJS(syncScrollEnabled)(scale.value, fitScale.value);
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .manualActivation(true)
    .onTouchesMove((_event, state) => {
      if (scale.value > fitScale.value + ZOOM_EPSILON) {
        state.activate();
        return;
      }
      state.fail();
    })
    .onUpdate((event) => {
      applyClampedTranslation(
        savedTranslateX.value + event.translationX,
        savedTranslateY.value + event.translationY,
        false,
      );
    })
    .onEnd(() => {
      applyClampedTranslation(translateX.value, translateY.value, true);
    });

  const docTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
      <View
        style={styles.stage}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width <= 0 || height <= 0) return;
          setViewportSize((current) =>
            Math.abs(current.width - width) <= 1 && Math.abs(current.height - height) <= 1
              ? current
              : { width, height },
          );
        }}
      >
        <GestureDetector gesture={scrollGesture}>
          <ScrollView
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            style={styles.scroll}
          >
            <Animated.View style={docTransformStyle} onLayout={onContentLayout}>
              {children}
            </Animated.View>
          </ScrollView>
        </GestureDetector>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
});
