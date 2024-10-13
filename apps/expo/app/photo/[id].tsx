import { Text, View, Pressable, StyleSheet, Image } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import PhotosService, { Photo } from "../../api/photos";
import ReplicateService from "../../api/replicate";
import { ImageContainer } from "../../components/ImageContainer";

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [photo, setPhoto] = useState<Photo | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const onProgressTap = useCallback(async () => {
    if (photo) {
      setIsLoading(true);
      await ReplicateService.cacheExpressionEditorResults(photo.url);
      setIsLoading(false);
    }
  }, [photo]);

  const handleDeletePhoto = useCallback(async () => {
    if (photo) {
      setIsDeleting(true);
      try {
        await PhotosService.deletePhoto(photo);
        router.back();
      } catch (error) {
        console.error("Error deleting photo:", error);
        alert("Failed to delete photo. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  }, [photo, router]);

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const fetchedPhoto = await PhotosService.getPhotoById(id);
        if (fetchedPhoto) {
          setPhoto(fetchedPhoto);
        }
      } catch (error) {
        console.error("Error fetching photo:", error);
      }
    };

    fetchPhoto();
  }, [id]);

  if (!photo) {
    return <Text>Photo not found</Text>;
  }

  return (
    <View style={styles.container}>
      <TopBar
        router={router}
        isLoading={isLoading}
        onProgressTap={onProgressTap}
      />
      <View style={styles.imageContainer}>
        <ImageContainer imageUrl={photo.url} />
      </View>
      <BottomBar
        id={photo.id}
        isDeleting={isDeleting}
        onDeletePhoto={handleDeletePhoto}
      />
    </View>
  );
}

const TopBar = ({
  router,
  isLoading,
  onProgressTap,
}: {
  router: ReturnType<typeof useRouter>;
  isLoading: boolean;
  onProgressTap: () => void;
}) => (
  <View style={styles.topBar}>
    <View style={styles.photoInfo}>
      <Text style={styles.titleText}>Yesterday</Text>
      <Pressable onPress={onProgressTap}>
        <Text style={styles.subheadingText}>9:4{isLoading ? "0" : "1"} AM</Text>
      </Pressable>
    </View>
    <View style={styles.topButtons}>
      <Pressable style={styles.topButton}>
        <SymbolView
          name="ellipsis"
          weight="medium"
          style={styles.topSymbol}
          resizeMode="scaleAspectFit"
        />
      </Pressable>
      <Pressable style={styles.topButton} onPress={() => router.back()}>
        <SymbolView
          name="xmark"
          weight="medium"
          style={styles.topSymbol}
          resizeMode="scaleAspectFit"
        />
      </Pressable>
    </View>
  </View>
);

const BottomBar = ({
  id,
  isDeleting,
  onDeletePhoto,
}: {
  id: string;
  isDeleting: boolean;
  onDeletePhoto: () => void;
}) => (
  <View style={styles.bottomBar}>
    <Pressable style={styles.roundButton}>
      <SymbolView
        name="square.and.arrow.up"
        weight="light"
        style={styles.symbol}
        resizeMode="scaleAspectFit"
      />
    </Pressable>
    <View style={styles.bottomCenterButtons}>
      <Pressable style={styles.bottomCenterButton}>
        <SymbolView
          name="heart"
          weight="light"
          style={styles.symbol}
          resizeMode="scaleAspectFit"
        />
      </Pressable>
      <Pressable style={styles.bottomCenterButton}>
        <SymbolView
          name="info.circle"
          weight="light"
          style={styles.symbol}
          resizeMode="scaleAspectFit"
        />
      </Pressable>
      <Link href={`/photo/edit/${id}`} asChild>
        <Pressable style={styles.bottomCenterButton}>
          <SymbolView
            name="slider.horizontal.3"
            weight="light"
            style={styles.symbol}
            resizeMode="scaleAspectFit"
          />
        </Pressable>
      </Link>
    </View>
    <Pressable
      style={styles.roundButton}
      onPress={onDeletePhoto}
      disabled={isDeleting}
    >
      <SymbolView
        name="trash"
        weight="light"
        style={styles.symbol}
        resizeMode="scaleAspectFit"
      />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  imageContainer: {
    flex: 1,
    marginVertical: 100,
  },
  symbol: {
    height: 28,
    width: 28,
  },
  photoInfo: {
    flexDirection: "column",
    gap: 4,
  },
  topSymbol: {
    height: 15,
    width: 15,
  },
  topButton: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 50,
    padding: 6,
  },
  topButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 7,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 70,
    width: "100%",
    zIndex: 1,
    paddingHorizontal: 18,
  },
  titleText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 20,
  },
  subheadingText: {
    color: "rgba(0, 0, 0, 0.5)",
    fontWeight: "light",
    fontSize: 12,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 32,
  },
  roundButton: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 50,
    padding: 8,
  },
  bottomCenterButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 50,
    padding: 8,
  },
  bottomCenterButton: {
    width: 28,
    height: 28,
    marginHorizontal: 10,
  },
});
