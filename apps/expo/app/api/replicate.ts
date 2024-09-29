import axios from "axios";

const modelIdentifier = process.env.EXPO_PUBLIC_REPLICATE_MODEL_IDENTIFIER;
const proxyEndpoint = process.env.EXPO_PUBLIC_REPLICATE_PROXY_ENDPOINT;

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
  completed_at: string | null;
  created_at: string;
  data_removed: boolean;
  error: string | null;
  id: string;
  input: {
    aaa: number;
    eee: number;
    woo: number;
    wink: number;
    blink: number;
    image: string;
    smile: number;
    eyebrow: number;
    pupil_x: number;
    pupil_y: number;
    src_ratio: number;
    rotate_yaw: number;
    crop_factor: number;
    rotate_roll: number;
    rotate_pitch: number;
    sample_ratio: number;
    output_format: string;
    output_quality: number;
  };
  logs: string[] | null;
  metrics: Record<string, unknown>;
  output: unknown | null;
  started_at: string | null;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  urls: {
    stream: string;
    get: string;
    cancel: string;
  };
  version: string;
}

class ReplicateService {
  async runExpressionEditor(
    input: ExpressionEditorInput
  ): Promise<ReplicateResponse> {
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

    const { data } = await axios.post<ReplicateResponse>(proxyEndpoint, {
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
    });

    console.log(`Model output: ${JSON.stringify(data)}`);

    return data;
  }
}

export default new ReplicateService();
