import { NextApiRequest, NextApiResponse } from "next";
import {
  list,
  put,
  del,
  ListBlobResult,
  PutCommandOptions,
  PutBlobResult,
} from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  throw new Error("BLOB_READ_WRITE_TOKEN is not defined");
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const PHOTOS_FOLDER = "photos/";
const IMAGE_FORMAT = "webp";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    switch (req.method) {
      case "GET":
        const response: ListBlobResult = await list({ prefix: PHOTOS_FOLDER });
        const blobsWithId = response.blobs.map((blob) => ({
          ...blob,
          id: blob.pathname.split(".")[0].replace(PHOTOS_FOLDER, ""),
        }));
        return res.status(200).json(blobsWithId);

      case "POST":
        const dataUrl = req.body;

        if (!dataUrl) {
          console.error("POST Error: File is not provided");
          return res.status(400).json({ error: "File is not provided" });
        }

        const matches = dataUrl.match(/^data:image\/webp;base64,(.+)$/);

        if (!matches || matches.length !== 2) {
          console.error("POST Error: Invalid data URL");
          return res.status(400).json({ error: "Invalid data URL" });
        }

        const fileBase64 = matches[1];
        const file = Buffer.from(fileBase64, "base64");

        if (file.length > MAX_FILE_SIZE) {
          console.error("POST Error: File size exceeds the limit of 5 MB");
          return res
            .status(400)
            .json({ error: "File size exceeds the limit of 5 MB" });
        }

        const timestamp = Date.now();
        const fileName = `${PHOTOS_FOLDER}${timestamp}.${IMAGE_FORMAT}`;
        const options: PutCommandOptions = {
          access: "public",
          token,
        };
        const result: PutBlobResult = await put(fileName, file, options);
        const resultWithId = {
          ...result,
          id: timestamp.toString(),
        };

        return res.status(200).json(resultWithId);

      case "DELETE": {
        const { fileName } = req.body;
        if (!fileName) {
          console.error("DELETE Error: File name is not provided");
          return res.status(400).json({ error: "File name is not provided" });
        }

        await del(`${PHOTOS_FOLDER}${fileName}`, { token });

        return res.status(200).json({ message: "File deleted successfully" });
      }

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error handling request: ${error}`);
    return res.status(500).json({
      error: `Error handling request: ${error instanceof Error ? error.message : error}`,
    });
  }
};

export default handler;
