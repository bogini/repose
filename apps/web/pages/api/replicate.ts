import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { list, put, ListBlobResult } from "@vercel/blob";
import { kv } from "@vercel/kv";

const MODEL_IDENTIFIER = "bogini/expression-editor";

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

type ReplicateResponse = string[];

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const CACHE_VERSION = "v1";

const getCacheKey = async (input: ExpressionEditorInput) => {
  const data = new TextEncoder().encode(
    JSON.stringify({ modelIdentifier: MODEL_IDENTIFIER, input })
  );
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const getCachePath = (cacheKey: string) => {
  const sanitizedModelIdentifier = decodeURIComponent(MODEL_IDENTIFIER).replace(
    /[^a-zA-Z0-9]/g,
    "_"
  );
  return `cache/${CACHE_VERSION}/${sanitizedModelIdentifier}/${cacheKey}`;
};

const getCachedPredictionFromRedis = async (
  cachePath: string
): Promise<string | null> => {
  try {
    const cachedUrl = await kv.get(cachePath);
    if (cachedUrl) {
      return cachedUrl as string;
    }
    return null;
  } catch (error) {
    console.error(`Error getting cached prediction from Redis: ${error}`);
    throw error;
  }
};

const setCache = async (cachePath: string, url: string) => {
  try {
    await kv.set(cachePath, url);
  } catch (error) {
    console.error(`Error setting cache in Redis: ${error}`);
  }
};

const getCachedPredictionFromBlob = async (
  cachePath: string
): Promise<string | null> => {
  try {
    const response: ListBlobResult = await list({ prefix: cachePath });
    if (response.blobs.length > 0) {
      const blob = response.blobs[0];

      setCache(cachePath, blob.url);

      return blob.url;
    }
    return null;
  } catch (error) {
    console.error(
      `Error getting cached prediction from Blob Storage: ${error}`
    );
    throw error;
  }
};

const getCachedPrediction = async (
  cachePath: string
): Promise<string | null> => {
  return Promise.race([
    getCachedPredictionFromRedis(cachePath),
    getCachedPredictionFromBlob(cachePath),
  ]).catch(() => {
    return null;
  });
};

const cachePrediction = async (
  cachePath: string,
  predictionUrl: string,
  fileExtension: string
) => {
  try {
    const response = await fetch(predictionUrl);
    const blob = await response.blob();
    const cachedBlob = await put(`${cachePath}.${fileExtension}`, blob, {
      access: "public",
    });

    setCache(cachePath, cachedBlob.url);

    return cachedBlob;
  } catch (error) {
    console.error(`Error updating cache for path ${cachePath}: ${error}`);
  }
};

const runModel = async (
  input: ExpressionEditorInput
): Promise<ReplicateResponse> => {
  try {
    let prediction = await replicate.deployments.predictions.create(
      "bogini",
      "expression-editor",
      { input }
    );
    prediction = await replicate.wait(prediction, {
      mode: "poll",
      interval: 10,
    });
    return Array.isArray(prediction.output)
      ? prediction.output
      : [prediction.output];
  } catch (error) {
    console.error(`Error running model: ${error}`);
    throw error;
  }
};

export const runtime = "edge";
export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const maxDuration = 60 * 3; // 3 minutes

const handler = async (req: NextRequest) => {
  const start = Date.now();

  if (req.method !== "POST") {
    return new NextResponse(null, {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const { outputFormat = "webp", ...input } =
    (await req.json()) as ExpressionEditorInput;

  try {
    const cacheKey = await getCacheKey(input);
    const cachePath = getCachePath(cacheKey);

    const cachedPrediction = await getCachedPrediction(cachePath);

    if (cachedPrediction) {
      const duration = Date.now() - start;
      console.log({
        cacheKey,
        duration,
        cacheHit: true,
      });
      return new NextResponse(JSON.stringify({ url: cachedPrediction }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prediction = await runModel(input);

    console.log({ prediction, input });

    const url = prediction[0];

    cachePrediction(cachePath, url, outputFormat);

    const duration = Date.now() - start;

    console.log({
      cacheKey,
      duration,
      cacheHit: false,
    });

    return new NextResponse(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const duration = Date.now() - start;

    console.error({
      error: error instanceof Error ? error.message : error,
      duration,
    });

    return new NextResponse(
      JSON.stringify({
        error: `Error processing request: ${error instanceof Error ? error.message : error}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export default handler;
