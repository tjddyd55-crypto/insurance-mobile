import { useMemo } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModalCloseButton } from './ModalCloseButton';
import { useNewsDetailImageZoomGestures } from './useNewsDetailImageZoomGestures';
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

  const uri = String(imageUrl ?? '').trim();
  const { composedGesture, animatedStyle } = useNewsDetailImageZoomGestures({
    resetKey: visible && uri ? uri : null,
  });

  const imageHeight = height * 0.72;

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
                  style={[styles.image, { width, height: imageHeight }, animatedStyle]}
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
