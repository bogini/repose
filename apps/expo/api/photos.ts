import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { BASE_URL } from "./constants";

const TARGET_SIZE = 1024;
const PHOTOS_ENDPOINT = BASE_URL + "/api/photos";

export interface Photo {
  id: string;
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType?: string;
  contentDisposition: string;
}

class PhotosService {
  private photoCache: Photo[] = [];

  async listPhotos(): Promise<Photo[]> {
    try {
      const { data } = await axios.get<Photo[]>(PHOTOS_ENDPOINT);
      console.log("Successfully fetched photos:", data.length);
      this.photoCache = data;
      return data;
    } catch (error) {
      console.error("Error listing photos:", error);
      throw error;
    }
  }

  async getPhotoById(id: string): Promise<Photo | undefined> {
    const cachedPhoto = this.photoCache.find((photo) => photo.id === id);
    if (cachedPhoto) {
      return cachedPhoto;
    }

    try {
      const photos = await this.listPhotos();
      return photos.find((photo) => photo.id === id);
    } catch (error) {
      console.error(`Error getting photo ${id}:`, error);
      throw error;
    }
  }

  async uploadPhoto(
    fileUri: string,
    width: number,
    height: number
  ): Promise<Photo> {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error("File does not exist");
    }

    const optimizedImage = await this.optimizeImage(fileUri, width, height);

    const base64String = await FileSystem.readAsStringAsync(
      optimizedImage.uri,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    const dataUrl = `data:image/webp;base64,${base64String}`;

    try {
      const { data } = await axios.post<Photo>(PHOTOS_ENDPOINT, dataUrl, {
        headers: {
          "Content-Type": "text/plain",
        },
      });

      console.log(`Upload response: ${JSON.stringify(data)}`);

      this.photoCache.push(data);

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          console.error("Request timeout:", error);
        } else if (error.message === "Network Error") {
          console.error(
            "Network error: Please check your connection or server status."
          );
        } else {
          console.error("Axios error response:", error.response?.data);
        }
      } else {
        console.error("Request error:", error);
      }
      throw error;
    }
  }

  async deletePhoto(photo: Photo): Promise<void> {
    try {
      await axios.delete(PHOTOS_ENDPOINT, {
        data: { url: photo.url },
      });

      this.photoCache = this.photoCache.filter((p) => p.id !== photo.id);
    } catch (error) {
      console.error("Error deleting photo:", error);
      throw error;
    }
  }

  public async getImageDimensions(
    fileUri: string
  ): Promise<{ width: number; height: number }> {
    try {
      // Use ImageManipulator to get dimensions without modifying the image
      const result = await ImageManipulator.manipulateAsync(
        fileUri,
        [], // No transformations
        { compress: 1 } // Preserve quality
      );

      return {
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error("Error getting image dimensions:", error);
      throw error;
    }
  }

  public async optimizeImage(
    fileUri: string,
    width: number,
    height: number
  ): Promise<{ uri: string }> {
    const aspectRatio = width / height;

    let targetWidth, targetHeight;

    if (width > height) {
      targetWidth = TARGET_SIZE;
      targetHeight = TARGET_SIZE / aspectRatio;
    } else {
      targetHeight = TARGET_SIZE;
      targetWidth = TARGET_SIZE * aspectRatio;
    }

    // Ensure the dimensions do not exceed the original dimensions
    targetWidth = Math.min(targetWidth, width);
    targetHeight = Math.min(targetHeight, height);

    const manipResult = await ImageManipulator.manipulateAsync(
      fileUri,
      [
        {
          resize: {
            width: targetWidth,
            height: targetHeight,
          },
        },
      ],
      { format: ImageManipulator.SaveFormat.WEBP, base64: false }
    );

    return manipResult;
  }

  public async convertToJpeg(
    fileUri: string,
    width?: number,
    height?: number
  ): Promise<string> {
    try {
      const actions = [];

      if (width && height) {
        actions.push({
          resize: {
            width,
            height,
          },
        });
      }

      const manipResult = await ImageManipulator.manipulateAsync(
        fileUri,
        actions,
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipResult.base64) {
        throw new Error("Failed to convert image to JPEG");
      }
      return manipResult.base64;
    } catch (error) {
      console.error("Error converting to JPEG:", error);
      throw error;
    }
  }
}

export default new PhotosService();
