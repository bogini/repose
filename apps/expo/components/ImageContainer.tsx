import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaceLandmarksCanvas } from "./FaceLandmarksCanvas";
import PhotosService from "../api/photos";
import { useFaceDetector } from "@infinitered/react-native-mlkit-face-detection";
import * as FileSystem from "expo-file-system";
import { debounce } from "lodash";
import { FeatureKey } from "../lib/faceControl";
import { Segments, SelfieSegmentationDetector } from "../api/segmentation";
import { SegmentsCanvas } from "./SegmentsCanvas";
import { memo } from "react";

// Animation constants
const LOADING_ANIMATION = {
  IMAGE_OPACITY_DURATION_MS: 200,
  CANVAS_OPACITY_DURATION_MS: 1000,
  PULSE_DURATION_MS: 1000,
  PULSE_OPACITY_TO: 1,
  PULSE_OPACITY_FROM: 1,
  IMAGE_BLUR: 0,
};

const IMAGE_TRANSITION = {
  duration: 150,
  effect: "cross-dissolve",
} as const;

const DEFAULT_IMAGE_SIZE = {
  width: 512,
  height: 512,
};

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
  selectedControl?: FeatureKey;
}

const useFaceLandmarks = (
  imageUrl: string | undefined,
  detectFace: boolean,
  detectorsInitialized: boolean,
  faceDetector: any
) => {
  const [landmarks, setLandmarks] = useState<FaceLandmarkResult | null>(null);

  const detectFaceLandmarks = useCallback(async () => {
    if (!detectFace || !imageUrl || !detectorsInitialized) return;

    const startTime = performance.now();

    try {
      const localUri = `${FileSystem.cacheDirectory}${imageUrl.split("/").pop()}`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);

      if (!fileInfo.exists) {
        await FileSystem.downloadAsync(imageUrl, localUri);
      }

      const result = await faceDetector.detectFaces(localUri);

      if (!result || result.error || !result.faces.length) {
        return;
      }

      const face = result.faces[0];
      const getContourPoints = (type: string): LandmarkLocation[] => {
        const contour = face.contours?.find((c: any) => c.type === type);
        return contour?.points?.map((p: any) => [p.x, p.y]) ?? [];
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
      FileSystem.deleteAsync(localUri).catch(console.error);
    } catch (error) {
      console.error("Error detecting face landmarks:", error);
      setLandmarks(null);
    } finally {
      const endTime = performance.now();
      console.log(`Face landmark detection took ${endTime - startTime} ms`);
    }
  }, [imageUrl, detectFace, faceDetector, detectorsInitialized]);

  return { landmarks, detectFaceLandmarks };
};

const useBackgroundSegmentation = (
  imageUrl: string | undefined,
  detectFace: boolean,
  detectorsInitialized: boolean
) => {
  const [segments, setSegments] = useState<Segments | null>(null);

  const detectBackground = useCallback(async () => {
    if (!detectFace || !imageUrl || !detectorsInitialized) return;

    const startTime = performance.now();

    try {
      const segmenter = SelfieSegmentationDetector.getInstance();
      const segmentationPath = await segmenter.segmentImage(imageUrl);
      setSegments(segmentationPath);
    } catch (error) {
      console.error("Error detecting background:", error);
      setSegments(null);
    } finally {
      const endTime = performance.now();
      console.log(`Background segmentation took ${endTime - startTime} ms`);
    }
  }, [imageUrl, detectFace, detectorsInitialized]);

  return { segments, detectBackground };
};

const ImageContainerComponent = ({
  loading = false,
  imageUrl,
  originalImageUrl,
  detectFace = false,
  debug = false,
  selectedControl,
}: ImageContainerProps) => {
  loading = true;
  const [lastLoadedImage, setLastLoadedImage] = useState<string | undefined>(
    undefined
  );

  const faceDetector = useFaceDetector();
  const [detectorsInitialized, setDetectorsInitialized] = useState(false);
  const [layoutDimensions, setLayoutDimensions] = useState(DEFAULT_IMAGE_SIZE);

  const debouncedSetLayout = useMemo(
    () =>
      debounce(
        (width: number, height: number) => {
          setLayoutDimensions({ width, height });
        },
        20,
        { trailing: true }
      ),
    []
  );

  useEffect(() => {
    const initializeDetectors = async () => {
      if (detectFace && !detectorsInitialized) {
        const startTime = performance.now();
        try {
          const faceDetectorPromise = faceDetector.initialize({
            performanceMode: "fast",
            landmarkMode: false,
            contourMode: true,
          });
          const segmenter = SelfieSegmentationDetector.getInstance();
          const segmenterPromise = segmenter.initialize();
          await Promise.all([faceDetectorPromise, segmenterPromise]);
          setDetectorsInitialized(true);
        } catch (error) {
          console.error("Error initializing detectors:", error);
        } finally {
          const endTime = performance.now();
          console.log(
            `Detectors initialization took ${endTime - startTime} ms`
          );
        }
      }
    };

    initializeDetectors();
  }, [detectFace, detectorsInitialized, faceDetector]);

  const { landmarks, detectFaceLandmarks } = useFaceLandmarks(
    imageUrl,
    detectFace,
    detectorsInitialized,
    faceDetector
  );
  const { segments, detectBackground } = useBackgroundSegmentation(
    imageUrl,
    detectFace,
    detectorsInitialized
  );

  const debounced = useMemo(
    () =>
      debounce(
        async () => {
          console.log("debounced");
          await Promise.all([detectFaceLandmarks(), detectBackground()]);
        },
        200,
        {
          leading: false,
          trailing: true,
        }
      ),
    [detectFaceLandmarks, detectBackground]
  );

  useEffect(() => {
    if (imageUrl && detectFace) {
      debounced();

      return () => {
        debounced.cancel();
      };
    }
  }, [imageUrl, debounced, detectFace]);

  const canvasOpacity = useSharedValue(0);
  const loadingOpacity = useSharedValue(1);

  useEffect(() => {
    canvasOpacity.value = withSpring(loading || debug ? 1 : 0, {
      duration: LOADING_ANIMATION.CANVAS_OPACITY_DURATION_MS,
    });

    if (loading) {
      loadingOpacity.value = LOADING_ANIMATION.PULSE_OPACITY_FROM;
      loadingOpacity.value = withRepeat(
        withTiming(LOADING_ANIMATION.PULSE_OPACITY_TO, {
          duration: LOADING_ANIMATION.PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      );
    } else {
      loadingOpacity.value = withTiming(1, {
        duration: LOADING_ANIMATION.IMAGE_OPACITY_DURATION_MS,
      });
    }
  }, [loading, debug, canvasOpacity, loadingOpacity]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    opacity: canvasOpacity.value,
  }));

  return (
    <View style={[styles.fullSize]}>
      <Animated.View style={[imageAnimatedStyle]}>
        <Image
          source={{ uri: imageUrl }}
          cachePolicy={"memory-disk"}
          placeholder={{ uri: lastLoadedImage || originalImageUrl }}
          placeholderContentFit="cover"
          blurRadius={loading ? LOADING_ANIMATION.IMAGE_BLUR : 0}
          allowDownscaling={false}
          priority={"high"}
          style={styles.fullSize}
          transition={IMAGE_TRANSITION}
          contentFit="cover"
          onLoadEnd={() => {
            setLastLoadedImage(imageUrl);
          }}
          onLayout={(event: LayoutChangeEvent) => {
            const { width, height } = event.nativeEvent.layout;
            debouncedSetLayout(width, height);
          }}
        />
      </Animated.View>
      {detectFace && (
        <Animated.View style={[styles.canvasContainer, canvasAnimatedStyle]}>
          <FaceLandmarksCanvas
            debug={debug}
            landmarks={landmarks}
            imageDimensions={layoutDimensions}
            featureFilter={selectedControl ? [selectedControl] : undefined}
            originalImageSize={DEFAULT_IMAGE_SIZE}
          />
          <SegmentsCanvas
            segments={segments}
            imageDimensions={layoutDimensions}
            originalImageSize={DEFAULT_IMAGE_SIZE}
            debug={debug}
          />
        </Animated.View>
      )}
    </View>
  );
};

export const ImageContainer = memo(
  ImageContainerComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.loading === nextProps.loading &&
      prevProps.imageUrl === nextProps.imageUrl &&
      prevProps.originalImageUrl === nextProps.originalImageUrl &&
      prevProps.detectFace === nextProps.detectFace &&
      prevProps.debug === nextProps.debug &&
      prevProps.selectedControl === nextProps.selectedControl
    );
  }
);

const styles = StyleSheet.create({
  fullSize: {
    width: "100%",
    height: "100%",
  },
  canvasContainer: {
    position: "absolute",
  },
});
