import { Text, View, Image, Pressable, StyleSheet } from "react-native";
import { photos } from "../../../../data/expo/data";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useState } from "react";
import { SymbolView } from "expo-symbols";

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const photo = photos.find((p) => p.id === Number.parseInt(id));

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gesture = Gesture.Pinch()
    .onChange((e) => {
      scale.value = e.scale;
    })
    .onEnd((e) => {
      if (e.velocity < 0) {
        runOnJS(router.back)();
      } else {
        scale.value = withTiming(1);
      }
    });

  if (!photo) {
    return <Text>Photo not found</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.photoInfo}>
          <Text style={styles.titleText}>Yesterday</Text>
          <Text style={styles.subheadingText}>9:41 AM</Text>
        </View>
        <View style={styles.topButtons}>
          <Pressable style={styles.topButton} onPress={() => router.back()}>
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
      <View style={styles.imageContainer}>
        <GestureDetector gesture={gesture}>
          <Animated.Image
            source={photo.image}
            style={[{ width: "100%", height: "100%" }, animatedStyle]}
            resizeMode="contain"
          />
        </GestureDetector>
      </View>
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
          <Pressable style={styles.bottomCenterButton}>
            <SymbolView
              name="slider.horizontal.3"
              weight="light"
              style={styles.symbol}
              resizeMode="scaleAspectFit"
            />
          </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  imageContainer: {
    flex: 1,
  },
  symbol: {
    height: 28,
    width: 28,
  },
  photoInfo: {
    flexDirection: "column",
    gap: 3,
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
  closeButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 5,
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
  iconButton: {
    marginHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 25,
    padding: 10,
  },
});
