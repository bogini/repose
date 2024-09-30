import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
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

const getCacheKey = async (
  modelIdentifier: string,
  input: ExpressionEditorInput
) => {
  const data = new TextEncoder().encode(
    JSON.stringify({ modelIdentifier, input })
  );
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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
      return blob.url;
    }
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
    const response = await fetch(predictionUrl);
    const blob = await response.blob();
    await put(`${cachePath}.${fileExtension}`, blob, {
      access: "public",
    });
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

  const {
    modelIdentifier,
    outputFormat = "webp",
    ...input
  } = (await req.json()) as RequestBody;

  if (!modelIdentifier) {
    return new NextResponse(
      JSON.stringify({ error: "modelIdentifier is not set" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const cacheKey = await getCacheKey(modelIdentifier, input);
    const cachePath = getCachePath(modelIdentifier, cacheKey);

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

    const prediction = await runModel(modelIdentifier, input);

    console.log({ modelIdentifier, prediction, input });

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
