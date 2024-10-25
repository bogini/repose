import {
  Canvas,
  Path,
  Skia,
  Group,
  BlurMask,
  SkPath,
} from "@shopify/react-native-skia";
import { StyleSheet, Text } from "react-native";
import { memo, useMemo } from "react";
import { Segments } from "../api/segmentation";

// Add segment styling configuration
const SEGMENT_STYLES = {
  face: { color: "#FF69B4", opacity: 0.8 }, // Pink
  hair: { color: "#8B4513", opacity: 0.8 }, // Brown
  body: { color: "#FFB6C1", opacity: 0.8 }, // Light pink
  clothes: { color: "#4169E1", opacity: 0.8 }, // Royal blue
  others: { color: "#808080", opacity: 0.8 }, // Gray
  background: { color: "#000000", opacity: 0.8 }, // Black
};

interface SegmentationCanvasProps {
  segments: Segments | null;
  imageDimensions: {
    width: number;
    height: number;
  } | null;
  originalImageSize: { width: number; height: number };
  debug?: boolean;
}

export const SegmentsCanvas = memo(
  ({
    segments,
    imageDimensions,
    originalImageSize,
    debug = false,
  }: SegmentationCanvasProps) => {
    console.log("segments", imageDimensions, originalImageSize);
    if (!segments || !imageDimensions?.width || !imageDimensions?.height)
      return null;

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
          key={`debug-${index}`}
          path={path}
          color="red"
          style="stroke"
          strokeWidth={1}
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

    if (!imageDimensions) return null;

    return (
      <Canvas style={canvasStyle}>
        <Group
          transform={[
            { scale },
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
          {Object.entries(segmentPaths).map(([segmentName, path]) => (
            <Path
              key={segmentName}
              path={path}
              style="fill"
              color={
                SEGMENT_STYLES[segmentName as keyof typeof SEGMENT_STYLES].color
              }
              opacity={
                SEGMENT_STYLES[segmentName as keyof typeof SEGMENT_STYLES]
                  .opacity
              }
            >
              <BlurMask blur={0} style="normal" />
            </Path>
          ))}
          {debugPoints}
        </Group>
      </Canvas>
    );
  }
);

SegmentsCanvas.displayName = "SegmentationCanvas";

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
  },
});
