import { loadTensorflowModel, TensorflowModel } from "react-native-fast-tflite";
import PhotosService from "../api/photos";
import * as jpeg from "jpeg-js";

const THRESHOLD = 0.9;
const INPUT_SIZE = {
  width: 256,
  height: 256,
  channels: 3,
};

// https://huggingface.co/qualcomm/MediaPipe-Selfie-Segmentation
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
        require("../assets/MediaPipe-Selfie-Segmentation.tflite")
      );
      console.log("Selfie segmentation model initialized");
    } catch (error) {
      console.error("Error initializing selfie segmentation model:", error);
    }
  }

  async segmentImage(imageUri: string): Promise<[number, number][]> {
    if (!imageUri) {
      throw new Error("Image URI is required");
    }

    if (!this.model) {
      throw new Error("Model not initialized. Call initialize() first.");
    }

    try {
      const imageData = await this.prepareImageData(imageUri);
      const mask = await this.runSegmentation(imageData);
      const denormalizedMask = this.denormalizeMask(
        mask,
        imageData.originalWidth,
        imageData.originalHeight
      );
      return this.maskToPath(
        denormalizedMask,
        imageData.originalWidth,
        imageData.originalHeight,
        THRESHOLD
      );
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

    const mask = new Float32Array(outputData[0].buffer);

    return mask;
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

  /**
   * Converts a mask into an array of boundary coordinates
   * @param mask The denormalized mask
   * @param width Image width
   * @param height Image height
   * @param threshold Value between 0 and 1 to determine foreground (default: 0.5)
   * @returns Array of [x, y] coordinates representing the boundary
   */
  private maskToPath(
    mask: Float32Array,
    width: number,
    height: number,
    threshold: number
  ): [number, number][] {
    const binaryMask = new Uint8Array(mask.length);
    for (let i = 0; i < mask.length; i++) {
      binaryMask[i] = mask[i] > threshold ? 1 : 0;
    }

    const path: [number, number][] = [];
    const visited = new Set<string>();

    const directions = [
      [0, 1], // right
      [1, 1], // down-right
      [1, 0], // down
      [1, -1], // down-left
      [0, -1], // left
      [-1, -1], // up-left
      [-1, 0], // up
      [-1, 1], // up-right
    ];

    const isValid = (x: number, y: number) =>
      x >= 0 &&
      x < width &&
      y >= 0 &&
      y < height &&
      binaryMask[y * width + x] === 0;

    const traceContour = (startX: number, startY: number) => {
      let x = startX;
      let y = startY;
      let dir = 0;

      do {
        path.push([x, y]);
        visited.add(`${x},${y}`);

        let found = false;
        for (let i = 0; i < directions.length; i++) {
          const [dx, dy] = directions[(dir + i) % directions.length];
          const nx = x + dx;
          const ny = y + dy;

          if (isValid(nx, ny) && !visited.has(`${nx},${ny}`)) {
            x = nx;
            y = ny;
            dir = (dir + i + 6) % directions.length;
            found = true;
            break;
          }
        }

        if (!found) break;
      } while (x !== startX || y !== startY);

      // Ensure the path includes top-left and top-right corners
      if (!path.some(([px, py]) => px === 0 && py === 0)) {
        path.unshift([0, 0]);
      }
      if (!path.some(([px, py]) => px === width - 1 && py === 0)) {
        path.push([width - 1, 0]);
      }

      // Close the path by returning to start
      if (
        path[0][0] !== path[path.length - 1][0] ||
        path[0][1] !== path[path.length - 1][1]
      ) {
        path.push(path[0]);
      }

      return path;
    };

    // Start tracing from the first valid background pixel in the top third of the image
    const searchHeight = Math.floor(height / 3);
    for (let y = 0; y < searchHeight; y++) {
      for (let x = 0; x < width; x++) {
        if (binaryMask[y * width + x] === 0 && !visited.has(`${x},${y}`)) {
          return traceContour(x, y);
        }
      }
    }

    // Fallback: if no path found in top third, search the entire image
    for (let y = searchHeight; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binaryMask[y * width + x] === 0 && !visited.has(`${x},${y}`)) {
          return traceContour(x, y);
        }
      }
    }

    // If no path found, return a basic rectangle
    return [
      [0, 0],
      [width - 1, 0],
      [width - 1, height - 1],
      [0, height - 1],
      [0, 0],
    ];
  }
}
