import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Image,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from "react-native";
import { photos } from "../data";
import Carousel from "../Carousel";
import { useEffect, useState } from "react";
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

export default function App() {
  const { height, width } = useWindowDimensions();
  const [headerCarouselPage, setHeaderCarouselPage] = useState(0);

  const scale = useSharedValue(1.2);
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = 1.2;
    scale.value = withTiming(1, { duration: 6000 });
  }, [headerCarouselPage]);

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
    // if (e.contentOffset.y > 0 && scrollMode.value !== 'PAGE') {
    //   scrollMode.value = 'PAGE';
    // }
  });

  const onFlatListScroll = useAnimatedScrollHandler((e) => {
    if (e.contentOffset.y < 0 && scrollMode.value === "FLAT_LIST") {
      scrollMode.value = "GESTURE";
      scrollTo(flatListRef, 0, 0, true);
    }
  });

  const onHeaderCarouselScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const curPage = Math.max(
      0,
      Math.floor((e.nativeEvent.contentOffset.x + width / 2) / width)
    );
    if (curPage !== headerCarouselPage) {
      setHeaderCarouselPage(curPage);
    }
  };

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

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.ScrollView
        ref={pageScrollViewRef}
        scrollEnabled={pageScrollEnabled}
        style={[styles.container]}
        onScroll={onPageScroll}
      >
        {/* Header */}
        <Animated.View style={headerStyle}>
          <Animated.FlatList
            ref={flatListRef}
            style={{ width }}
            data={photos}
            numColumns={4}
            contentContainerStyle={{ gap: 1 }}
            columnWrapperStyle={{ gap: 1 }}
            scrollEnabled={flatListScrollEnabled}
            inverted
            onScroll={onFlatListScroll}
            renderItem={({ item }) => (
              <Link href={`/photo/${item.id}`} asChild>
                <Pressable style={{ width: "25%", aspectRatio: 1 }}>
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </Pressable>
              </Link>
            )}
          />
        </Animated.View>

        <Carousel title="People" photos={photos.slice(3, 6)} />
        <Carousel title="Featured" photos={photos.slice(6, 10)} />

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
});
