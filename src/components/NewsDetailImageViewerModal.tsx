import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModalCloseButton } from './ModalCloseButton';
import {
  NEWS_DETAIL_ZOOM_MIN,
  calculateContainRenderedSize,
  calculatePanBounds,
  clampNewsDetailZoomScale,
  clampTranslation,
} from './newsDetailZoomMath';
import { useAppTheme, type AppTheme } from '../design-system';

type Props = {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

export function NewsDetailImageViewerModal({ visible, imageUrl, onClose }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const scale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const savedScale = useSharedValue(NEWS_DETAIL_ZOOM_MIN);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const renderedWidth = useSharedValue(0);
  const renderedHeight = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);

  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const resetTransform = () => {
    scale.value = NEWS_DETAIL_ZOOM_MIN;
    savedScale.value = NEWS_DETAIL_ZOOM_MIN;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const uri = String(imageUrl ?? '').trim();
  const imageLayoutWidth = width;
  const imageLayoutHeight = height * 0.72;

  useEffect(() => {
    if (!visible) {
      resetTransform();
      setNaturalSize({ width: 0, height: 0 });
    }
  }, [visible]);

  useEffect(() => {
    resetTransform();
    setNaturalSize({ width: 0, height: 0 });
    if (!uri) {
      return;
    }
    void Image.getSize(
      uri,
      (imageWidth, imageHeight) => {
        setNaturalSize({ width: imageWidth, height: imageHeight });
      },
      () => {
        setNaturalSize({ width: 0, height: 0 });
      },
    );
  }, [imageUrl]);

  useEffect(() => {
    const rendered = calculateContainRenderedSize(
      imageLayoutWidth,
      imageLayoutHeight,
      naturalSize.width,
      naturalSize.height,
    );
    renderedWidth.value = rendered.width;
    renderedHeight.value = rendered.height;
    viewportWidth.value = imageLayoutWidth;
    viewportHeight.value = imageLayoutHeight;
  }, [imageLayoutWidth, imageLayoutHeight, naturalSize.width, naturalSize.height]);

  const applyClampedTranslation = (nextX: number, nextY: number) => {
    'worklet';
    if (scale.value <= NEWS_DETAIL_ZOOM_MIN) {
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
    savedTranslateX.value = clamped.x;
    savedTranslateY.value = clamped.y;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      'worklet';
      scale.value = clampNewsDetailZoomScale(savedScale.value * event.scale);
      applyClampedTranslation(translateX.value, translateY.value);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      if (scale.value <= NEWS_DETAIL_ZOOM_MIN) {
        scale.value = withTiming(NEWS_DETAIL_ZOOM_MIN);
        savedScale.value = NEWS_DETAIL_ZOOM_MIN;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }
      applyClampedTranslation(translateX.value, translateY.value);
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onUpdate((event) => {
      'worklet';
      if (scale.value <= NEWS_DETAIL_ZOOM_MIN) {
        return;
      }
      applyClampedTranslation(
        savedTranslateX.value + event.translationX,
        savedTranslateY.value + event.translationY,
      );
    })
    .onEnd(() => {
      'worklet';
      applyClampedTranslation(translateX.value, translateY.value);
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={visible && Boolean(uri)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <ModalCloseButton onPress={onClose} />
          </View>
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={styles.stage}>
              {uri ? (
                <Animated.Image
                  source={{ uri }}
                  resizeMode="contain"
                  accessibilityLabel="확대된 소식지 이미지"
                  style={[
                    styles.image,
                    { width: imageLayoutWidth, height: imageLayoutHeight },
                    imageStyle,
                  ]}
                />
              ) : null}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    gestureRoot: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
    },
    header: {
      alignItems: 'flex-end',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    stage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      backgroundColor: theme.colors.surfaceSubtle,
    },
  });
}
