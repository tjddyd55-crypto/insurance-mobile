import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText, useAppTheme } from '../../design-system';
import {
  NEWS_DETAIL_ZOOM_MAX,
  binderPageOriginInViewport,
  calculatePanBounds,
  clampTranslation,
  focalPointToPageLocal,
  translationForFocalPinch,
} from '../../components/newsDetailZoomMath';
import { computeBinderInitialScale, edgeToEdgePageSize, imageAspectFromLoadEvent } from './binderPageLayout';

type Props = {
  uri: string | null | undefined;
  /** Changes when the viewer page identity changes (used to reset zoom after a successful swap). */
  pageKey?: string;
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
  pageKey = '',
  pageLabel,
  sectionTitle,
  width,
  height,
  onSwipe,
  onToggleChrome,
  onImageError,
}: Props) {
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const fitScale = useSharedValue(1);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalPageX = useSharedValue(0);
  const focalPageY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const contentPaddingTop = useSharedValue(0);
  const viewportWidth = useSharedValue(width);
  const viewportHeight = useSharedValue(height);
  const [aspect, setAspect] = useState<number | null>(null);
  const [displayedPageKey, setDisplayedPageKey] = useState(pageKey);
  const [displayedUri, setDisplayedUri] = useState<string | null | undefined>(uri);
  const pendingUri = uri && uri !== displayedUri ? uri : undefined;
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const page = edgeToEdgePageSize(width, aspect ?? undefined);
  const renderedWidth = useSharedValue(page.width);
  const renderedHeight = useSharedValue(page.height);
  const pageTallerThanViewport = page.height > height + 1;
  const verticalPadding = pageTallerThanViewport ? 0 : Math.max(0, (height - page.height) / 2);

  useEffect(() => {
    renderedWidth.value = page.width;
    renderedHeight.value = page.height;
    viewportWidth.value = width;
    viewportHeight.value = height;
    contentPaddingTop.value = verticalPadding;
  }, [
    contentPaddingTop,
    height,
    page.height,
    page.width,
    renderedHeight,
    renderedWidth,
    verticalPadding,
    viewportHeight,
    viewportWidth,
    width,
  ]);

  useEffect(() => {
    const initial = computeBinderInitialScale(width, height, page.width, page.height);
    fitScale.value = initial;
    scale.value = initial;
    savedScale.value = initial;
    pinchStartScale.value = initial;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    scrollY.value = 0;
    setScrollEnabled(true);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [
    displayedPageKey,
    fitScale,
    height,
    page.height,
    page.width,
    pinchStartScale,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    scrollY,
    translateX,
    translateY,
    width,
  ]);

  const syncScrollEnabled = useCallback((nextScale: number, min: number) => {
    const enabled = nextScale <= min + ZOOM_EPSILON;
    scrollRef.current?.setNativeProps({ scrollEnabled: enabled });
    setScrollEnabled(enabled);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const disableScrollForPinch = useCallback(() => {
    scrollRef.current?.setNativeProps({ scrollEnabled: false });
    setScrollEnabled(false);
  }, []);

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
      renderedWidth.value,
      renderedHeight.value,
      scale.value,
      viewportWidth.value,
      viewportHeight.value,
    );
    const clamped = clampTranslation(nextX, nextY, bounds);
    translateX.value = clamped.x;
    translateY.value = clamped.y;
    if (commit) {
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    }
  };

  const captureFocalPage = (focalX: number, focalY: number) => {
    'worklet';
    const origin = binderPageOriginInViewport(
      viewportWidth.value,
      renderedWidth.value,
      contentPaddingTop.value,
      scrollY.value,
    );
    const local = focalPointToPageLocal(
      focalX,
      focalY,
      origin,
      renderedWidth.value,
      renderedHeight.value,
      scale.value,
      translateX.value,
      translateY.value,
    );
    focalPageX.value = local.x;
    focalPageY.value = local.y;
  };

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      const scrollComp = scrollY.value;
      if (scrollComp > 0.5) {
        translateY.value += scrollComp;
        savedTranslateY.value += scrollComp;
        scrollY.value = 0;
        runOnJS(scrollToTop)();
      }
      runOnJS(disableScrollForPinch)();
      pinchStartScale.value = scale.value;
      captureFocalPage(event.focalX, event.focalY);
    })
    .onUpdate((event) => {
      const next = Math.min(
        NEWS_DETAIL_ZOOM_MAX,
        Math.max(fitScale.value, pinchStartScale.value * event.scale),
      );
      const origin = binderPageOriginInViewport(
        viewportWidth.value,
        renderedWidth.value,
        contentPaddingTop.value,
        scrollY.value,
      );
      const nextTranslation = translationForFocalPinch(
        event.focalX,
        event.focalY,
        { x: focalPageX.value, y: focalPageY.value },
        origin,
        renderedWidth.value,
        renderedHeight.value,
        next,
      );
      scale.value = next;
      applyClampedTranslation(nextTranslation.x, nextTranslation.y, false);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= fitScale.value + ZOOM_EPSILON) {
        scale.value = withTiming(fitScale.value);
        savedScale.value = fitScale.value;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(syncScrollEnabled)(fitScale.value, fitScale.value);
        return;
      }
      applyClampedTranslation(translateX.value, translateY.value, true);
      runOnJS(syncScrollEnabled)(scale.value, fitScale.value);
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(12)
    .onUpdate((event) => {
      const zoomed = scale.value > fitScale.value + ZOOM_EPSILON;
      if (!zoomed) return;
      applyClampedTranslation(
        savedTranslateX.value + event.translationX,
        savedTranslateY.value + event.translationY,
        false,
      );
    })
    .onEnd((event) => {
      const zoomed = scale.value > fitScale.value + ZOOM_EPSILON;
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
          ref={scrollRef}
          scrollEnabled={scrollEnabled && pageTallerThanViewport}
          showsVerticalScrollIndicator
          showsHorizontalScrollIndicator={false}
          bounces
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: height,
              paddingVertical: verticalPadding,
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
            {displayedUri ? (
              <Animated.Image
                source={{ uri: displayedUri }}
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
            {pendingUri ? (
              <Animated.Image
                source={{ uri: pendingUri }}
                resizeMode="contain"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                onLoad={(event) => {
                  const nextAspect = imageAspectFromLoadEvent(event);
                  if (nextAspect) setAspect(nextAspect);
                  setDisplayedUri(pendingUri);
                  setDisplayedPageKey(pageKey);
                }}
                onError={() => onImageError?.()}
                style={styles.preloadImage}
              />
            ) : null}
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
  preloadImage: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  placeholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
});
