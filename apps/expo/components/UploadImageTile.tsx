import React, { useState } from "react";
import {
  Button,
  Image,
  View,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import PhotosService from "../api/photos";
import { SymbolView } from "expo-symbols";

interface UploadImageTileProps {
  onImagePicked?: (uri: string) => void;
  onUploadSuccess?: (response: any) => void;
  onUploadError?: (error: any) => void;
}

export default function UploadImageTile({
  onImagePicked,
  onUploadSuccess,
  onUploadError,
}: UploadImageTileProps) {
  const [image, setImage] = useState<string | null>(null);
  const [cameraPermissionInformation, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const [mediaLibraryPermissionInformation, requestMediaLibraryPermission] =
    ImagePicker.useMediaLibraryPermissions();

  const verifyPermissions = async (
    permissionType: "camera" | "mediaLibrary"
  ) => {
    const permissionInformation =
      permissionType === "camera"
        ? cameraPermissionInformation
        : mediaLibraryPermissionInformation;
    const requestPermission =
      permissionType === "camera"
        ? requestCameraPermission
        : requestMediaLibraryPermission;

    if (permissionInformation?.status !== "granted") {
      const permissionResponse = await requestPermission();
      return permissionResponse.granted;
    }
    return true;
  };

  const handleImagePicker = async () => {
    const hasCameraPermission = await verifyPermissions("camera");
    const hasLibraryPermission = await verifyPermissions("mediaLibrary");

    if (!hasCameraPermission || !hasLibraryPermission) {
      Alert.alert(
        "Permission required",
        "Please grant camera and media library permissions to use this feature."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      const libraryResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!libraryResult.canceled) {
        const uri = libraryResult.assets[0].uri;
        setImage(uri);
        onImagePicked?.(uri);
        await uploadImage(uri);
      }
    } else {
      const uri = result.assets[0].uri;
      setImage(uri);
      onImagePicked?.(uri);
      await uploadImage(uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await PhotosService.uploadPhoto(uri);
      console.log("Image uploaded successfully:", response);
      onUploadSuccess?.(response);
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert(
        "Upload Error",
        "An error occurred while uploading the image."
      );
      onUploadError?.(error);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleImagePicker}>
        <SymbolView
          name="plus"
          weight="bold"
          style={styles.symbol}
          resizeMode="scaleAspectFit"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F1F6",
  },
  symbol: {
    width: 22,
    height: 22,
    color: "#007BFF",
  },
});
