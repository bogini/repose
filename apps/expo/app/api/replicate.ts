import axios from "axios";
import { debounce } from "lodash";

const modelIdentifier =
  "fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86";
const proxyEndpoint = "http://localhost:3000/api/replicate";

console.log({ modelIdentifier, proxyEndpoint });

if (!modelIdentifier) {
  throw new Error("REPLICATE_MODEL_IDENTIFIER is not set");
}

if (!proxyEndpoint) {
  throw new Error("REPLICATE_PROXY_ENDPOINT is not set");
}

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
  private debouncedRunExpressionEditor: (
    input: ExpressionEditorInput
  ) => Promise<string>;

  constructor() {
    this.debouncedRunExpressionEditor = debounce(
      this.runExpressionEditor.bind(this),
      250
    ) as (input: ExpressionEditorInput) => Promise<string>;
  }

  async runExpressionEditor(input: ExpressionEditorInput): Promise<string> {
    const {
      outputFormat = DEFAULT_OUTPUT_FORMAT,
      outputQuality = DEFAULT_OUTPUT_QUALITY,
      sampleRatio = DEFAULT_SAMPLE_RATIO,
      ...rest
    } = input;

    console.log(
      "ReplicateService.runExpressionEditor",
      modelIdentifier,
      proxyEndpoint,
      rest
    );

    try {
      // Cancel previous request if it exists
      this.cancelTokenSource.cancel("Request canceled due to new request");
    } catch (error) {
      if (!axios.isCancel(error)) {
        throw error;
      }
    }

    // Create a new cancel token for the current request
    this.cancelTokenSource = axios.CancelToken.source();

    const { data } = await axios.post<ReplicateResponse>(
      proxyEndpoint!,
      {
        modelIdentifier,
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
      },
      { cancelToken: this.cancelTokenSource.token }
    );

    console.log(`Model output: ${JSON.stringify(data)}`);

    return data[0];
  }
}

export default new ReplicateService();
