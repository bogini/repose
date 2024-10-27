import {
  Canvas,
  Path,
  Skia,
  Group,
  BlurMask,
  SkPath,
  Shader,
} from "@shopify/react-native-skia";
import { StyleSheet, View } from "react-native";
import { memo, useEffect, useMemo, useCallback } from "react";
import { Segments } from "../api/segmentation";
import waveShader from "./WaveShader";
import rippleShader from "./RippleShader";
import Animated, {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";

const SEGMENT_STYLES = {
  face: { opacity: 0, strokeWidth: 2 },
  hair: { opacity: 0, strokeWidth: 2 },
  body: { opacity: 0.1, strokeWidth: 1 },
  clothes: { opacity: 0.2, strokeWidth: 1 },
  others: { opacity: 0.5, strokeWidth: 1 },
  background: { opacity: 0.8, strokeWidth: 2 },
};

interface SegmentationCanvasProps {
  segments: Segments | null;
  layoutDimensions: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  imageSize: { width: number; height: number };
  debug?: boolean;
}

export const SegmentsCanvas = ({
  segments,
  layoutDimensions,
  imageSize,
  debug = false,
}: SegmentationCanvasProps) => {
  const transform = useMemo(() => {
    const scaleX = layoutDimensions.width / imageSize.width;
    const scaleY = layoutDimensions.height / imageSize.height;

    // Use cover (max scale) if image aspect ratio is different from layout
    const scale = Math.max(scaleX, scaleY);

    // Calculate scaled dimensions
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;

    // Center horizontally and vertically
    const translateX = (layoutDimensions.width - scaledWidth) / 2;
    const translateY = (layoutDimensions.height - scaledHeight) / 2;

    return [{ translateX }, { translateY }, { scale }];
  }, [
    layoutDimensions.width,
    layoutDimensions.height,
    imageSize.width,
    imageSize.height,
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

    const colors = ["red", "green", "blue", "yellow", "purple", "orange"];

    return Object.values(segmentPaths).map((path, index) => {
      const color = colors[index % colors.length];
      return (
        <>
          <Path
            path={path}
            key={`stroke-${index}`}
            color={color}
            style="stroke"
            strokeWidth={1.5}
            opacity={0.7}
          />
          <Path
            path={path}
            key={`fill-${index}`}
            color={color}
            style="fill"
            opacity={0.2}
          />
        </>
      );
    });
  }, [debug, segmentPaths]);

  const canvasStyle = useMemo(
    () => [
      styles.canvas,
      layoutDimensions && {
        width: Math.round(layoutDimensions.width),
        height: Math.round(layoutDimensions.height),
      },
    ],
    [layoutDimensions]
  );

  const waveShaderTime = useSharedValue(0);
  const waveShaderUniforms = useDerivedValue(
    () => ({
      time: waveShaderTime.value,
      resolution: [layoutDimensions.width, layoutDimensions.height],
    }),
    [waveShaderTime, layoutDimensions]
  );

  const rippleShaderTime = useSharedValue(0);
  const rippleShaderUniforms = useDerivedValue(() => {
    return {
      time: rippleShaderTime.value,
      position: [imageSize.width / 2, imageSize.height * 1.2],
      resolution: [layoutDimensions.width, layoutDimensions.height],
    };
  }, [rippleShaderTime, layoutDimensions]);

  const backfgrounddRippleShaderUniforms = useDerivedValue(() => {
    return {
      time: rippleShaderTime.value + 5,
      position: [imageSize.width / 2, imageSize.height * 0.9],
      resolution: [layoutDimensions.width, layoutDimensions.height],
    };
  }, [rippleShaderTime, layoutDimensions]);

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

    waveShaderTime.value = withRepeat(
      withTiming(-10, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      true
    );

    rippleShaderTime.value = withTiming(10, {
      duration: 1000,
      easing: Easing.linear,
    });

    return () => {
      waveShaderTime.value = 0;
      backgroundOpacity.value = 0;
      rippleShaderTime.value = 0;
    };
  }, []);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const renderBackgroundPath = () => {
    const backgroundPath = segmentPaths["background"];

    if (!backgroundPath) return null;

    const pathLength = backgroundPath?.countPoints();

    return (
      <Group key={`background-group-${pathLength}`}>
        <Path
          key={`background-path-${pathLength}`}
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
          <Group key={segmentName}>
            <Path
              path={path}
              strokeWidth={strokeWidth}
              style="stroke"
              opacity={opacity}
            >
              <Shader source={waveShader} uniforms={waveShaderUniforms} />
              <BlurMask blur={strokeWidth} style="normal" />
            </Path>
            {/* <Path
              path={path}
              strokeWidth={strokeWidth}
              style="fill"
              opacity={opacity}
            >
              <Shader
                source={rippleShader}
                uniforms={
                  segmentName === "background"
                    ? backfgrounddRippleShaderUniforms
                    : rippleShaderUniforms
                }
              />
              <BlurMask blur={strokeWidth} style="normal" />
            </Path> */}
          </Group>
        );
      })
      .filter(Boolean);
  };

  return (
    <View>
      <Animated.View style={[backgroundStyle]}>
        <Canvas style={canvasStyle}>
          <Group transform={transform}>{renderBackgroundPath()}</Group>
        </Canvas>
      </Animated.View>
      <Canvas style={canvasStyle}>
        <Group transform={transform}>
          {debugPoints}
          {renderSegmentPaths()}
        </Group>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    opacity: 0.5,
    position: "absolute",
  },
});
