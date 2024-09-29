import { NextApiRequest, NextApiResponse } from "next";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { modelIdentifier, ...input } = req.body;

  if (!modelIdentifier) {
    return res.status(400).json({ error: "modelIdentifier is not set" });
  }

  console.log(`Running model with input: ${JSON.stringify(input)}`);

  try {
    const prediction = await replicate.run(modelIdentifier, { input });

    console.log(`Model output: ${JSON.stringify(prediction)}`);

    return res.status(200).json(prediction);
  } catch (error) {
    console.error(`Error running model: ${error}`);
    return res.status(500).json({
      error: `Error running model: ${error instanceof Error ? error.message : error}`,
    });
  }
};

export default handler;
