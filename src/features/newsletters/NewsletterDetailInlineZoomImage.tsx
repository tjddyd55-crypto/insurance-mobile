import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useNewsDetailImageZoomGestures } from '../../components/useNewsDetailImageZoomGestures';

type Props = {
  imageUrl: string;
  frameStyle: StyleProp<ViewStyle>;
  resetKey?: string | null;
  onPress: () => void;
  onZoomActiveChange?: (active: boolean) => void;
};

export function NewsletterDetailInlineZoomImage({
  imageUrl,
  frameStyle,
  resetKey,
  onPress,
  onZoomActiveChange,
}: Props) {
  const { composedGesture, animatedStyle } = useNewsDetailImageZoomGestures({
    resetKey,
    onTap: onPress,
    onZoomActiveChange,
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={frameStyle}
        accessibilityRole="button"
        accessibilityLabel="이미지 확대"
      >
        <Animated.Image
          source={{ uri: imageUrl }}
          style={[styles.image, animatedStyle]}
          resizeMode="cover"
          accessibilityLabel="소식지 상세 이미지"
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  image: {
    ...StyleSheet.absoluteFill,
  },
});
