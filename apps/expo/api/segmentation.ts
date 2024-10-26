import { loadTensorflowModel, TensorflowModel } from "react-native-fast-tflite";
import PhotosService from "../api/photos";
import * as jpeg from "jpeg-js";

const THRESHOLD = 0.2;

const INPUT_SIZE = {
  width: 256,
  height: 256,
  channels: 3,
};

const CLASS_TO_SEGMENT = [
  "background",
  "hair",
  "body",
  "face",
  "clothes",
  "others",
] as const;

export interface Segments {
  background: number[][];
  hair: number[][];
  body: number[][];
  face: number[][];
  clothes: number[][];
  others: number[][];
}

export class SelfieSegmentationDetector {
  private static instance: SelfieSegmentationDetector;
  private model: TensorflowModel | null;

  private constructor() {
    this.model = null;
  }

  public static getInstance(): SelfieSegmentationDetector {
    if (!SelfieSegmentationDetector.instance) {
      SelfieSegmentationDetector.instance = new SelfieSegmentationDetector();
    }
    return SelfieSegmentationDetector.instance;
  }

  async initialize() {
    if (this.model) {
      return;
    }

    try {
      this.model = await loadTensorflowModel(
        require("../assets/selfie_multiclass_256x256.tflite")
      );
      console.log("Selfie segmentation model initialized");
    } catch (error) {
      console.error("Error initializing selfie segmentation model:", error);
    }
  }

  async segmentImage(imageUri: string): Promise<Segments> {
    if (!imageUri) {
      throw new Error("Image URI is required");
    }

    if (!this.model) {
      throw new Error("Model not initialized. Call initialize() first.");
    }

    try {
      const imageData = await this.prepareImageData(imageUri);
      const masks = await this.runSegmentation(imageData);

      // Pre-calculate constants
      const maskSize = INPUT_SIZE.width * INPUT_SIZE.height;
      const numClasses = 6;

      const segments: Segments = {
        background: [],
        hair: [],
        body: [],
        face: [],
        clothes: [],
        others: [],
      };

      // Process classes in parallel
      await Promise.all(
        [0, 4, 5].map(async (classIdx) => {
          const classMask = new Float32Array(maskSize);
          const offset = classIdx;

          // Use typed arrays and optimize loop
          for (let i = 0; i < maskSize; i++) {
            classMask[i] = masks[i * numClasses + offset];
          }

          const mask = this.denormalizeMask(
            classMask,
            imageData.originalWidth,
            imageData.originalHeight
          );

          segments[CLASS_TO_SEGMENT[classIdx]] = this.maskToPath(
            mask,
            imageData.originalWidth,
            imageData.originalHeight,
            THRESHOLD
          );
        })
      );

      return segments;
    } catch (error) {
      console.error("Segmentation failed:", error);
      throw error;
    }
  }

  private async prepareImageData(imageUri: string) {
    const { width: originalWidth, height: originalHeight } =
      await PhotosService.getImageDimensions(imageUri);

    const jpegImageData = await PhotosService.convertToJpeg(
      imageUri,
      INPUT_SIZE.width,
      INPUT_SIZE.height
    );

    // Convert base64 to Uint8Array
    const binaryString = atob(
      jpegImageData.replace(/^data:image\/jpeg;base64,/, "")
    );
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode JPEG data
    const rawImageData = jpeg.decode(bytes, { useTArray: true });

    // Prepare the input data - normalize to [0, 1]
    const inputSize = INPUT_SIZE.width * INPUT_SIZE.height * 3;
    const inputData = new Float32Array(inputSize);

    for (
      let i = 0, j = 0;
      i < rawImageData.data.length && j < inputSize;
      i += 4, j += 3
    ) {
      inputData[j] = rawImageData.data[i] / 255.0; // R
      inputData[j + 1] = rawImageData.data[i + 1] / 255.0; // G
      inputData[j + 2] = rawImageData.data[i + 2] / 255.0; // B
    }

    return {
      inputData,
      originalWidth,
      originalHeight,
    };
  }

  private async runSegmentation(imageData: {
    inputData: Float32Array;
    originalWidth: number;
    originalHeight: number;
  }): Promise<Float32Array> {
    const outputData = await this.model!.run([imageData.inputData]);

    if (!outputData?.[0]?.buffer) {
      throw new Error("Invalid model output");
    }

    return new Float32Array(outputData[0].buffer);
  }

  private denormalizeMask(
    mask: Float32Array,
    targetWidth: number,
    targetHeight: number
  ): Float32Array {
    const sourceWidth = INPUT_SIZE.width;
    const sourceHeight = INPUT_SIZE.height;
    const result = new Float32Array(targetWidth * targetHeight);

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Calculate the corresponding position in the source mask
        const srcX = (x * (sourceWidth - 1)) / (targetWidth - 1);
        const srcY = (y * (sourceHeight - 1)) / (targetHeight - 1);

        // Get the four nearest source pixels
        const x1 = Math.floor(srcX);
        const x2 = Math.min(x1 + 1, sourceWidth - 1);
        const y1 = Math.floor(srcY);
        const y2 = Math.min(y1 + 1, sourceHeight - 1);

        // Calculate interpolation weights
        const wx = srcX - x1;
        const wy = srcY - y1;

        // Get values of four nearest pixels
        const v11 = mask[y1 * sourceWidth + x1];
        const v21 = mask[y1 * sourceWidth + x2];
        const v12 = mask[y2 * sourceWidth + x1];
        const v22 = mask[y2 * sourceWidth + x2];

        // Bilinear interpolation
        const value =
          v11 * (1 - wx) * (1 - wy) +
          v21 * wx * (1 - wy) +
          v12 * (1 - wx) * wy +
          v22 * wx * wy;

        result[y * targetWidth + x] = value;
      }
    }

    return result;
  }

  private maskToPath(
    mask: Float32Array,
    width: number,
    height: number,
    threshold: number
  ): [number, number][] {
    const path: [number, number][] = [];
    const visited = new Set<string>();

    // Pre-calculate width bounds for faster bounds checking
    const maxX = width - 1;
    const maxY = height - 1;

    // Optimize isValidPixel with fewer bounds checks
    const isValidPixel = (x: number, y: number): boolean => {
      if (x < 0 || x > maxX || y < 0 || y > maxY) return false;
      return mask[y * width + x] >= threshold;
    };

    // Use a more efficient key generation
    const getKey = (x: number, y: number): string => x + "," + y;

    // Find starting point more efficiently by scanning rows
    let startX = -1;
    let startY = -1;

    rowLoop: for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        if (mask[rowOffset + x] >= threshold) {
          startX = x;
          startY = y;
          break rowLoop;
        }
      }
    }

    if (startX === -1) return [];

    // Cache directions array
    const directions = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];

    // Start DFS from topmost leftmost point
    const stack: [number, number][] = [[startX, startY]];

    while (stack.length > 0) {
      const [currentX, currentY] = stack.pop()!;
      const key = getKey(currentX, currentY);

      if (visited.has(key)) continue;

      visited.add(key);
      path.push([currentX, currentY]);

      // Find next boundary point with preference for continuing in current direction
      let nextPoint: [number, number] | null = null;
      let minDistance = Infinity;

      for (const [dx, dy] of directions) {
        const newX = currentX + dx;
        const newY = currentY + dy;
        const newKey = getKey(newX, newY);

        if (isValidPixel(newX, newY) && !visited.has(newKey)) {
          // Check if this is a boundary pixel
          let isBoundary = false;
          for (const [checkDx, checkDy] of directions) {
            const checkX = newX + checkDx;
            const checkY = newY + checkDy;
            if (!isValidPixel(checkX, checkY)) {
              isBoundary = true;
              break;
            }
          }

          if (isBoundary) {
            // Calculate distance from current point
            const distance = Math.abs(dx) + Math.abs(dy);
            if (distance < minDistance) {
              minDistance = distance;
              nextPoint = [newX, newY];
            }
          }
        }
      }

      if (nextPoint) {
        stack.push(nextPoint);
      }
    }

    return path;
  }
}
