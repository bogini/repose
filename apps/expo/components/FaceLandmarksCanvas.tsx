import { Canvas, Path, Skia, Group } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { type FaceLandmarkResult } from "../api/faceLandmarks";

interface FaceLandmarksCanvasProps {
  landmarks: FaceLandmarkResult | null;
  imageDimensions: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  originalImageSize: { width: number; height: number };
}

const STROKE_STYLES = {
  faceOval: {
    color: "rgba(255, 255, 255, 0.7)" as const,
    width: 3,
  },
  feature: {
    color: "rgba(255, 255, 255, 0.6)" as const,
    width: 2.5,
  },
  iris: {
    color: "rgba(255, 255, 255, 0.8)" as const,
    width: 2,
  },
} as const;

export const FaceLandmarksCanvas = ({
  landmarks,
  imageDimensions,
  originalImageSize,
}: FaceLandmarksCanvasProps) => {
  if (!landmarks || !Array.isArray(landmarks.faceOval)) return null;

  const createPath = (
    points: [number, number][] | undefined,
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
    points: [number, number][] | undefined,
    style:
      | typeof STROKE_STYLES.feature
      | typeof STROKE_STYLES.faceOval
      | typeof STROKE_STYLES.iris = STROKE_STYLES.feature,
    shouldClose = true
  ) => {
    if (!points?.length) return null;

    return (
      <Path
        path={createPath(points, shouldClose)}
        color={style.color}
        style="stroke"
        strokeWidth={style.width}
        strokeJoin="round"
        strokeCap="round"
      />
    );
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
      {renderFeature(landmarks.faceOval, STROKE_STYLES.faceOval)}
      {renderFeature(landmarks.leftEye)}
      {renderFeature(landmarks.rightEye)}
      {renderFeature(landmarks.leftIris, STROKE_STYLES.iris)}
      {renderFeature(landmarks.rightIris, STROKE_STYLES.iris)}
      {renderFeature(landmarks.leftEyebrow, STROKE_STYLES.feature, false)}
      {renderFeature(landmarks.rightEyebrow, STROKE_STYLES.feature, false)}
      {renderFeature(landmarks.upperLips)}
      {renderFeature(landmarks.lowerLips)}
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: "absolute",
    backgroundColor: "transparent",
  },
});
