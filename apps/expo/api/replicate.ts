import axios from "axios";
import { BASE_URL } from "./constants";

const MODEL_IDENTIFIER =
  "fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86";
const REPLICATE_ENDPOINT = BASE_URL + "/api/replicate";

const NUM_BUCKETS = 5;

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
  console.log(
    `getBucketValue: value=${value}, min=${min}, max=${max}, bucketValue=${bucketValue}`
  );
  return Math.round(bucketValue * 10) / 10;
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

class ReplicateService {
  private cancelTokenSource = axios.CancelToken.source();

  async runExpressionEditor(input: ExpressionEditorInput): Promise<string> {
    const {
      outputFormat = DEFAULT_OUTPUT_FORMAT,
      outputQuality = DEFAULT_OUTPUT_QUALITY,
      sampleRatio = DEFAULT_SAMPLE_RATIO,
      cropFactor = DEFAULT_CROP_FACTOR,
      srcRatio = DEFAULT_SRC_RATIO,
      ...rest
    } = input;

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
      };

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

      console.log("Response", data);

      return data.url;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          console.error("Request timeout:", error);
        } else if (error.message === "Network Error") {
          console.error(
            "Network error: Please check your connection or server status."
          );
        } else {
          // console.error("Axios error response:", error);
        }
      } else {
        console.error("Request error:", error);
      }
      throw error;
    }
  }
}

export default new ReplicateService();
