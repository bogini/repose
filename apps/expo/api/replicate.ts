import axios from "axios";
import { BASE_URL } from "./constants";
import AsyncStorage from "@react-native-community/async-storage";
import * as Crypto from "expo-crypto";
import {
  DEFAULT_FACE_VALUES,
  FACE_CONTROLS,
  FaceControl,
  FaceValues,
} from "../lib/faceControl";
import { Image } from "expo-image";
import pLimit from "p-limit";

const REPLICATE_ENDPOINT = BASE_URL + "/api/replicate";
const MAX_CONCURRENT_REQUESTS = 250;
export const NUM_BUCKETS = 6;

const getBucketValue = (
  value: number | undefined,
  min: number,
  max: number
) => {
  if (value === undefined) {
    return undefined;
  }
  const range = max - min;
  const bucketSize = range / NUM_BUCKETS;
  const bucketIndex = Math.round((value - min) / bucketSize);
  const bucketValue = Math.min(
    Math.max(min + bucketIndex * bucketSize, min),
    max
  );
  return Math.round(bucketValue * 100) / 100;
};

interface ExpressionEditorInput {
  image: string;
  rotatePitch?: number;
  rotateYaw?: number;
  rotateRoll?: number;
  pupilX?: number;
  pupilY?: number;
  smile?: number;
  blink?: number;
  wink?: number;
  eyebrow?: number;
  cropFactor?: number;
  srcRatio?: number;
  sampleRatio?: number;
  outputFormat?: "webp" | "png" | "jpg";
  outputQuality?: number;
}

const DEFAULT_OUTPUT_FORMAT = "webp";
const DEFAULT_OUTPUT_QUALITY = 100;
const DEFAULT_SAMPLE_RATIO = 1;
const DEFAULT_CROP_FACTOR = 2.5;
const DEFAULT_SRC_RATIO = 1;

interface ReplicateResponse {
  url: string;
}

class ReplicateService {
  private cancelTokenSource = axios.CancelToken.source();
  private inMemoryCache: Record<string, string> = {};

  private async getFromCache(key: string): Promise<string | undefined> {
    // Check in-memory cache first
    const inMemoryValue = this.inMemoryCache[key];
    if (inMemoryValue) {
      return inMemoryValue;
    }

    // Check AsyncStorage cache
    const asyncStorageValue = await AsyncStorage.getItem(key);
    if (asyncStorageValue) {
      // Store in in-memory cache for faster access next time
      this.inMemoryCache[key] = asyncStorageValue;
      return asyncStorageValue;
    }

    return undefined;
  }

  private async setInCache(key: string, value: string): Promise<void> {
    this.inMemoryCache[key] = value;
    await AsyncStorage.setItem(key, value);
  }

  clearInMemoryCache(): void {
    this.inMemoryCache = {};
  }

  async runExpressionEditor(
    input: ExpressionEditorInput,
    shouldCancel: boolean = true,
    skipCache: boolean = false
  ): Promise<string | undefined> {
    const startTime = performance.now();

    const {
      outputFormat = DEFAULT_OUTPUT_FORMAT,
      outputQuality = DEFAULT_OUTPUT_QUALITY,
      sampleRatio = DEFAULT_SAMPLE_RATIO,
      cropFactor = DEFAULT_CROP_FACTOR,
      srcRatio = DEFAULT_SRC_RATIO,
      ...rest
    } = input;

    if (shouldCancel) {
      try {
        // Cancel previous request if it exists
        this.cancelTokenSource.cancel("Request canceled due to new request");
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error canceling previous request:", error);
          throw error;
        }
      }

      // Create a new cancel token for the current request
      this.cancelTokenSource = axios.CancelToken.source();
    }

    try {
      const payload = {
        blink: getBucketValue(rest.blink, -20, 5),
        crop_factor: cropFactor,
        eyebrow: getBucketValue(rest.eyebrow, -10, 15),
        image: rest.image,
        output_format: outputFormat,
        output_quality: outputQuality,
        pupil_x: getBucketValue(rest.pupilX, -15, 15),
        pupil_y: getBucketValue(rest.pupilY, -15, 15),
        rotate_pitch: getBucketValue(rest.rotatePitch, -20, 20),
        rotate_roll: getBucketValue(rest.rotateRoll, -20, 20),
        rotate_yaw: getBucketValue(rest.rotateYaw, -20, 20),
        sample_ratio: sampleRatio,
        smile: getBucketValue(rest.smile, -0.3, 1.3),
        src_ratio: srcRatio,
      };

      const cacheKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(payload)
      );

      if (!skipCache) {
        // const cacheStartTime = performance.now();
        const cachedResponse = await this.getFromCache(cacheKey);
        // const cacheEndTime = performance.now();
        if (cachedResponse) {
          // const cacheHitTime = cacheEndTime - cacheStartTime;
          // console.log(`Cache hit in ${cacheHitTime.toFixed(0)}ms`, cacheKey);
          return cachedResponse;
        }
      }

      console.log("Request", cacheKey);

      const { data } = await axios.post<ReplicateResponse>(
        REPLICATE_ENDPOINT!,
        payload,
        { cancelToken: this.cancelTokenSource.token }
      );

      const imageUrl = data.url;

      this.setInCache(cacheKey, imageUrl);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      console.log(`Response ${totalTime.toFixed(0)}ms`, cacheKey);

      return imageUrl;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Axios error response:", error.response.data);
        } else if (error.request) {
          console.error("Axios error request:", error.request);
        } else {
          // console.error("Other error message:", error.message);
        }
      } else {
        console.error("Request error:", error);
      }
    }
  }

  async cacheExpressionEditorResults(
    image: ExpressionEditorInput["image"]
  ): Promise<string[]> {
    const startTime = performance.now();
    const results: string[] = [];
    const totalCount = Math.pow(NUM_BUCKETS + 1, 3) + FACE_CONTROLS.length;

    const concurrently = pLimit(MAX_CONCURRENT_REQUESTS);

    const processRotation = async (
      rotatePitch: number,
      rotateYaw: number,
      rotateRoll: number,
      additionalValues: Partial<FaceValues> = {}
    ) => {
      const updatedInput: ExpressionEditorInput = {
        ...DEFAULT_FACE_VALUES,
        image,
        rotatePitch,
        rotateYaw,
        rotateRoll,
        ...additionalValues,
        cropFactor: DEFAULT_CROP_FACTOR,
        outputFormat: DEFAULT_OUTPUT_FORMAT,
        outputQuality: DEFAULT_OUTPUT_QUALITY,
        sampleRatio: DEFAULT_SAMPLE_RATIO,
        srcRatio: DEFAULT_SRC_RATIO,
      };

      try {
        const result = await this.runExpressionEditor(updatedInput, false);
        if (result) {
          results.push(result);
          Image.prefetch(result, { cachePolicy: "memory-disk" });
        }
      } catch (error) {
        console.error(error);
      }
    };

    const generateRotations = (roll: number) => {
      const rotationMin = -20;
      const rotationMax = 20;
      const bucketSize = (rotationMax - rotationMin) / NUM_BUCKETS;
      const promises: Promise<void>[] = [];

      for (let i = 0; i <= NUM_BUCKETS; i++) {
        const rotatePitch = getBucketValue(
          rotationMin + bucketSize * i,
          rotationMin,
          rotationMax
        )!;
        for (let j = 0; j <= NUM_BUCKETS; j++) {
          const rotateYaw = getBucketValue(
            rotationMin + bucketSize * j,
            rotationMin,
            rotationMax
          )!;
          promises.push(
            concurrently(() => processRotation(rotatePitch, rotateYaw, roll))
          );
        }
      }

      return promises;
    };

    const processAllRotations = async () => {
      // Process all rotatePitch and rotateYaw with rotateRoll = 0
      await Promise.all(generateRotations(0));

      // Process remaining combinations with non-zero rotateRoll
      for (let k = 1; k <= NUM_BUCKETS; k++) {
        const rotateRoll = getBucketValue(
          -20 + (40 / NUM_BUCKETS) * k,
          -20,
          20
        )!;
        await Promise.all(generateRotations(rotateRoll));
      }
    };

    const processFaceControlValues = async (control: FaceControl) => {
      for (const value of control.values) {
        const bucketSize = (value.max - value.min) / NUM_BUCKETS;
        for (let i = 0; i <= NUM_BUCKETS; i++) {
          const bucketValue = getBucketValue(
            value.min + bucketSize * i,
            value.min,
            value.max
          )!;
          const additionalValues: Partial<FaceValues> = {
            [value.key]: bucketValue,
          };
          await concurrently(() => processRotation(0, 0, 0, additionalValues));
        }
      }
    };

    const processFaceControls = async () => {
      for (const control of FACE_CONTROLS) {
        await processFaceControlValues(control);
      }
    };

    await processAllRotations();
    await processFaceControls();

    const endTime = performance.now();

    console.log(
      `runExpressionEditorWithAllRotations took ${(endTime - startTime).toFixed(
        0
      )}ms with ${totalCount} requests`
    );

    return results;
  }

  async cacheExpressionEditorResultsWithFaceControls(
    image: ExpressionEditorInput["image"],
    currentFaceValues: FaceValues,
    selectedControl: FaceControl
  ): Promise<void> {
    const startTime = performance.now();

    const concurrently = pLimit(MAX_CONCURRENT_REQUESTS);

    const processInput = async (input: ExpressionEditorInput) => {
      try {
        const result = await this.runExpressionEditor(input, false);
        if (result) {
          Image.prefetch(result, { cachePolicy: "memory-disk" });
        }
      } catch (error) {
        console.error(error);
      }
    };

    const generateInputs = () => {
      const promises: Promise<void>[] = [];

      for (const value of selectedControl.values) {
        const bucketSize = (value.max - value.min) / NUM_BUCKETS;

        for (let i = 0; i <= NUM_BUCKETS; i++) {
          const bucketValue = getBucketValue(
            value.min + bucketSize * i,
            value.min,
            value.max
          )!;

          const updatedInput: ExpressionEditorInput = {
            ...currentFaceValues,
            image,
            [value.key]: bucketValue,
          };
          promises.push(concurrently(() => processInput(updatedInput)));
        }
      }

      return promises;
    };

    await Promise.all(generateInputs());

    const endTime = performance.now();

    console.log(
      `cacheExpressionEditorResultsWithFaceControls took ${(
        endTime - startTime
      ).toFixed(0)}ms for ${selectedControl.label}`
    );
  }
}

export default new ReplicateService();
