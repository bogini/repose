import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

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

class ReplicateService {
  async runExpressionEditor(input: ExpressionEditorInput) {
    const {
      outputFormat = DEFAULT_OUTPUT_FORMAT,
      outputQuality = DEFAULT_OUTPUT_QUALITY,
      sampleRatio = DEFAULT_SAMPLE_RATIO,
      ...rest
    } = input;

    const modelIdentifier = process.env.REPLICATE_MODEL_IDENTIFIER as
      | `${string}/${string}`
      | `${string}/${string}:${string}`;

    console.log(
      `Running expression editor with input: ${JSON.stringify(input)}`
    );

    const output = await replicate.run(modelIdentifier, {
      input: {
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
    });

    console.log(`Expression editor output: ${JSON.stringify(output)}`);

    return output;
  }
}

export default new ReplicateService();
