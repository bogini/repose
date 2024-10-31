import { StyleSheet, View, Text, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { memo, useEffect, useMemo, useState } from "react";
import { debounce } from "lodash";
import { FeatureKey } from "../lib/faceControl";
import { Segments } from "../api/segmentation";
import { SegmentsCanvas } from "./SegmentsCanvas";
import { useSelfieSegments } from "../hooks/useSelfieSegments";

const IMAGE_TRANSITION = {
  duration: 150,
  effect: "cross-dissolve",
} as const;

interface ImageContainerProps {
  loading?: boolean;
  imageUrl?: string;
  originalImageUrl?: string;
  detectFace?: boolean;
  debug?: boolean;
  selectedControl?: FeatureKey;
}

const SegmentationOverlay = memo(
  ({
    segments,
    loading,
    layoutDimensions,
    originalImageSize,
    debug,
  }: {
    segments: Segments | null;
    loading: boolean;
    layoutDimensions: { width: number; height: number; x: number; y: number };
    originalImageSize: { width: number; height: number };
    debug?: boolean;
  }) => {
    if (
      !segments ||
      !loading ||
      !layoutDimensions.width ||
      !layoutDimensions.height
    ) {
      return null;
    }

    return (
      <Animated.View entering={FadeIn} exiting={FadeOut}>
        <SegmentsCanvas
          segments={segments}
          layoutDimensions={layoutDimensions}
          imageSize={originalImageSize}
          debug={debug}
        />
      </Animated.View>
    );
  }
);

export const ImageContainer = ({
  loading = false,
  imageUrl,
  originalImageUrl,
  detectFace = false,
  debug = false,
}: ImageContainerProps) => {
  const [lastLoadedImage, setLastLoadedImage] = useState<string | undefined>(
    undefined
  );
  const [layoutDimensions, setLayoutDimensions] = useState({
    width: 568,
    height: 430,
    x: 0,
    y: 0,
  });

  const { segments, detectSegments } = useSelfieSegments(
    imageUrl || originalImageUrl
  );

  const debouncedDetectSegments = useMemo(
    () => debounce(detectSegments, 3000, { leading: false, trailing: true }),
    [detectSegments]
  );

  useEffect(() => {
    const triggerDetection = async () => {
      if (!imageUrl || !detectFace) return;

      debouncedDetectSegments();
    };

    triggerDetection();

    return () => {
      debouncedDetectSegments.cancel();
    };
  }, [imageUrl, detectFace, debouncedDetectSegments]);

  return (
    <View style={styles.fullSize}>
      <Image
        source={{ uri: imageUrl }}
        cachePolicy={"memory-disk"}
        placeholder={{ uri: lastLoadedImage || originalImageUrl }}
        placeholderContentFit="cover"
        allowDownscaling={false}
        blurRadius={loading && !segments ? 1 : 0}
        priority={"high"}
        style={[styles.fullSize, { opacity: 1 }]}
        transition={IMAGE_TRANSITION}
        contentFit="cover"
        onLoadEnd={() => {
          setLastLoadedImage(imageUrl);
        }}
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height, x, y } = event.nativeEvent.layout;
          setLayoutDimensions({ width, height, x, y });
        }}
        onError={(error) => {
          console.error("Image loading error:", error);
        }}
      />

      {detectFace && (
        <View style={styles.canvasContainer}>
          <SegmentationOverlay
            segments={segments}
            loading={loading}
            layoutDimensions={layoutDimensions}
            originalImageSize={
              imageUrl === originalImageUrl
                ? { width: 1024, height: 1024 }
                : { width: 512, height: 512 }
            }
            debug={debug}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullSize: {
    width: "100%",
    height: "100%",
  },
  canvasContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
    width: "100%",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
