import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as FileSystem from "expo-file-system";
import { debounce } from "lodash";
import { FeatureKey } from "../lib/faceControl";
import { Segments, SelfieSegmentationDetector } from "../api/segmentation";
import { SegmentsCanvas } from "./SegmentsCanvas";
import PhotosService from "../api/photos";
import { GestureControlValue } from "./GestureControl";

const IMAGE_TRANSITION = {
  duration: 150,
  effect: "cross-dissolve",
} as const;

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
  gestureControlValue?: GestureControlValue;
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

    setLandmarks(null);

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

const segmenter = SelfieSegmentationDetector.getInstance();

const useSelfieSegments = (
  imageUrl: string | undefined,
  detectFace: boolean,
  detectorsInitialized: boolean
) => {
  const [segments, setSegments] = useState<Segments | null>(null);

  const detectSegments = useCallback(async () => {
    if (!detectFace || !imageUrl || !detectorsInitialized) return;

    const startTime = performance.now();

    try {
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

  return { segments, detectSegments };
};

export const ImageContainer = ({
  loading = false,
  imageUrl,
  originalImageUrl,
  detectFace = false,
  debug = false,
  selectedControl,
  gestureControlValue,
}: ImageContainerProps) => {
  const [lastLoadedImage, setLastLoadedImage] = useState<string | undefined>(
    undefined
  );

  // const faceDetector = useFaceDetector();
  const [detectorsInitialized, setDetectorsInitialized] = useState(false);
  const [layoutDimensions, setLayoutDimensions] = useState({
    width: 12,
    height: 500,
    x: 0,
    y: 0,
  });
  const [originalImageSize, setOriginalImageSize] = useState({
    width: 1024,
    height: 1024,
  });

  const debouncedSetLayout = useMemo(
    () =>
      debounce(
        (width: number, height: number, x: number, y: number) => {
          setLayoutDimensions({ width, height, x, y });
        },
        20,
        { trailing: true }
      ),
    []
  );

  const { segments, detectSegments } = useSelfieSegments(
    imageUrl || originalImageUrl,
    detectFace,
    detectorsInitialized
  );

  useEffect(() => {
    const initializeDetectors = async () => {
      if (detectFace && !detectorsInitialized) {
        const startTime = performance.now();
        try {
          // const faceDetectorPromise = faceDetector.initialize({
          //   performanceMode: "fast",
          //   landmarkMode: false,
          //   contourMode: true,
          // });
          const segmenter = SelfieSegmentationDetector.getInstance();
          const segmenterPromise = segmenter.initialize();
          await Promise.all([
            // faceDetectorPromise,
            segmenterPromise,
          ]);
          setDetectorsInitialized(true);
          detectSegments();
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
  }, [detectFace, detectorsInitialized]);

  // const { landmarks, detectFaceLandmarks } = useFaceLandmarks(
  //   imageUrl,
  //   detectFace,
  //   detectorsInitialized,
  //   faceDetector
  // );

  const debounced = useMemo(
    () =>
      debounce(
        async () => {
          await Promise.all([
            // detectFaceLandmarks(),
            detectSegments(),
          ]);
        },
        500,
        {
          leading: true,
          trailing: true,
        }
      ),
    [
      //detectFaceLandmarks,
      detectSegments,
    ]
  );

  useEffect(() => {
    if (imageUrl && detectFace) {
      debounced();

      return () => {
        debounced.cancel();
      };
    }
  }, [imageUrl, debounced, detectFace, loading]);

  useEffect(() => {
    const getImageDimensions = async () => {
      if (imageUrl) {
        try {
          const { width, height } =
            await PhotosService.getImageDimensions(imageUrl);
          setOriginalImageSize({ width, height });
        } catch (error) {
          console.error("Error getting image dimensions:", error);
        }
      }
    };

    getImageDimensions();
  }, [imageUrl]);

  return (
    <View style={[styles.fullSize]}>
      <Animated.View>
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
            debouncedSetLayout(width, height, x, y);
          }}
        />
      </Animated.View>

      {detectFace && (
        <View style={[styles.canvasContainer]}>
          {segments && loading && (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <SegmentsCanvas
                segments={segments}
                layoutDimensions={layoutDimensions}
                imageSize={originalImageSize}
                debug={debug}
                gestureControlValue={gestureControlValue}
              />
            </Animated.View>
          )}
          {/* <FaceLandmarksCanvas
            debug={debug}
            landmarks={landmarks}
            imageDimensions={layoutDimensions}
            featureFilter={selectedControl ? [selectedControl] : undefined}
            originalImageSize={DEFAULT_IMAGE_SIZE}
          /> */}
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
  },
});
