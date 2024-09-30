import { NextApiRequest, NextApiResponse } from "next";
import Replicate from "replicate";
import { createHash } from "crypto";
import { list, put, ListBlobResult } from "@vercel/blob";

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

interface RequestBody extends ExpressionEditorInput {
  modelIdentifier: `${string}/${string}` | `${string}/${string}:${string}`;
}

type ReplicateResponse = string[];

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const CACHE_VERSION = "v1";

const getCacheKey = (modelIdentifier: string, input: ExpressionEditorInput) => {
  return createHash("md5")
    .update(JSON.stringify({ modelIdentifier, input }))
    .digest("hex");
};

const getCachePath = (modelIdentifier: string, cacheKey: string) => {
  const sanitizedModelIdentifier = decodeURIComponent(modelIdentifier).replace(
    /[^a-zA-Z0-9]/g,
    "_"
  );
  return `cache/${CACHE_VERSION}/${sanitizedModelIdentifier}/${cacheKey}`;
};

const getCachedPrediction = async (
  cachePath: string
): Promise<string | null> => {
  try {
    const response: ListBlobResult = await list({ prefix: cachePath });
    if (response.blobs.length > 0) {
      const blob = response.blobs[0];
      console.log(`Cache hit: ${blob.url}`);
      return blob.url;
    }
    console.log(`Cache miss: ${cachePath}`);
    return null;
  } catch (error) {
    console.error(`Error getting cached prediction: ${error}`);
    return null;
  }
};

const cachePrediction = async (
  cachePath: string,
  predictionUrl: string,
  fileExtension: string
) => {
  try {
    console.log(`Updating cache for path: ${cachePath}`);
    const response = await fetch(predictionUrl);
    const blob = await response.blob();
    await put(`${cachePath}.${fileExtension}`, blob, {
      access: "public",
    });
    console.log(`Cache updated successfully for path: ${cachePath}`);
  } catch (error) {
    console.error(`Error updating cache for path ${cachePath}: ${error}`);
  }
};

const runModel = async (
  modelIdentifier: RequestBody["modelIdentifier"],
  input: ExpressionEditorInput
): Promise<ReplicateResponse> => {
  try {
    const output = await replicate.run(modelIdentifier, { input });
    return Array.isArray(output) ? output : [output];
  } catch (error) {
    console.error(`Error running model: ${error}`);
    throw error;
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now();

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const {
    modelIdentifier,
    outputFormat = "webp",
    ...input
  } = req.body as RequestBody;

  if (!modelIdentifier) {
    return res.status(400).json({ error: "modelIdentifier is not set" });
  }

  try {
    const cacheKey = getCacheKey(modelIdentifier, input);
    const cachePath = getCachePath(modelIdentifier, cacheKey);

    const cachedPrediction = await getCachedPrediction(cachePath);

    if (cachedPrediction) {
      console.log(`Cache hit for key: ${cacheKey}`);
      const end = Date.now();
      console.log(`Request took ${end - start} ms`);
      return res.status(200).json({ url: cachedPrediction });
    }

    console.log(`Running model with input: ${JSON.stringify(input)}`);

    const prediction = await runModel(modelIdentifier, input);

    console.log(`Model output: ${prediction}`);

    const url = prediction[0];

    cachePrediction(cachePath, url, outputFormat);

    const end = Date.now();
    console.log(`Request took ${end - start} ms`);

    return res.status(200).json({ url });
  } catch (error) {
    console.error(`Error processing request: ${error}`);
    const end = Date.now();
    console.log(`Request took ${end - start} ms`);
    return res.status(500).json({
      error: `Error processing request: ${error instanceof Error ? error.message : error}`,
    });
  }
};

export default handler;
