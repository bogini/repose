import {
  Canvas,
  Path,
  Skia,
  Group,
  BlurMask,
  Circle as SkiaCircle,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { memo, useCallback, useMemo } from "react";

interface SegmentationCanvasProps {
  path: [number, number][];
  imageDimensions: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  originalImageSize: { width: number; height: number };
  debug?: boolean;
  opacity?: number;
  color?: string;
  blur?: number;
}

export const SegmentationCanvas = memo(
  ({
    path,
    imageDimensions,
    originalImageSize,
    debug = false,
    opacity = 0.4,
    color = "#000000",
    blur = 10,
  }: SegmentationCanvasProps) => {
    if (!path?.length) return null;

    // Create path only when input path changes
    const skPath = useMemo(() => {
      const path1 = Skia.Path.Make();
      const [firstX, firstY] = path[0];

      path1.moveTo(firstX, firstY);

      // Use for loop instead of slice+forEach for better performance
      for (let i = 1; i < path.length; i++) {
        path1.lineTo(path[i][0], path[i][1]);
      }

      path1.close();
      return path1;
    }, [path]);

    // Memoize debug points to avoid recreating on every render
    const debugPoints = useMemo(() => {
      if (!debug) return null;
      return path.map(([x, y], index) => (
        <SkiaCircle
          key={`debug-${index}`}
          cx={x}
          cy={y}
          r={2}
          color="#00FF00"
        />
      ));
    }, [debug, path]);

    // Memoize style object to avoid recreating on every render
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
        <Group>
          <Path path={skPath} style="fill" opacity={opacity} color={color}>
            <BlurMask blur={blur} style="normal" />
          </Path>
          {debugPoints}
        </Group>
      </Canvas>
    );
  }
);

SegmentationCanvas.displayName = "SegmentationCanvas";

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
  },
});
