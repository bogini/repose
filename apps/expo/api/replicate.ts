import axios from "axios";
import { BASE_URL } from "./constants";

const MODEL_IDENTIFIER =
  "fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86";
const REPLICATE_ENDPOINT = BASE_URL + "/api/replicate";

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

const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_OUTPUT_QUALITY = 95;
const DEFAULT_SAMPLE_RATIO = 1;

interface ReplicateResponse {
  [index: number]: string;
}

class ReplicateService {
  private cancelTokenSource = axios.CancelToken.source();

  async runExpressionEditor(input: ExpressionEditorInput): Promise<string> {
    const {
      outputFormat = DEFAULT_OUTPUT_FORMAT,
      outputQuality = DEFAULT_OUTPUT_QUALITY,
      sampleRatio = DEFAULT_SAMPLE_RATIO,
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
        ...rest,
        output_format: outputFormat,
        output_quality: outputQuality,
        sample_ratio: sampleRatio,
        rotate_pitch: rest.rotatePitch,
        rotate_yaw: rest.rotateYaw,
        rotate_roll: rest.rotateRoll,
        pupil_x: rest.pupilX,
        pupil_y: rest.pupilY,
        crop_factor: rest.cropFactor,
        src_ratio: rest.srcRatio,
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

      console.log(`Model output: ${JSON.stringify(data)}`);

      return data[0];
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
