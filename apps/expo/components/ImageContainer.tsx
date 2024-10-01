import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

interface ImageContainerProps {
  loading: boolean;
  imageUrl: string;
}

export const ImageContainer = ({ loading, imageUrl }: ImageContainerProps) => {
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    pulseAnimation.value = loading
      ? withRepeat(withTiming(0.8, { duration: 500 }), -1, true)
      : withTiming(1, { duration: 250 });
  }, [loading, pulseAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseAnimation.value,
  }));

  return (
    <Animated.View style={[styles.fullSize, animatedStyle]}>
      <Image
        source={{ uri: imageUrl }}
        cachePolicy={"memory-disk"}
        placeholder={{ uri: imageUrl }}
        placeholderContentFit="cover"
        allowDownscaling={false}
        priority={"high"}
        transition={{
          duration: 250,
          effect: "cross-dissolve",
          timing: "ease-in-out",
        }}
        style={styles.fullSize}
        contentFit="cover"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullSize: {
    width: "100%",
    height: "100%",
    backgroundColor: "red",
  },
});
