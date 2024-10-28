import { useCallback, useEffect, useState } from "react";
import { Segments, SelfieSegmentationDetector } from "../api/segmentation";

const CACHE_SIZE = 999;
const segmentCache = new Map<string, Segments>();

function addToCache(key: string, value: Segments) {
  if (segmentCache.size >= CACHE_SIZE) {
    const firstKey = segmentCache.keys().next().value;
    if (firstKey) {
      segmentCache.delete(firstKey);
    }
  }
  segmentCache.set(key, value);
}

type DetectorState = {
  initialized: boolean;
  loading: boolean;
  error: Error | null;
};

export const useDetectorInitialization = (detectFace: boolean) => {
  const [detectorState, setDetectorState] = useState<DetectorState>({
    initialized: false,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const initializeDetectors = async () => {
      if (detectFace && !detectorState.initialized) {
        setDetectorState((prev) => ({ ...prev, loading: true }));

        try {
          const segmenter = SelfieSegmentationDetector.getInstance();
          await segmenter.initialize();

          setDetectorState({
            initialized: true,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error("Error initializing detectors:", error);
          setDetectorState({
            initialized: false,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    };

    initializeDetectors();
  }, [detectFace, detectorState.initialized]);

  return detectorState;
};

const segmenter = SelfieSegmentationDetector.getInstance();

export const detectSegments = async (
  imageUrl: string
): Promise<Segments | null> => {
  if (!imageUrl) return null;

  const cachedSegments = segmentCache.get(imageUrl);
  if (cachedSegments) {
    return cachedSegments;
  }

  const startTime = performance.now();

  try {
    await segmenter.initialize();
    const segmentationPath = await segmenter.segmentImage(imageUrl);
    addToCache(imageUrl, segmentationPath);
    return segmentationPath;
  } catch (error) {
    console.error("Error detecting background:", error);
    return null;
  } finally {
    const endTime = performance.now();
    console.log(`Background segmentation took ${endTime - startTime} ms`);
  }
};

export const useSelfieSegments = (imageUrl: string | undefined) => {
  const [segments, setSegments] = useState<Segments | null>(null);

  const detectSegmentsInHook = useCallback(async () => {
    if (!imageUrl) return;

    const result = await detectSegments(imageUrl);
    setSegments(result);
  }, [imageUrl]);

  return { segments, detectSegments: detectSegmentsInHook };
};
