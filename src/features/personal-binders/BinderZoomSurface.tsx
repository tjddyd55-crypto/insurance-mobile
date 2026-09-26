import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText, useAppTheme } from '../../design-system';
import {
  NEWS_DETAIL_ZOOM_MIN,
  calculateContainRenderedSize,
  calculatePanBounds,
  clampNewsDetailZoomScale,
  clampTranslation,
} from '../../components/newsDetailZoomMath';

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
  const rendered = calculateContainRenderedSize(width, height, width, Math.round(height * 1.3));
  const renderedWidth = useSharedValue(rendered.width || width);
  const renderedHeight = useSharedValue(rendered.height || height);

  const applyClampedTranslation = (nextX: number, nextY: number, commit: boolean) => {
    'worklet';
    if (scale.value <= NEWS_DETAIL_ZOOM_MIN) {
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
      if (scale.value <= NEWS_DETAIL_ZOOM_MIN) {
        scale.value = withTiming(NEWS_DETAIL_ZOOM_MIN);
        savedScale.value = NEWS_DETAIL_ZOOM_MIN;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-16, 16])
    .onUpdate((event) => {
      if (scale.value <= NEWS_DETAIL_ZOOM_MIN) return;
      applyClampedTranslation(savedTranslateX.value + event.translationX, savedTranslateY.value + event.translationY, false);
    })
    .onEnd((event) => {
      if (scale.value > NEWS_DETAIL_ZOOM_MIN) {
        applyClampedTranslation(translateX.value, translateY.value, true);
        return;
      }
      const horizontal = Math.abs(event.translationX) >= SWIPE_DISTANCE
        && Math.abs(event.translationX) > Math.abs(event.translationY) * 1.2;
      if (!horizontal) return;
      runOnJS(onSwipe)(event.translationX < 0 ? 1 : -1);
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
        {uri ? (
          <Animated.Image
            source={{ uri }}
            resizeMode="contain"
            accessibilityLabel={`${sectionTitle} ${pageLabel}`}
            style={[{ width, height }, imageStyle]}
          />
        ) : (
          <Animated.View style={[styles.placeholder, { backgroundColor: theme.colors.surface }, imageStyle]}>
            <AppText variant="heading">{pageLabel}</AppText>
            <AppText color="textSecondary">{sectionTitle}</AppText>
            <AppText variant="caption" color="textMuted" align="center">
              {uri === undefined ? '페이지를 불러오는 중…' : '이 기기에서는 페이지 이미지를 만들지 못했습니다. 전체 PDF로 저장할 수 있습니다.'}
            </AppText>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  placeholder: {
    width: '86%',
    minHeight: 280,
    maxHeight: '88%',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
