import type { ReactNode, RefObject } from 'react';
import { View, type LayoutChangeEvent, type ScrollView } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useNewsDetailPagePinchZoom } from './useNewsDetailPagePinchZoom';

type Props = {
  children: ReactNode;
  resetKey?: string | null;
  scrollRef?: RefObject<ScrollView | null>;
  scrollYRef?: RefObject<number>;
  viewportHeight?: number;
  topPadding?: number;
  bottomPadding?: number;
};

/**
 * Wraps newsletter detail scroll content with page-level pinch zoom.
 * Header / close controls must stay outside this wrapper.
 */
export function NewsDetailPageZoomContent({
  children,
  resetKey,
  scrollRef,
  scrollYRef,
  viewportHeight = 0,
  topPadding = 0,
  bottomPadding = 0,
}: Props) {
  const { pinchGesture, spacerStyle, contentStyle, setBaseHeight } = useNewsDetailPagePinchZoom({
    resetKey,
    scrollRef,
    scrollYRef,
    viewportHeight,
    topPadding,
    bottomPadding,
  });

  const handleContentLayout = (event: LayoutChangeEvent) => {
    setBaseHeight(event.nativeEvent.layout.height);
  };

  return (
    <GestureDetector gesture={pinchGesture}>
      <Animated.View style={spacerStyle}>
        <Animated.View style={contentStyle}>
          <View onLayout={handleContentLayout}>{children}</View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
