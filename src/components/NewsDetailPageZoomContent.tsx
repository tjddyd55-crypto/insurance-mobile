import type { ReactNode } from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useNewsDetailPagePinchZoom } from './useNewsDetailPagePinchZoom';

type Props = {
  children: ReactNode;
  resetKey?: string | null;
};

/**
 * Wraps newsletter detail scroll content with page-level pinch zoom.
 * Header / close controls must stay outside this wrapper.
 */
export function NewsDetailPageZoomContent({ children, resetKey }: Props) {
  const { pinchGesture, animatedStyle } = useNewsDetailPagePinchZoom({ resetKey });

  return (
    <GestureDetector gesture={pinchGesture}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
