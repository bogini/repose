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
  loading?: boolean;
  imageUrl: string;
}

export const ImageContainer = ({
  loading = false,
  imageUrl,
}: ImageContainerProps) => {
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    pulseAnimation.value = loading
      ? withRepeat(withTiming(0.8, { duration: 500 }), -1, true)
      : withTiming(1, { duration: 250 });
  }, [loading, pulseAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseAnimation.value,
  }));

  const startTime = performance.now();

  return (
    <Animated.View style={[styles.fullSize, animatedStyle]}>
      <Image
        source={{ uri: imageUrl }}
        cachePolicy={"memory-disk"}
        placeholder={{ uri: imageUrl }}
        placeholderContentFit="cover"
        allowDownscaling={false}
        priority={"high"}
        style={styles.fullSize}
        contentFit="cover"
        onLoad={() => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          console.log(`Image loaded in ${duration.toFixed(0)}ms`);
        }}
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
