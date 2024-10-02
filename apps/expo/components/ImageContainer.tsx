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
  imageUrl: string;
}

export const ImageContainer = ({
  loading = false,
  imageUrl,
}: ImageContainerProps) => {
  const [downloading, setDownloading] = useState(false);
  const pulseAnimation = useSharedValue(1);

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
      {/* <FastImage
        key={imageUrl}
        source={{ uri: imageUrl, priority: FastImage.priority.high }}
        style={styles.fullSize}
        resizeMode={FastImage.resizeMode.cover}
        onLoadStart={() => {
          setDownloading(true);
          startTime.value = performance.now();
        }}
        onLoadEnd={() => {
          setDownloading(false);
          const endTime = performance.now();
          const duration = endTime - startTime.value;
          console.log(`FastImage loaded in ${duration.toFixed(0)}ms`);
        }}
      /> */}
      <Image
        source={{ uri: imageUrl }}
        cachePolicy={"memory-disk"}
        placeholder={{ uri: imageUrl }}
        placeholderContentFit="cover"
        blurRadius={loading ? 8 : 0}
        allowDownscaling={false}
        priority={"high"}
        style={styles.fullSize}
        transition={{
          duration: 150,
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
  },
});
