import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";

interface ImageContainerProps {
  loading?: boolean;
  imageUrl?: string;
  originalImageUrl?: string;
}

export const ImageContainer = ({
  loading = false,
  imageUrl,
  originalImageUrl,
}: ImageContainerProps) => {
  const [downloading, setDownloading] = useState(false);
  const pulseAnimation = useSharedValue(1);
  const [lastLoadedImage, setLastLoadedImage] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    pulseAnimation.value =
      loading || downloading
        ? withRepeat(withTiming(0.8, { duration: 500 }), -1, true)
        : withTiming(1, { duration: 250 });
  }, [loading, downloading, pulseAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseAnimation.value,
  }));

  const startTime = useSharedValue(0);

  return (
    <Animated.View style={[styles.fullSize, animatedStyle]}>
      <Image
        source={{ uri: imageUrl }}
        cachePolicy={"memory-disk"}
        placeholder={{ uri: lastLoadedImage || originalImageUrl }}
        placeholderContentFit="cover"
        blurRadius={loading ? 8 : 0}
        allowDownscaling={false}
        priority={"high"}
        style={styles.fullSize}
        transition={{
          duration: 200,
          effect: "cross-dissolve",
        }}
        contentFit="cover"
        onLoadStart={() => {
          setDownloading(true);
          startTime.value = performance.now();
        }}
        onLoadEnd={() => {
          setDownloading(false);
          const endTime = performance.now();
          const duration = endTime - startTime.value;
          setLastLoadedImage(imageUrl);
        }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullSize: {
    width: "100%",
    height: "100%",
  },
});
