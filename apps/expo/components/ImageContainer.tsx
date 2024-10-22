import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import {
  FaceLandmarkDetector,
  type FaceLandmarkResult,
} from "../api/faceLandmarks";
import { FaceLandmarksCanvas } from "./FaceLandmarksCanvas";
import PhotosService from "../api/photos";

interface ImageContainerProps {
  loading?: boolean;
  imageUrl?: string;
  originalImageUrl?: string;
  detectFace?: boolean;
}

const detector = FaceLandmarkDetector.getInstance();

const calculateImageDimensions = (
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  contentFit: "cover" | "contain" = "cover"
) => {
  const imageAspectRatio = imageWidth / imageHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  let width,
    height,
    x = 0,
    y = 0;

  if (contentFit === "cover") {
    if (containerAspectRatio > imageAspectRatio) {
      width = containerWidth;
      height = containerWidth / imageAspectRatio;
      y = (containerHeight - height) / 2;
    } else {
      height = containerHeight;
      width = containerHeight * imageAspectRatio;
      x = (containerWidth - width) / 2;
    }
  } else {
    // contain
    if (containerAspectRatio > imageAspectRatio) {
      height = containerHeight;
      width = containerHeight * imageAspectRatio;
      x = (containerWidth - width) / 2;
    } else {
      width = containerWidth;
      height = containerWidth / imageAspectRatio;
      y = (containerHeight - height) / 2;
    }
  }

  return { width, height, x, y };
};

export const ImageContainer = ({
  loading = false,
  imageUrl,
  originalImageUrl,
  detectFace = false,
}: ImageContainerProps) => {
  const [downloading, setDownloading] = useState(false);
  const pulseAnimation = useSharedValue(1);
  const [lastLoadedImage, setLastLoadedImage] = useState<string | undefined>(
    undefined
  );
  const [landmarks, setLandmarks] = useState<FaceLandmarkResult | null>(null);
  const [imageLayout, setImageLayout] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState({
    width: 1024,
    height: 1024,
  });

  useEffect(() => {
    if (!detectFace || !imageUrl) return;

    setLandmarks(null);

    detector
      .initialize()
      .then(() => detector.detectLandmarks(imageUrl))
      .then((landmarks) => {
        console.log("landmarks", landmarks);
        setLandmarks(landmarks);
      })
      .catch((error) => {
        console.error("Error detecting face landmarks:", error);
        setLandmarks(null);
      });
  }, [imageUrl, detectFace]);

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

  const handleImageLayout = (event: LayoutChangeEvent) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    setImageLayout({ width, height, x, y });
  };

  const imageDimensions = imageLayout
    ? calculateImageDimensions(
        imageLayout.width,
        imageLayout.height,
        originalImageSize.width,
        originalImageSize.height,
        "cover"
      )
    : null;

  useEffect(() => {
    if (imageUrl) {
      PhotosService.getImageDimensions(imageUrl)
        .then((dimensions) => {
          setOriginalImageSize(dimensions);
        })
        .catch((error) => {
          console.error("Error getting image dimensions:", error);
        });
    }
  }, [imageUrl]);

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
          setLastLoadedImage(imageUrl);
        }}
        onLayout={handleImageLayout}
      />
      {detectFace && landmarks && imageLayout && imageDimensions && (
        <View style={[styles.canvasContainer, { width: imageLayout.width }]}>
          <FaceLandmarksCanvas
            landmarks={landmarks}
            imageDimensions={imageDimensions}
            originalImageSize={originalImageSize}
          />
        </View>
      )}
    </Animated.View>
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
    justifyContent: "center",
    alignItems: "center",
  },
});
