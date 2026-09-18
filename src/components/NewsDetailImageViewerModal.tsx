import { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModalCloseButton } from './ModalCloseButton';
import { useAppTheme, type AppTheme } from '../design-system';

const MIN_SCALE = 1;
const MAX_SCALE = 3;

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

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const next = savedScale.value * event.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        savedScale.value = MIN_SCALE;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= MIN_SCALE) {
        return;
      }
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const uri = String(imageUrl ?? '').trim();

  return (
    <Modal visible={visible && Boolean(uri)} transparent animationType="fade" onRequestClose={onClose}>
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
                style={[styles.image, { width, height: height * 0.72 }, imageStyle]}
              />
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
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
