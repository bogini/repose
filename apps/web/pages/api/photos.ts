import { NextApiRequest, NextApiResponse } from "next";
import {
  list,
  put,
  del,
  ListBlobResult,
  PutCommandOptions,
} from "@vercel/blob";
import sharp from "sharp";

const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  throw new Error("BLOB_READ_WRITE_TOKEN is not defined");
}

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
const PHOTOS_FOLDER = "photos/";

const optimizeImage = async (file: Buffer): Promise<Buffer> => {
  return sharp(file)
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat("webp", { quality: 80 })
    .toBuffer();
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    switch (req.method) {
      case "GET":
        const photos: ListBlobResult = await list({ prefix: PHOTOS_FOLDER });
        const photoUrls = photos.blobs.map((photo) => ({
          url: photo.downloadUrl,
        }));
        return res.status(200).json(photoUrls);

      case "POST":
        const file = req.body;

        if (!file) {
          return res.status(400).json({ error: "File is not provided" });
        }

        const optimizedImage = await optimizeImage(file);

        if (optimizedImage.length > MAX_FILE_SIZE) {
          return res
            .status(400)
            .json({ error: "File size exceeds the limit of 1.5 MB" });
        }

        {
          const fileName = `${PHOTOS_FOLDER}photo-${Date.now()}.webp`;
          const options: PutCommandOptions = {
            access: "public",
            token,
          };
          const result = await put(fileName, optimizedImage, options);

          return res.status(200).json(result);
        }

      case "DELETE": {
        const { fileName } = req.body;
        if (!fileName) {
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
