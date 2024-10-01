import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { BASE_URL } from "./constants";

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
      this.photoCache = data; // Update the cache with the fetched photos
      return data;
    } catch (error) {
      console.error("Error listing photos:", error);
      throw error;
    }
  }

  async getPhotoById(id: string): Promise<Photo | undefined> {
    // Check if the photo is in the cache
    const cachedPhoto = this.photoCache.find((photo) => photo.id === id);
    if (cachedPhoto) {
      return cachedPhoto;
    }

    // If the photo is not in the cache, fetch the list of photos and update the cache
    try {
      const photos = await this.listPhotos();
      return photos.find((photo) => photo.id === id);
    } catch (error) {
      console.error(`Error getting photo ${id}:`, error);
      throw error;
    }
  }

  async uploadPhoto(fileUri: string): Promise<Photo> {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error("File does not exist");
    }

    const optimizedImage = await this.optimizeImage(fileUri);

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

  async deletePhoto(fileName: string): Promise<void> {
    try {
      await axios.delete(`${PHOTOS_ENDPOINT}`, {
        data: { fileName },
      });
      console.log(`Photo ${fileName} deleted successfully`);
    } catch (error) {
      console.error("Error deleting photo:", error);
      throw error;
    }
  }

  private async optimizeImage(fileUri: string): Promise<{ uri: string }> {
    const manipResult = await ImageManipulator.manipulateAsync(
      fileUri,
      [{ resize: { width: 1024, height: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP, base64: true }
    );
    return manipResult;
  }
}

export default new PhotosService();
