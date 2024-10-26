import {
  Canvas,
  Path,
  Skia,
  Group,
  BlurMask,
  SkPath,
  Shader,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { memo, useEffect, useMemo, useCallback } from "react";
import { Segments } from "../api/segmentation";
import waveShader from "./WaveShader";
import Animated, {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  useAnimatedReaction,
} from "react-native-reanimated";

const SEGMENT_STYLES = {
  face: { opacity: 0, strokeWidth: 2 },
  hair: { opacity: 0, strokeWidth: 2 },
  body: { opacity: 1, strokeWidth: 2 },
  clothes: { opacity: 0.3, strokeWidth: 2 },
  others: { opacity: 0.4, strokeWidth: 1 },
  background: { opacity: 0.6, strokeWidth: 3 },
};

interface SegmentationCanvasProps {
  visible: boolean;
  segments: Segments | null;
  imageDimensions: {
    width: number;
    height: number;
  };
  originalImageSize: { width: number; height: number };
  debug?: boolean;
}

export const SegmentsCanvas = ({
  visible,
  segments,
  imageDimensions,
  originalImageSize,
  debug = false,
}: SegmentationCanvasProps) => {
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

  const segmentPaths = useMemo(() => {
    const paths: Record<string, SkPath> = {};

    if (!segments) return paths;

    Object.entries(segments).forEach(([segmentName, path]) => {
      if (!path?.length) return;

      const segPath = Skia.Path.Make();
      segPath.moveTo(path[0][0], path[0][1]);

      for (let i = 1; i < path.length; i++) {
        segPath.lineTo(path[i][0], path[i][1]);
      }

      paths[segmentName] = segPath;
    });

    return paths;
  }, [segments]);

  const debugPoints = useMemo(() => {
    if (!debug) return null;

    return Object.values(segmentPaths).map((path, index) => (
      <Path
        path={path}
        key={index}
        color="red"
        style="stroke"
        strokeWidth={1.5}
      />
    ));
  }, [debug, segmentPaths]);

  const canvasStyle = useMemo(
    () => [
      styles.canvas,
      imageDimensions && {
        width: Math.round(imageDimensions.width),
        height: Math.round(imageDimensions.height),
      },
    ],
    [imageDimensions]
  );

  const shaderTime = useSharedValue(0);
  const shaderUniforms = useDerivedValue(
    () => ({
      time: shaderTime.value,
      resolution: [imageDimensions.width, imageDimensions.height],
    }),
    [shaderTime, imageDimensions]
  );

  const backgroundOpacity = useSharedValue(0);

  useEffect(() => {
    backgroundOpacity.value = withRepeat(
      withTiming(0.9, {
        duration: 1000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    shaderTime.value = withRepeat(
      withTiming(-10, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      true
    );

    return () => {
      shaderTime.value = 0;
      backgroundOpacity.value = 0;
    };
  }, []);

  const transformGroup = [
    { scale },
    {
      translateX:
        (imageDimensions.width - originalImageSize.width * scale) / 2 + 7,
    },
    {
      translateY:
        (imageDimensions.height - originalImageSize.height * scale) / 2,
    },
  ];

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const renderBackgroundPath = () => {
    const backgroundPath = segmentPaths["background"];

    if (!backgroundPath) return null;

    return (
      <Group>
        <Path
          path={backgroundPath}
          style="fill"
          color="black"
          opacity={SEGMENT_STYLES["background"].opacity}
        >
          <BlurMask blur={5} style="normal" />
        </Path>
      </Group>
    );
  };

  const renderSegmentPaths = () => {
    return Object.entries(segmentPaths)
      .map(([segmentName, path]) => {
        if (!path) return null;

        // Type guard to ensure segmentName is a valid key
        if (!(segmentName in SEGMENT_STYLES)) return null;

        const segmentStyle =
          SEGMENT_STYLES[segmentName as keyof typeof SEGMENT_STYLES];
        const strokeWidth = segmentStyle?.strokeWidth ?? 1;
        const opacity = segmentStyle?.opacity ?? 0;

        if (opacity === 0) return null;

        return (
          <Path
            key={segmentName}
            path={path}
            strokeWidth={strokeWidth}
            style="stroke"
            opacity={opacity}
          >
            <Shader source={waveShader} uniforms={shaderUniforms} />
            <BlurMask blur={strokeWidth} style="normal" />
          </Path>
        );
      })
      .filter(Boolean);
  };

  return (
    <>
      <Animated.View style={[backgroundStyle]}>
        <Canvas style={canvasStyle}>
          <Group transform={transformGroup}>{renderBackgroundPath()}</Group>
        </Canvas>
      </Animated.View>
      <Canvas style={canvasStyle}>
        <Group transform={transformGroup}>
          {renderSegmentPaths()}
          {debugPoints}
        </Group>
      </Canvas>
    </>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
  },
});
