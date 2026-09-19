import { useRef, type ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export const NEWSLETTER_IMAGE_TAP_MAX_MOVEMENT = 10;

type TouchPoint = {
  pageX: number;
  pageY: number;
};

type Props = {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function isNewsletterImageTapMovement(
  start: TouchPoint,
  current: TouchPoint,
): boolean {
  const deltaX = current.pageX - start.pageX;
  const deltaY = current.pageY - start.pageY;
  const maxDistanceSquared =
    NEWSLETTER_IMAGE_TAP_MAX_MOVEMENT * NEWSLETTER_IMAGE_TAP_MAX_MOVEMENT;

  return deltaX * deltaX + deltaY * deltaY <= maxDistanceSquared;
}

/**
 * RN Pressable can complete a press after a drag when an Android ScrollView is
 * too short to consume that drag. Track the pointer session independently so
 * opening the viewer depends on tap movement, not on whether scrolling occurred.
 */
export function NewsletterDetailImagePressable({ children, onPress, style }: Props) {
  const startPointRef = useRef<TouchPoint | null>(null);
  const isTapRef = useRef(false);

  const beginPress = (event: GestureResponderEvent) => {
    startPointRef.current = {
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    };
    isTapRef.current = true;
  };

  const trackTouch = (event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const touches = event.nativeEvent.touches;
    const startPoint = startPointRef.current;

    if (!startPoint || touches.length !== 1) {
      isTapRef.current = false;
      return;
    }

    const [touch] = touches;
    if (
      !isNewsletterImageTapMovement(startPoint, {
        pageX: touch.pageX,
        pageY: touch.pageY,
      })
    ) {
      isTapRef.current = false;
    }
  };

  const cancelPress = () => {
    isTapRef.current = false;
  };

  const handlePress = () => {
    if (isTapRef.current) {
      onPress();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="이미지 확대"
      onPressIn={beginPress}
      onTouchStart={trackTouch}
      onTouchMove={trackTouch}
      onTouchCancel={cancelPress}
      onPress={handlePress}
      style={style}
    >
      {children}
    </Pressable>
  );
}
