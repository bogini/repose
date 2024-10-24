import {
  Canvas,
  Path,
  Skia,
  Group,
  vec,
  LinearGradient,
  Circle,
  BlurMask,
  Shader,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  Easing,
  useAnimatedReaction,
} from "react-native-reanimated";
import { useEffect } from "react";
import { FaceLandmarkResult, LandmarkLocation } from "./ImageContainer";
import waveShader from "./WaveShader";

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
  pulseSpeed?: number;
}

const STROKE_STYLES = {
  faceOval: {
    color: "rgba(255, 255, 255, 0.7)",
    width: 2,
    pulseRange: 0.8,
    speed: 2,
    pulseSpeed: 2000,
  },
  feature: {
    color: "rgba(255, 255, 255, 0.3)",
    width: 1,
    pulseRange: 0.6,
    speed: 1,
    pulseSpeed: 1500,
  },
} as const;

export const FaceLandmarksCanvas = ({
  landmarks,
  imageDimensions,
  originalImageSize,
  debug = false,
}: FaceLandmarksCanvasProps) => {
  if (!landmarks || !Array.isArray(landmarks.faceOval)) return null;

  const localGradientPosition = useSharedValue<number>(0);
  const shaderTime = useSharedValue(0);

  const shaderUniforms = useDerivedValue(() => {
    return {
      time: shaderTime.value,
      resolution: [imageDimensions.width, imageDimensions.height],
    };
  }, [shaderTime.value]);

  useEffect(() => {
    localGradientPosition.value = withRepeat(
      withTiming(1, {
        duration: 10000 / 3,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    shaderTime.value = withRepeat(
      withTiming(-10, {
        duration: 10000 / 2,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

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

    const start = useDerivedValue(() => {
      const normalizedPos = localGradientPosition.value;
      const angle = normalizedPos * 2 * Math.PI;
      return vec(
        bounds.x + bounds.width * 0.5 + Math.cos(angle) * bounds.width * 0.5,
        bounds.y + bounds.height * 0.5 + Math.sin(angle) * bounds.height * 0.5
      );
    });

    const end = useDerivedValue(() => {
      const normalizedPos = localGradientPosition.value - 0.5;
      const angle = normalizedPos * 2 * Math.PI;
      return vec(
        bounds.x + bounds.width * 0.5 + Math.cos(angle) * bounds.width * 0.5,
        bounds.y + bounds.height * 0.5 + Math.sin(angle) * bounds.height * 0.5
      );
    });

    return (
      <Group key={featureKey}>
        {featureKey === "faceOval" && (
          <Path path={path} style="fill" opacity={0.8}>
            <Shader source={waveShader} uniforms={shaderUniforms} />
            <BlurMask blur={10} style="normal" />
          </Path>
        )}

        {/* <Path
          path={path}
          style="stroke"
          strokeWidth={featureKey === "faceOval" ? 10 : 3}
          strokeJoin="round"
          color="white"
          strokeCap="round"
          opacity={featureKey === "faceOval" ? 1 : 0.1}
        >
          <BlurMask blur={10} style="normal" />
        </Path> */}
      </Group>
    );
  };

  const renderDebugPoints = (
    points: LandmarkLocation[] | undefined,
    color = "#00FF00"
  ) => {
    if (!points?.length || !debug) return null;

    return points.map((point, index) => {
      if (!Array.isArray(point) || point.length !== 2) return null;
      const [x, y] = point;
      if (typeof x !== "number" || typeof y !== "number") return null;

      return (
        <Circle
          key={`debug-${index}`}
          cx={(x / originalImageSize.width) * imageDimensions.width}
          cy={(y / originalImageSize.height) * imageDimensions.height}
          r={1}
          color={color}
          opacity={1}
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
      {renderFeature(
        landmarks.leftEyebrow,
        STROKE_STYLES.feature,
        true,
        "leftEyebrow"
      )}
      {renderFeature(
        landmarks.rightEyebrow,
        STROKE_STYLES.feature,
        true,
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
    opacity: 1,
  },
});
