import axios from "axios";
import { BASE_URL } from "./constants";
import NodeCache from "node-cache";
import * as Crypto from "expo-crypto";

const MODEL_IDENTIFIER =
  "fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86";
const REPLICATE_ENDPOINT = BASE_URL + "/api/replicate";

const NUM_BUCKETS = 5;

export type FaceValues = {
  rotatePitch: number;
  rotateYaw: number;
  eyebrow: number;
  rotateRoll: number;
  pupilX: number;
  pupilY: number;
  smile: number;
  blink: number;
  wink: number;
};

export const DEFAULT_VALUES: FaceValues = {
  rotatePitch: 0,
  rotateYaw: 0,
  eyebrow: 0,
  rotateRoll: 0,
  pupilX: 0,
  pupilY: 0,
  smile: 0,
  blink: 0,
  wink: 0,
};

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
  const bucketValue = min + bucketIndex * bucketSize;
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
const DEFAULT_OUTPUT_QUALITY = 95;
const DEFAULT_SAMPLE_RATIO = 1;
const DEFAULT_CROP_FACTOR = 1.5;
const DEFAULT_SRC_RATIO = 1;

interface ReplicateResponse {
  url: string;
}

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

class ReplicateService {
  private cancelTokenSource = axios.CancelToken.source();

  async runExpressionEditor(
    input: ExpressionEditorInput,
    shouldCancel: boolean = true
  ): Promise<string> {
    const startTime = Date.now();

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
        modelIdentifier: MODEL_IDENTIFIER,
        output_format: outputFormat,
        output_quality: outputQuality,
        sample_ratio: sampleRatio,
        rotate_pitch: getBucketValue(rest.rotatePitch, -20, 20),
        rotate_yaw: getBucketValue(rest.rotateYaw, -20, 20),
        rotate_roll: getBucketValue(rest.rotateRoll, -20, 20),
        pupil_x: getBucketValue(rest.pupilX, -15, 15),
        pupil_y: getBucketValue(rest.pupilY, -15, 15),
        smile: getBucketValue(rest.smile, -0.3, 1.3),
        blink: getBucketValue(rest.blink, -20, 5),
        eyebrow: getBucketValue(rest.eyebrow, -10, 15),
        crop_factor: cropFactor,
        src_ratio: srcRatio,
        image: rest.image,
      };

      const cacheKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.MD5,
        JSON.stringify(payload)
      );
      const cachedResponse = cache.get(cacheKey);

      if (cachedResponse) {
        const cacheHitTime = Date.now() - startTime;
        console.log(`Cache hit in ${cacheHitTime}ms`, cachedResponse);
        return cachedResponse as string;
      }

      console.log("Request", {
        proxyEndpoint: REPLICATE_ENDPOINT,
        modelIdentifier: MODEL_IDENTIFIER,
        payload,
      });

      const { data } = await axios.post<ReplicateResponse>(
        REPLICATE_ENDPOINT!,
        payload,
        { cancelToken: this.cancelTokenSource.token }
      );
      const responseTime = Date.now() - startTime;

      console.log(`Response received in ${responseTime}ms`, data);

      cache.set(cacheKey, data.url);

      return data.url;
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
      throw error;
    }
  }

  async runExpressionEditorWithAllRotations(
    image: ExpressionEditorInput["image"],
    parallelism: number = 10
  ): Promise<string[]> {
    const startTime = Date.now();
    const rotationMin = -20;
    const rotationMax = 20;
    const rotationValues = Array.from({ length: NUM_BUCKETS }, (_, i) => {
      const percentage = i / (NUM_BUCKETS - 1);
      return rotationMin + percentage * (rotationMax - rotationMin);
    });

    const results: string[] = [];
    const promises: Promise<void>[] = [];

    for (const rotatePitch of rotationValues) {
      for (const rotateYaw of rotationValues) {
        for (const rotateRoll of rotationValues) {
          const updatedInput: ExpressionEditorInput = {
            image,
            rotatePitch,
            rotateYaw,
            rotateRoll,
            pupilX: DEFAULT_VALUES.pupilX,
            pupilY: DEFAULT_VALUES.pupilY,
            smile: DEFAULT_VALUES.smile,
            blink: DEFAULT_VALUES.blink,
            eyebrow: DEFAULT_VALUES.eyebrow,
            cropFactor: DEFAULT_CROP_FACTOR,
            srcRatio: DEFAULT_SRC_RATIO,
            outputFormat: DEFAULT_OUTPUT_FORMAT,
            outputQuality: DEFAULT_OUTPUT_QUALITY,
            sampleRatio: DEFAULT_SAMPLE_RATIO,
          };

          const promise = this.runExpressionEditor(updatedInput, false)
            .then((result) => {
              results.push(result);
            })
            .catch((error) => {
              console.error(
                `Error running expression editor with input: ${JSON.stringify(updatedInput)}`,
                error
              );
            });

          promises.push(promise);

          if (promises.length >= parallelism) {
            await Promise.all(promises);
            promises.length = 0;
          }
        }
      }
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    console.log(`runExpressionEditorWithAllRotations took ${elapsedTime}ms`);

    return results;
  }
}

export default new ReplicateService();
