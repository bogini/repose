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
  const [progress, setProgress] = useState<number>(0);

  const onProgressTap = useCallback(async () => {
    if (photo) {
      await ReplicateService.runExpressionEditorWithAllRotations(
        photo.url,
        setProgress
      );
    }
  }, [photo]);

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
        progress={progress}
        onProgressTap={onProgressTap}
      />
      <View style={styles.imageContainer}>
        <ImageContainer imageUrl={photo.url} />
      </View>
      <BottomBar id={photo.id} />
    </View>
  );
}

const TopBar = ({
  router,
  progress,
  onProgressTap,
}: {
  router: ReturnType<typeof useRouter>;
  progress: number;
  onProgressTap: () => void;
}) => (
  <View style={styles.topBar}>
    <View style={styles.photoInfo}>
      <Text style={styles.titleText}>Yesterday</Text>
      <Pressable onPress={onProgressTap}>
        <Text style={styles.subheadingText}>
          9:{40 + Math.round(progress * 10)} AM
        </Text>
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

const BottomBar = ({ id }: { id: string }) => (
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
    <Pressable style={styles.roundButton}>
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
