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
    x: number;
    y: number;
  };
  originalImageSize: { width: number; height: number };
  debug?: boolean;
  featureFilter?: FeatureKey[];
}

const featureToGroupMap = {
  faceOval: "face",
  leftEye: "eyes",
  rightEye: "eyes",
  leftEyebrow: "eyebrows",
  rightEyebrow: "eyebrows",
  upperLips: "mouth",
  lowerLips: "mouth",
} as const;

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
        duration: 5000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const createPath = useCallback(
    (points: LandmarkLocation[] | undefined, shouldClose = true) => {
      if (!points?.length) return Skia.Path.Make();

      const path = Skia.Path.Make();
      const [firstX, firstY] = points[0];
      const scaleX = imageDimensions.width / originalImageSize.width;
      const scaleY = imageDimensions.height / originalImageSize.height;

      path.moveTo(firstX * scaleX, firstY * scaleY);

      points.slice(1).forEach(([x, y]) => {
        path.lineTo(x * scaleX, y * scaleY);
      });

      if (shouldClose) path.close();
      return path;
    },
    [
      imageDimensions.width,
      imageDimensions.height,
      originalImageSize.width,
      originalImageSize.height,
    ]
  );

  const featureOpacity = useCallback(
    (featureKey: string): number => {
      // if (!featureFilter) return 1;

      // const groupName =
      //   featureToGroupMap[featureKey as keyof typeof featureToGroupMap];
      // const isFeatureEnabled = featureFilter.includes(groupName);

      // // Nearly transparent for disabled features
      // if (!isFeatureEnabled) {
      //   return 0.01;
      // }

      return featureKey === "faceOval" ? 0.2 : 0.5;
    },
    [featureFilter]
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
          <Path
            path={createPath(points, shouldClose)}
            style="fill"
            opacity={featureOpacity(featureKey)}
          >
            <Shader source={waveShader} uniforms={shaderUniforms} />
            <BlurMask blur={10} style="normal" />
          </Path>

          {/* <Path
            path={createPath(points, shouldClose)}
            style="stroke"
            strokeWidth={0.5}
            opacity={featureOpacity(featureKey)}
            color="white"
          /> */}
        </Group>
      );
    },
    [createPath, shaderUniforms, featureOpacity]
  );

  const renderDebugPoints = useCallback(
    (points: LandmarkLocation[] | undefined, color = "#00FF00") => {
      if (!points?.length || !debug) return null;

      const scaleX = imageDimensions.width / originalImageSize.width;
      const scaleY = imageDimensions.height / originalImageSize.height;

      return points.map((point, index) => {
        if (!Array.isArray(point) || point.length !== 2) return null;
        const [x, y] = point;
        if (typeof x !== "number" || typeof y !== "number") return null;

        return (
          <Circle
            key={`debug-${index}`}
            cx={x * scaleX}
            cy={y * scaleY}
            r={1}
            color={color}
            opacity={1}
          />
        );
      });
    },
    [
      debug,
      imageDimensions.width,
      imageDimensions.height,
      originalImageSize.width,
      originalImageSize.height,
    ]
  );

  const canvasStyle = useMemo(
    () => [
      styles.canvas,
      {
        width: imageDimensions.width,
        height: imageDimensions.height,
        left: imageDimensions.x,
        top: imageDimensions.y,
      },
    ],
    [imageDimensions]
  );

  return (
    <Canvas style={canvasStyle}>
      {featureConfig.map(
        ({ key }) =>
          featureOpacity(key) && (
            <Group key={key}>
              {renderFeature(landmarks[key], true, key)}
              {debug &&
                renderDebugPoints(
                  landmarks[key],
                  featureConfig.find((f) => f.key === key)?.debugColor
                )}
            </Group>
          )
      )}
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
  },
});
