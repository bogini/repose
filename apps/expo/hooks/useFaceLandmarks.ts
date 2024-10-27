import { useCallback, useState } from "react";
import * as FileSystem from "expo-file-system";

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
