import { useEffect, type ReactNode } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { calculateNewsletterDetailPageZoomLayout } from './newsletterDetailPageZoomMath';

type Props = {
  availableWidth: number;
  children: ReactNode;
  resetKey: string | null;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
};

/**
 * Pinch-only document zoom. One-finger input remains owned by the parent
 * ScrollView; tap handling remains owned by each image press target.
 */
export function NewsletterDetailPageZoomContent({
  availableWidth,
  children,
  resetKey,
  scale,
  translateX,
}: Props) {
  const contentHeight = useSharedValue(0);

  useEffect(() => {
    contentHeight.value = 0;
  }, [resetKey]);

  const zoomStyle = useAnimatedStyle(() => {
    const layout = calculateNewsletterDetailPageZoomLayout(
      availableWidth,
      contentHeight.value,
      scale.value,
    );

    return {
      width: layout.logicalWidth,
      marginBottom: layout.marginBottom,
      transformOrigin: [0, 0, 0],
      transform: [{ translateX: translateX.value }, { scale: scale.value }],
    };
  }, [availableWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (Number.isFinite(nextHeight) && nextHeight > 0) {
      contentHeight.value = nextHeight;
    }
  };

  return (
    <Animated.View onLayout={handleLayout} style={zoomStyle}>
      {children}
    </Animated.View>
  );
}
