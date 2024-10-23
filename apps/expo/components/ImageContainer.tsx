import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { FaceLandmarksCanvas } from "./FaceLandmarksCanvas";
import PhotosService from "../api/photos";
import {
  FaceContourType,
  RNMLKitFaceDetectorOptions,
  useFaceDetector,
} from "@infinitered/react-native-mlkit-face-detection";
import * as FileSystem from "expo-file-system";

export type LandmarkLocation = [number, number]; // [x, y] coordinates

export interface FaceLandmarkResult {
  faceOval: LandmarkLocation[];
  leftEyebrow: LandmarkLocation[];
  rightEyebrow: LandmarkLocation[];
  leftEye: LandmarkLocation[];
  rightEye: LandmarkLocation[];
  lips: LandmarkLocation[];
  upperLips: LandmarkLocation[];
  lowerLips: LandmarkLocation[];
}

interface ImageContainerProps {
  loading?: boolean;
  imageUrl?: string;
  originalImageUrl?: string;
  detectFace?: boolean;
  debug?: boolean;
}

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
  debug = false,
}: ImageContainerProps) => {
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
  const detector = useFaceDetector();

  useEffect(() => {
    if (!detectFace || !imageUrl) return;

    setLandmarks(null);

    const downloadAndDetectFace = async () => {
      try {
        // Generate local URI from imageUrl
        const localUri = `${FileSystem.cacheDirectory}${imageUrl.split("/").pop()}`;

        // Only download if file doesn't exist
        const fileInfo = await FileSystem.getInfoAsync(localUri);

        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(imageUrl, localUri);
        }

        const detectorOptions: RNMLKitFaceDetectorOptions = {
          performanceMode: "fast",
          landmarkMode: false,
          contourMode: true,
        };

        // Initialize detector and detect faces
        await detector.initialize(detectorOptions);
        const result = await detector.detectFaces(localUri);

        if (!result || result.error || !result.faces.length) {
          return;
        }

        const face = result.faces[0];

        // Helper function to extract points from contours
        const getContourPoints = (type: string): LandmarkLocation[] => {
          const contour = face.contours?.find((c) => c.type === type);
          return contour?.points?.map((p) => [p.x, p.y]) ?? [];
        };

        const landmarks = {
          faceOval: getContourPoints("Face"),
          leftEyebrow: [
            ...getContourPoints("LeftEyebrowTop"),
            ...getContourPoints("LeftEyebrowBottom").reverse(),
          ],
          rightEyebrow: [
            ...getContourPoints("RightEyebrowTop"),
            ...getContourPoints("RightEyebrowBottom").reverse(),
          ],
          leftEye: getContourPoints("LeftEye"),
          rightEye: getContourPoints("RightEye"),
          lips: [
            ...getContourPoints("UpperLipTop"),
            ...getContourPoints("UpperLipBottom"),
            ...getContourPoints("LowerLipTop"),
            ...getContourPoints("LowerLipBottom"),
          ],
          upperLips: [
            ...getContourPoints("UpperLipTop"),
            ...getContourPoints("UpperLipBottom").reverse(),
          ],
          lowerLips: [
            ...getContourPoints("LowerLipTop"),
            ...getContourPoints("LowerLipBottom").reverse(),
          ],
        };

        setLandmarks(landmarks);

        // Clean up downloaded file
        await FileSystem.deleteAsync(localUri);
      } catch (error) {
        console.error("Error detecting face landmarks:", error);
        setLandmarks(null);
      }
    };

    downloadAndDetectFace();
  }, [imageUrl, detectFace]);

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

  const canvasOpacity = useSharedValue(0);
  const loadingOpacity = useSharedValue(1);

  useEffect(() => {
    canvasOpacity.value = withSpring(loading || debug ? 1 : 0);

    if (loading) {
      loadingOpacity.value = withRepeat(
        withTiming(0.9, { duration: 1000 }),
        -1,
        true
      );
    } else {
      loadingOpacity.value = withTiming(1);
    }
  }, [loading, debug]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    opacity: canvasOpacity.value,
  }));

  return (
    <View style={[styles.fullSize]}>
      <Animated.View style={[styles.fullSize, imageAnimatedStyle]}>
        <Image
          source={{ uri: imageUrl }}
          cachePolicy={"memory-disk"}
          placeholder={{ uri: lastLoadedImage || originalImageUrl }}
          placeholderContentFit="cover"
          blurRadius={loading ? loadingOpacity.value : 0}
          allowDownscaling={false}
          priority={"high"}
          style={styles.fullSize}
          transition={{
            duration: 150,
            effect: "cross-dissolve",
          }}
          contentFit="cover"
          onLoadStart={() => {}}
          onLoadEnd={() => {
            setLastLoadedImage(imageUrl);
          }}
          onLayout={handleImageLayout}
        />
      </Animated.View>
      {detectFace && landmarks && imageLayout && imageDimensions && (
        <Animated.View style={[styles.canvasContainer, canvasAnimatedStyle]}>
          <FaceLandmarksCanvas
            debug={debug}
            landmarks={landmarks}
            imageDimensions={imageDimensions}
            originalImageSize={originalImageSize}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullSize: {
    width: "100%",
    height: "100%",
    backgroundColor: "white",
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
