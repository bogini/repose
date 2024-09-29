import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Image,
  useWindowDimensions,
  Pressable,
  View,
} from "react-native";
import Carousel from "../Carousel";
import { Link } from "expo-router";
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useState, useEffect } from "react";
import { ActivityIndicator } from "react-native";
import PhotosService, { Photo } from "../api/photos";
import UploadImageTile from "../components/UploadImageTile";

export default function App() {
  const { height, width } = useWindowDimensions();

  const pageScrollViewPosition = useSharedValue(0);
  const gestureScrollPosition = useSharedValue(height / 2);

  const flatListRef = useAnimatedRef<Animated.FlatList<any>>();
  const pageScrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const scrollMode = useSharedValue<"PAGE" | "GESTURE" | "FLAT_LIST">("PAGE");
  const pageScrollEnabled = useDerivedValue(
    () =>
      scrollMode.value === "PAGE" ||
      (scrollMode.value === "GESTURE" &&
        gestureScrollPosition.value <= height / 2)
  );
  const flatListScrollEnabled = useDerivedValue(
    () => scrollMode.value === "FLAT_LIST"
  );

  useAnimatedReaction(
    () => gestureScrollPosition.value,
    (current, previous) => {
      if (current === previous) {
        return;
      }

      if (current < height / 2 && scrollMode.value === "GESTURE") {
        scrollMode.value = "PAGE";
      }

      if (current === height && scrollMode.value === "GESTURE") {
        scrollMode.value = "FLAT_LIST";
      }
    }
  );

  const onPageScroll = useAnimatedScrollHandler((e) => {
    pageScrollViewPosition.value = e.contentOffset.y;
    if (e.contentOffset.y < 0 && scrollMode.value !== "GESTURE") {
      scrollMode.value = "GESTURE";
      scrollTo(pageScrollViewRef, 0, 0, true);
    }
  });

  const onFlatListScroll = useAnimatedScrollHandler((e) => {
    if (e.contentOffset.y < 0 && scrollMode.value === "FLAT_LIST") {
      scrollMode.value = "GESTURE";
      scrollTo(flatListRef, 0, 0, true);
    }
  });

  const gesture = Gesture.Pan()
    .onChange((e) => {
      if (scrollMode.value === "GESTURE") {
        gestureScrollPosition.value += e.changeY;
      }
    })
    .onEnd((e) => {
      if (scrollMode.value === "GESTURE") {
        gestureScrollPosition.value = withTiming(
          e.velocityY > 0 ? height : height / 2
        );
      }
    });

  const headerStyle = useAnimatedStyle(() => ({
    height: gestureScrollPosition.value,
  }));

  const nativeGesture = Gesture.Native();
  const composedGesture = Gesture.Simultaneous(gesture, nativeGesture);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const fetchedPhotos = await PhotosService.listPhotos();
        setPhotos(fetchedPhotos);
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.ScrollView
        ref={pageScrollViewRef}
        scrollEnabled={pageScrollEnabled}
        style={[styles.container]}
        onScroll={onPageScroll}
      >
        {isLoading ? (
          <ActivityIndicator size="large" style={styles.loadingIndicator} />
        ) : (
          <>
            <Animated.View style={headerStyle}>
              <Animated.FlatList
                ref={flatListRef}
                style={{ width }}
                data={[
                  ...(photos.length > 3 ? photos.slice(-3) : photos),
                  { id: "upload", downloadUrl: "" },
                  ...(photos.length > 3 ? photos.slice(0, -3) : []),
                ]}
                numColumns={4}
                contentContainerStyle={{ gap: 1 }}
                columnWrapperStyle={{ gap: 1 }}
                scrollEnabled={flatListScrollEnabled}
                inverted
                onScroll={onFlatListScroll}
                renderItem={({ item }) =>
                  item.id === "upload" ? (
                    <View style={{ width: "25%", aspectRatio: 1 }}>
                      <UploadImageTile
                        onUploadSuccess={(response) => {
                          setPhotos((prevPhotos) => [...prevPhotos, response]);
                        }}
                      />
                    </View>
                  ) : (
                    <Link href={`/photo/${item.id}`} asChild>
                      <Pressable style={{ width: "25%", aspectRatio: 1 }}>
                        <Image
                          source={{ uri: item.downloadUrl }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      </Pressable>
                    </Link>
                  )
                }
              />
            </Animated.View>
            {photos.length >= 10 && (
              <>
                <Carousel
                  title="People"
                  photos={photos.slice(3, 6).map((photo) => ({
                    id: photo.pathname,
                    url: photo.downloadUrl,
                  }))}
                />
                <Carousel
                  title="Featured"
                  photos={photos.slice(6, 10).map((photo) => ({
                    id: photo.pathname,
                    url: photo.downloadUrl,
                  }))}
                />
              </>
            )}
          </>
        )}

        <StatusBar style="auto" />
      </Animated.ScrollView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingIndicator: {
    marginTop: 20,
  },
});
