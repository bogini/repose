import { loadTensorflowModel, TensorflowModel } from "react-native-fast-tflite";
import PhotosService from "../api/photos";
import * as jpeg from "jpeg-js";

export class FaceLandmarkDetector {
  private static instance: FaceLandmarkDetector;
  private model: TensorflowModel | null;

  private constructor() {
    this.model = null;
  }

  public static getInstance(): FaceLandmarkDetector {
    if (!FaceLandmarkDetector.instance) {
      FaceLandmarkDetector.instance = new FaceLandmarkDetector();
    }
    return FaceLandmarkDetector.instance;
  }

  async initialize() {
    if (this.model) {
      return;
    }

    try {
      // https://mediapipe.page.link/facemesh-mc
      this.model = await loadTensorflowModel(
        require("../assets/face_landmark.tflite")
      );
    } catch (error) {
      console.error("Error initializing face landmark model:", error);
    }
  }

  async detectLandmarks(imageUri: string) {
    if (!this.model) {
      throw new Error(
        "Face landmark model not initialized. Call initialize() first."
      );
    }

    try {
      const jpegImageData = await PhotosService.convertToJpeg(
        imageUri,
        192,
        192
      );
      const base64Data = jpegImageData.replace(/^data:image\/jpeg;base64,/, "");

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode JPEG data
      const rawImageData = jpeg.decode(bytes, { useTArray: true });

      // Prepare the input data - normalize to [0, 1]
      const inputData = new Float32Array(
        rawImageData.width * rawImageData.height * 3
      );
      for (let i = 0; i < rawImageData.data.length; i += 4) {
        const offset = (i / 4) * 3;
        inputData[offset] = rawImageData.data[i] / 255.0; // R
        inputData[offset + 1] = rawImageData.data[i + 1] / 255.0; // G
        inputData[offset + 2] = rawImageData.data[i + 2] / 255.0; // B
      }

      // Run the model with raw data array
      const outputData = await this.model.run([inputData]);

      return this.interpretOutput(outputData[0]);
    } catch (error) {
      console.error("Error detecting face landmarks:", error);
      throw error;
    }
  }

  private interpretOutput(outputData: any): any {
    const NUM_LANDMARKS = 468;
    const NUM_DIMS = 3;

    if (outputData.length < NUM_LANDMARKS * NUM_DIMS) {
      throw new Error("Incompatible model output");
    }

    const landmarks = [];
    for (let i = 0; i < NUM_LANDMARKS; i++) {
      const x = outputData[i * NUM_DIMS];
      const y = outputData[i * NUM_DIMS + 1];
      const z = outputData[i * NUM_DIMS + 2];
      landmarks.push({ x, y, z });
    }

    return landmarks;
  }
}
