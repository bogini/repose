import {
  Canvas,
  Path,
  Skia,
  Group,
  vec,
  LinearGradient,
  Circle,
  BlurMask,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import {
  type FaceLandmarkResult,
  type LandmarkLocation,
} from "../api/faceLandmarks";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  Easing,
} from "react-native-reanimated";
import { useEffect, useRef } from "react";

interface FaceLandmarksCanvasProps {
  landmarks: FaceLandmarkResult | null;
  imageDimensions: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  originalImageSize: { width: number; height: number };
  debug?: boolean;
}

interface StrokeStyle {
  color: string;
  width: number;
  pulseRange: number;
  speed: number;
}

const STROKE_STYLES = {
  faceOval: {
    color: "rgba(255, 255, 255, 0.7)",
    width: 3,
    pulseRange: 0.8,
    speed: 1.5, // Base speed multiplier
  },
  feature: {
    color: "rgba(255, 255, 255, 0.6)",
    width: 2,
    pulseRange: 0.5,
    speed: 0.8, // Slightly faster
  },
  iris: {
    color: "rgba(255, 255, 255, 0.8)",
    width: 2,
    pulseRange: 0.4,
    speed: 1.5, // Fastest animation
  },
} as const;

const GRADIENT_WIDTH = 0.4;
const BASE_SPEED = 0.03; // Slower base speed

// Enhanced gradient for better visual effect
const GRADIENT_COLORS = [
  "#FFFFFF00",
  "#FFFFFF40",
  "#FFFFFFCC",
  "#FFFFFF",
  "#FFFFFFCC",
  "#FFFFFF40",
  "#FFFFFF00",
];

const GRADIENT_STOPS = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1];

export const FaceLandmarksCanvas = ({
  landmarks,
  imageDimensions,
  originalImageSize,
  debug = false,
}: FaceLandmarksCanvasProps) => {
  if (!landmarks || !Array.isArray(landmarks.faceOval)) return null;

  const createPath = (
    points: LandmarkLocation[] | undefined,
    shouldClose = true
  ) => {
    const path = Skia.Path.Make();
    if (!points?.length || !Array.isArray(points[0])) {
      return path;
    }

    const firstPoint = points[0];
    path.moveTo(
      (firstPoint[0] / originalImageSize.width) * imageDimensions.width,
      (firstPoint[1] / originalImageSize.height) * imageDimensions.height
    );

    points.slice(1).forEach(([pointX, pointY]) => {
      if (typeof pointX === "number" && typeof pointY === "number") {
        path.lineTo(
          (pointX / originalImageSize.width) * imageDimensions.width,
          (pointY / originalImageSize.height) * imageDimensions.height
        );
      }
    });

    if (shouldClose) path.close();
    return path;
  };

  const renderFeature = (
    points: LandmarkLocation[] | undefined,
    style: StrokeStyle = STROKE_STYLES.feature,
    shouldClose = true,
    featureKey: string
  ) => {
    if (!points?.length) return null;

    const path = createPath(points, shouldClose);
    const bounds = path.getBounds();
    const strokeWidth = useSharedValue(style.width);
    const localGradientPosition = useSharedValue(0);

    useEffect(() => {
      // Stroke pulse annimation
      strokeWidth.value = style.width;
      strokeWidth.value = withRepeat(
        withTiming(style.width * (1 + style.pulseRange), {
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
        -1,
        true
      );

      // Gradient rotation animation with variable speed
      localGradientPosition.value = 0;
      localGradientPosition.value = withRepeat(
        withTiming(1, {
          duration: 3000 / (style.speed || 1),
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }, [points]);

    const start = useDerivedValue(() => {
      const normalizedPos = localGradientPosition.value % 1;
      const angle = normalizedPos * 2 * Math.PI;
      // Add subtle wobble effect
      const wobble = Math.sin(normalizedPos * 4 * Math.PI) * 0.1;
      return vec(
        bounds.x +
          bounds.width * 0.5 +
          Math.cos(angle + wobble) * bounds.width * 0.5,
        bounds.y +
          bounds.height * 0.5 +
          Math.sin(angle + wobble) * bounds.height * 0.5
      );
    });

    const end = useDerivedValue(() => {
      const normalizedPos = (localGradientPosition.value + GRADIENT_WIDTH) % 1;
      const angle = normalizedPos * 2 * Math.PI;
      return vec(
        bounds.x + bounds.width * 0.5 + Math.cos(angle) * bounds.width * 0.5,
        bounds.y + bounds.height * 0.5 + Math.sin(angle) * bounds.height * 0.5
      );
    });

    return (
      <Group>
        <Path
          path={path}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeJoin="round"
          strokeCap="round"
        >
          <LinearGradient
            start={start}
            end={end}
            colors={GRADIENT_COLORS}
            positions={GRADIENT_STOPS}
          />
          <BlurMask blur={4} style="solid" />
        </Path>
      </Group>
    );
  };

  const renderDebugPoints = (
    points: LandmarkLocation[] | undefined,
    color = "#00FF00"
  ) => {
    if (!points?.length || !debug) return null;

    return points.map((point, index) => {
      if (!Array.isArray(point) || point.length !== 3) return null;
      const [x, y, z] = point;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof z !== "number"
      )
        return null;

      // Scale circle size based on z coordinate for depth effect
      const depthScale = Math.max(0.5, Math.min(1.5, 1 + z / 100));
      const baseRadius = 2;

      return (
        <Circle
          key={`debug-${index}`}
          cx={(x / originalImageSize.width) * imageDimensions.width}
          cy={(y / originalImageSize.height) * imageDimensions.height}
          r={baseRadius * depthScale}
          color={color}
        />
      );
    });
  };

  return (
    <Canvas
      style={[
        styles.canvas,
        {
          width: imageDimensions.width,
          height: imageDimensions.height,
          left: imageDimensions.x,
          top: imageDimensions.y,
        },
      ]}
    >
      {renderFeature(
        landmarks.faceOval,
        STROKE_STYLES.faceOval,
        true,
        "faceOval"
      )}
      {renderFeature(landmarks.leftEye, STROKE_STYLES.feature, true, "leftEye")}
      {renderFeature(
        landmarks.rightEye,
        STROKE_STYLES.feature,
        true,
        "rightEye"
      )}
      {renderFeature(landmarks.leftIris, STROKE_STYLES.iris, true, "leftIris")}
      {renderFeature(
        landmarks.rightIris,
        STROKE_STYLES.iris,
        true,
        "rightIris"
      )}
      {renderFeature(
        landmarks.leftEyebrow,
        STROKE_STYLES.feature,
        false,
        "leftEyebrow"
      )}
      {renderFeature(
        landmarks.rightEyebrow,
        STROKE_STYLES.feature,
        false,
        "rightEyebrow"
      )}
      {renderFeature(
        landmarks.upperLips,
        STROKE_STYLES.feature,
        true,
        "upperLips"
      )}
      {renderFeature(
        landmarks.lowerLips,
        STROKE_STYLES.feature,
        true,
        "lowerLips"
      )}

      {renderDebugPoints(landmarks.faceOval, "#FF0000")}
      {renderDebugPoints(landmarks.leftEye, "#00FF00")}
      {renderDebugPoints(landmarks.rightEye, "#00FF00")}
      {renderDebugPoints(landmarks.leftIris, "#0000FF")}
      {renderDebugPoints(landmarks.rightIris, "#0000FF")}
      {renderDebugPoints(landmarks.leftEyebrow, "#FFFF00")}
      {renderDebugPoints(landmarks.rightEyebrow, "#FFFF00")}
      {renderDebugPoints(landmarks.upperLips, "#FF00FF")}
      {renderDebugPoints(landmarks.lowerLips, "#FF00FF")}
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
    backgroundColor: "transparent",
    opacity: 0.5,
  },
});
