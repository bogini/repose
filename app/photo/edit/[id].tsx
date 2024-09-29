import { Text, View, Pressable, StyleSheet } from "react-native";
import { photos } from "../../../data";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useState, useRef, useEffect } from "react";
import { CarouselSlider } from "./CarouselSlider";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
  GestureEvent,
  TapGestureHandlerEventPayload,
  RotationGestureHandler,
} from "react-native-gesture-handler";

interface Photo {
  id: number;
  url: string;
}

interface FaceControl {
  key: string;
  icon: string;
  label: string;
  values: {
    key: keyof FaceValues;
    label: string;
    min: number;
    max: number;
    gesture: "panX" | "panY" | "pinch" | "tapX" | "tapY" | "rotation";
  }[];
}

type FaceValues = {
  pitch: number;
  yaw: number;
  roll: number;
  blink: number;
  wink: number;
  pupilX: number;
  pupilY: number;
  smile: number;
};

const FACE_CONTROLS: FaceControl[] = [
  {
    key: "face",
    icon: "face.smiling",
    label: "FACE",
    values: [
      {
        key: "pitch",
        label: "Pitch",
        min: -20,
        max: 20,
        gesture: "panY",
      },
      {
        key: "yaw",
        label: "Yaw",
        min: -20,
        max: 20,
        gesture: "panX",
      },
      {
        key: "roll",
        label: "Roll",
        min: -20,
        max: 20,
        gesture: "rotation",
      },
    ],
  },
  {
    key: "eyes",
    icon: "eye.fill",
    label: "EYES",
    values: [
      {
        key: "blink",
        label: "Blink",
        min: -20,
        max: 5,
        gesture: "pinch",
      },
      {
        key: "wink",
        label: "Wink",
        min: 0,
        max: 25,
        gesture: "tapX",
      },
      {
        key: "pupilX",
        label: "Horizontal",
        min: -15,
        max: 15,
        gesture: "panX",
      },
      {
        key: "pupilY",
        label: "Vertical",
        min: -15,
        max: 15,
        gesture: "panY",
      },
    ],
  },
  {
    key: "mouth",
    icon: "mouth.fill",
    label: "MOUTH",
    values: [
      {
        key: "smile",
        label: "Smile",
        min: -0.3,
        max: 1.3,
        gesture: "tapY",
      },
    ],
  },
];

export default function EditScreen() {
  const [faceValues, setFaceValues] = useState<FaceValues>({
    pitch: -20,
    yaw: -20,
    roll: -20,
    blink: -20,
    wink: 0,
    pupilX: -15,
    pupilY: -15,
    smile: -0.3,
  });
  const [loading, setLoading] = useState(false);
  const [selectedControl, setSelectedControl] = useState(FACE_CONTROLS[0]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const photo = photos.find((p) => p.id === Number.parseInt(id));

  const handleFaceValuesChange = (values: FaceValues) => {
    setLoading(true);
    setTimeout(() => {
      setFaceValues(values);
      setLoading(false);
    }, 1000);
  };

  if (!photo) {
    return <Text>Photo not found</Text>;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <TopBar onBack={() => router.back()} />
      <AdjustBar />
      <Text>Brightness</Text>
      <ImageContainer
        photo={photo}
        loading={loading}
        faceValues={faceValues}
        handleFaceValuesChange={handleFaceValuesChange}
        selectedControl={selectedControl}
      />
      <FaceControlsComponent
        faceValues={faceValues}
        onFaceValuesChange={handleFaceValuesChange}
        selectedControl={selectedControl}
        setSelectedControl={setSelectedControl}
      />
    </View>
  );
}

interface TopBarProps {
  onBack: () => void;
}

const TopBar = ({ onBack }: TopBarProps) => (
  <View style={styles.topBar}>
    <Pressable style={styles.topBarButton} onPress={onBack}>
      <Text style={styles.topBarButtonText}>Cancel</Text>
    </Pressable>
    <Pressable style={styles.topBarButtonRed} onPress={onBack}>
      <Text style={styles.topBarButtonTextWhite}>Revert</Text>
    </Pressable>
  </View>
);

const AdjustBar = () => (
  <View style={styles.adjustBar}>
    <View style={styles.rowWithGap}>
      <SymbolView
        name="arrow.uturn.backward.circle"
        weight="regular"
        style={styles.adjustSymbol}
        resizeMode="scaleAspectFit"
      />
      <SymbolView
        name="arrow.uturn.forward.circle"
        weight="regular"
        style={styles.adjustSymbol}
        resizeMode="scaleAspectFit"
      />
    </View>
    <Text style={styles.adjustText}>ADJUST</Text>
    <View style={styles.rowWithGap}>
      <SymbolView
        name="pencil.tip.crop.circle"
        weight="medium"
        style={styles.adjustSymbolActive}
        resizeMode="scaleAspectFit"
      />
      <SymbolView
        name="ellipsis.circle"
        weight="medium"
        style={styles.adjustSymbolActive}
        resizeMode="scaleAspectFit"
      />
    </View>
  </View>
);

interface ImageContainerProps {
  photo: Photo;
  loading: boolean;
  faceValues: FaceValues;
  handleFaceValuesChange: (values: FaceValues) => void;
  selectedControl: FaceControl;
}

const ImageContainer = ({
  photo,
  loading,
  faceValues,
  handleFaceValuesChange,
  selectedControl,
}: ImageContainerProps) => {
  const pulseAnimation = useSharedValue(1);
  const [gestureValues, setGestureValues] = useState<FaceValues>(faceValues);

  useEffect(() => {
    pulseAnimation.value = loading
      ? withRepeat(withTiming(0.5, { duration: 750 }), -1, true)
      : withTiming(1, { duration: 250 });
  }, [loading, pulseAnimation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseAnimation.value,
    };
  });

  const handleGesture = (gesture: string, value: number) => {
    console.log(`Gesture: ${gesture}, Value: ${value}`);

    const control = selectedControl.values.find((v) => v.gesture === gesture);
    if (control) {
      const range = control.max - control.min;
      const normalizedValue = (value / 100) * range; // Normalize value based on control range
      console.log(
        `Control: ${control.key}, Normalized Value: ${normalizedValue}`
      );

      setGestureValues((prevValues) => {
        const newValue = Math.min(
          Math.max(prevValues[control.key] + normalizedValue, control.min),
          control.max
        );
        console.log(
          `Previous Value: ${prevValues[control.key]}, New Value: ${newValue}`
        );

        return {
          ...prevValues,
          [control.key]: newValue,
        };
      });
    }
  };

  const handlePanGesture = (event) => {
    const { translationX, translationY } = event.nativeEvent;
    handleGesture("panX", translationX); // Yaw
    handleGesture("panY", -translationY); // Pitch (inverted for up/down)
  };

  const handlePinchGesture = (event) => {
    const { scale } = event.nativeEvent;
    handleGesture("pinch", (scale - 1) * 100);
  };

  const handleRotationGesture = (event) => {
    const { rotation } = event.nativeEvent;
    handleGesture("rotation", (rotation / Math.PI) * 180); // Convert radians to degrees
  };

  const handleTapGesture = (
    event: GestureEvent<TapGestureHandlerEventPayload>
  ) => {
    const { x, y, absoluteX, absoluteY } = event.nativeEvent;
    const imageWidth = event.nativeEvent.target.width;
    const imageHeight = event.nativeEvent.target.height;

    console.log(`Tap gesture detected at (${x}, ${y}) relative to the image`);
    console.log(`Image dimensions: ${imageWidth}x${imageHeight}`);

    const tapXValue = x < imageWidth / 2 ? -10 : 10; // Left tap decreases, right tap increases
    handleGesture("tapX", tapXValue);

    const tapYValue = y < imageHeight / 2 ? -10 : 10; // Top tap decreases, bottom tap increases
    handleGesture("tapY", tapYValue);
  };

  useEffect(() => {
    handleFaceValuesChange(gestureValues);
  }, [gestureValues]);

  return (
    <GestureHandlerRootView style={styles.imageContainer}>
      <PanGestureHandler onGestureEvent={handlePanGesture}>
        <PinchGestureHandler onGestureEvent={handlePinchGesture}>
          <RotationGestureHandler onGestureEvent={handleRotationGesture}>
            <TapGestureHandler onGestureEvent={handleTapGesture}>
              <Animated.View style={[styles.fullSize, animatedStyle]}>
                <Animated.Image
                  source={{ uri: photo.url }}
                  style={styles.fullSize}
                  resizeMode="contain"
                />
              </Animated.View>
            </TapGestureHandler>
          </RotationGestureHandler>
        </PinchGestureHandler>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

interface FaceControlsComponentProps {
  faceValues: FaceValues;
  onFaceValuesChange: (values: FaceValues) => void;
  selectedControl: FaceControl;
  setSelectedControl: React.Dispatch<React.SetStateAction<FaceControl>>;
}

const FaceControlsComponent = ({
  faceValues,
  onFaceValuesChange,
  selectedControl,
  setSelectedControl,
}: FaceControlsComponentProps) => {
  const carouselRef = useRef<ICarouselInstance>(null);

  const scrollToIndex = (index: number) => {
    carouselRef.current?.scrollTo({
      index,
      animated: true,
    });
  };

  const handleValueChange = (key: keyof FaceValues, value: number) => {
    onFaceValuesChange({
      ...faceValues,
      [key]: value,
    });
  };

  return (
    <View style={styles.bottomPager}>
      <Text style={styles.selectedLabel}>{selectedControl.label}</Text>
      <Carousel
        ref={carouselRef}
        style={styles.carousel}
        width={100}
        height={30}
        data={FACE_CONTROLS}
        defaultIndex={0}
        loop={false}
        onSnapToItem={(index) => setSelectedControl(FACE_CONTROLS[index])} // Update state
        renderItem={({ item, animationValue, index }) => (
          <CarouselItemComponent
            animationValue={animationValue}
            icon={item.icon}
            onPress={() => scrollToIndex(index)}
          />
        )}
      />
      <View style={styles.slidersContainer}>
        {selectedControl.values.map((value) => (
          <View key={value.label} style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{value.label}</Text>
            <CarouselSlider
              key={value.label}
              min={value.min}
              max={value.max}
              value={faceValues[value.key]}
              onValueChange={(val) => handleValueChange(value.key, val)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

interface CarouselItemProps {
  animationValue: Animated.SharedValue<number>;
  icon: string;
  onPress: () => void;
}

const CarouselItemComponent = ({
  animationValue,
  icon,
  onPress,
}: CarouselItemProps) => {
  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  }, [animationValue]);

  return (
    <Pressable onPress={onPress} style={{ height: 32 }}>
      <Animated.View
        style={[
          { alignItems: "center", justifyContent: "center" },
          containerStyle,
        ]}
      >
        <SymbolView
          name={icon as any}
          weight="regular"
          style={styles.facePartIcon}
          resizeMode="scaleAspectFit"
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  slidersContainer: {
    flex: 1,
    gap: 10,
    flexDirection: "column",
    alignItems: "center",
  },
  sliderContainer: {
    flex: 1,
    gap: 4,
    flexDirection: "column",
    alignItems: "center",
  },
  sliderLabel: {
    color: "#8E8D93",
    fontWeight: "500",
    fontSize: 12,
  },
  sliderValue: {
    color: "#8E8D93",
  },
  adjustBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  adjustSymbol: {
    height: 24,
    width: 24,
    tintColor: "#46454A",
  },
  adjustSymbolActive: {
    height: 24,
    width: 24,
    tintColor: "#8E8D93",
  },
  facePartIcon: {
    height: 32,
    width: 32,
    tintColor: "#8E8D93",
  },
  adjustText: {
    color: "#8E8D93",
    fontWeight: "500",
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  imageContainer: {
    flex: 1,
  },
  topBarButton: {
    backgroundColor: "#8E8D93",
    borderRadius: 50,
    padding: 7,
    paddingHorizontal: 12,
  },
  topBarButtonRed: {
    backgroundColor: "red",
    borderRadius: 50,
    padding: 7,
    paddingHorizontal: 12,
  },
  topBarButtonTextWhite: {
    fontWeight: "700",
    color: "#FFF",
  },
  rowWithGap: {
    flexDirection: "row",
    gap: 15,
  },
  topBarButtonText: {
    fontWeight: "700",
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
    paddingTop: 15,
    width: "100%",
    zIndex: 1,
    paddingHorizontal: 40,
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
  carousel: {
    width: "100%",
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  fullSize: {
    width: "100%",
    height: "100%",
  },
  iconButton: {
    marginHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 25,
    padding: 10,
  },
  selectedLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "thin",
    textAlign: "center",
    margin: 10,
  },
  bottomPager: {
    flex: 1,
    marginTop: 20,
    marginBottom: 50,
  },
});
