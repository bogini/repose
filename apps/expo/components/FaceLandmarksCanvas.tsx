import {
  Canvas,
  Path,
  Skia,
  Group,
  Shader,
  Circle,
  BlurMask,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  Easing,
} from "react-native-reanimated";
import { useEffect, useCallback, useMemo } from "react";
import { FaceLandmarkResult, LandmarkLocation } from "./ImageContainer";
import waveShader from "./WaveShader";
import { FeatureKey } from "../lib/faceControl";

interface FaceLandmarksCanvasProps {
  landmarks: FaceLandmarkResult | null;
  imageDimensions: {
    width: number;
    height: number;
  };
  originalImageSize: { width: number; height: number };
  debug?: boolean;
  featureFilter?: FeatureKey[];
}

const featureConfig = [
  { key: "faceOval", debugColor: "#FF0000" },
  { key: "leftEye", debugColor: "#00FF00" },
  { key: "rightEye", debugColor: "#00FF00" },
  { key: "leftEyebrow", debugColor: "#FFFF00" },
  { key: "rightEyebrow", debugColor: "#FFFF00" },
  { key: "upperLips", debugColor: "#FF00FF" },
  { key: "lowerLips", debugColor: "#FF00FF" },
] as const;

export const FaceLandmarksCanvas = ({
  landmarks,
  imageDimensions,
  originalImageSize,
  debug = false,
  featureFilter,
}: FaceLandmarksCanvasProps) => {
  if (!landmarks?.faceOval) return null;

  const shaderTime = useSharedValue(0);

  const shaderUniforms = useDerivedValue(
    () => ({
      time: shaderTime.value,
      resolution: [imageDimensions.width, imageDimensions.height],
    }),
    [shaderTime.value, imageDimensions.width, imageDimensions.height]
  );

  useEffect(() => {
    shaderTime.value = withRepeat(
      withTiming(-10, {
        duration: 15000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const scale = useMemo(() => {
    return Math.max(
      imageDimensions.width / originalImageSize.width,
      imageDimensions.height / originalImageSize.height
    );
  }, [
    imageDimensions.width,
    imageDimensions.height,
    originalImageSize.width,
    originalImageSize.height,
  ]);

  const createPath = useCallback(
    (points: LandmarkLocation[] | undefined, shouldClose = true) => {
      if (!points?.length) return Skia.Path.Make();

      const path = Skia.Path.Make();
      const [firstX, firstY] = points[0];

      path.moveTo(firstX * scale, firstY * scale);

      points.slice(1).forEach(([x, y]) => {
        path.lineTo(x * scale, y * scale);
      });

      if (shouldClose) path.close();
      return path;
    },
    [scale]
  );

  const renderFeature = useCallback(
    (
      points: LandmarkLocation[] | undefined,
      shouldClose = true,
      featureKey: string
    ) => {
      if (!points?.length) return null;

      return (
        <Group key={featureKey}>
          {featureKey === "faceOval" && (
            <Path
              path={createPath(points, shouldClose)}
              style="fill"
              opacity={0.1}
            >
              <Shader source={waveShader} uniforms={shaderUniforms} />
              <BlurMask blur={5} style="normal" />
            </Path>
          )}
        </Group>
      );
    },
    [createPath, shaderUniforms]
  );

  const renderDebugPoints = useCallback(
    (points: LandmarkLocation[] | undefined, color = "#00FF00") => {
      if (!points?.length || !debug) return null;

      return points.map((point, index) => {
        if (!Array.isArray(point) || point.length !== 2) return null;
        const [x, y] = point;
        if (typeof x !== "number" || typeof y !== "number") return null;

        return (
          <Circle
            key={`debug-${index}`}
            cx={x * scale}
            cy={y * scale}
            r={1}
            color={color}
            opacity={1}
          />
        );
      });
    },
    [debug, scale]
  );

  const canvasStyle = useMemo(
    () => [
      styles.canvas,
      {
        width: imageDimensions.width,
        height: imageDimensions.height,
      },
    ],
    [imageDimensions]
  );

  return (
    <Canvas style={canvasStyle}>
      <Group
        transform={[
          {
            translateX:
              (imageDimensions.width - originalImageSize.width * scale) / 2,
          },
          {
            translateY:
              (imageDimensions.height - originalImageSize.height * scale) / 2,
          },
        ]}
      >
        {featureConfig.map(({ key }) => (
          <Group key={key}>
            {renderFeature(landmarks[key], true, key)}
            {debug &&
              renderDebugPoints(
                landmarks[key],
                featureConfig.find((f) => f.key === key)?.debugColor
              )}
          </Group>
        ))}
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
  },
});
